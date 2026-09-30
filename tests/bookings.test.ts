import { before, beforeEach, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { reserveBooking, cancelBooking, rescheduleBooking, createTrialBooking, bookingAvailability } from '../server/bookings';

const app = initializeApp({ projectId: 'demo-velatra' });
const db = getFirestore(app);
const start = new Date(); start.setUTCDate(start.getUTCDate() + 2); start.setUTCHours(10, 0, 0, 0);
const input = { coachId: 'booking-coach', startTime: start.toISOString(), endTime: new Date(start.getTime() + 3600000).toISOString() };
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run with Firebase emulators');
  await db.doc('clubs/876543').set({ ownerId: 'booking-owner', accountType: 'studio', settings: { booking: { enabled: true, sessionDuration: 60, schedule: Array.from({ length: 7 }, (_, day) => ({ day, slots: [{ start: '00:00', end: '23:00' }] })) } } });
  await db.doc('users/booking-owner').set({ id: 9000, role: 'owner', clubId: '876543' });
  await db.doc('users/booking-coach').set({ id: 9001, role: 'coach', clubId: '876543', assignedMemberIds: [9010, 9011] });
  for (let i = 0; i < 2; i++) await db.doc(`users/booking-member-${i}`).set({ id: 9010 + i, role: 'member', clubId: '876543', credits: 1, assignedCoachUid: 'booking-coach' });
  await db.doc('users/booking-outsider').set({ id: 9002, role: 'owner', clubId: '999999' });
});
beforeEach(async () => {
  await db.doc('clubs/876543').update({ 'settings.booking.enabled': true, 'settings.booking.sessionTypes': [],
    'settings.booking.minAdvanceBookingHours': 0, 'settings.booking.minCancellationHours': 0, 'settings.booking.maxBookingsPerWeek': 0,
    'settings.booking.schedule': Array.from({ length: 7 }, (_, day) => ({ day, slots: [{ start: '00:00', end: '23:00' }] })) });
});
after(() => deleteApp(app));

it('reserves the last place once under concurrency and refunds once under retries', async () => {
  const outcomes = await Promise.allSettled([0, 1].map(i => reserveBooking(db, `booking-member-${i}`, input)));
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  const winner = outcomes.findIndex(result => result.status === 'fulfilled');
  const result = (outcomes[winner] as PromiseFulfilledResult<any>).value;
  assert.equal((await db.doc(`users/booking-member-${winner}`).get()).data()?.credits, 0);
  const retry = await reserveBooking(db, `booking-member-${winner}`, input);
  assert.equal(retry.id, result.id);
  assert.equal((await db.doc(`users/booking-member-${winner}`).get()).data()?.credits, 0);
  await assert.rejects(cancelBooking(db, 'booking-outsider', result.id), { status: 403 });
  const cancelled = await cancelBooking(db, `booking-member-${winner}`, result.id);
  assert.equal(cancelled.refunded, true);
  assert.equal((await cancelBooking(db, `booking-member-${winner}`, result.id)).refunded, false);
  assert.equal((await db.doc(`users/booking-member-${winner}`).get()).data()?.credits, 1);
});

it('rejects disabled planning, malformed dates, and a coach outside the club', async () => {
  await assert.rejects(reserveBooking(db, 'booking-member-0', { ...input, startTime: 'bad' }), { status: 400 });
  await assert.rejects(reserveBooking(db, 'booking-member-0', { ...input, coachId: 'booking-outsider' }), { status: 400 });
  await db.doc('clubs/876543').update({ 'settings.booking.enabled': false });
  await assert.rejects(reserveBooking(db, 'booking-member-0', input), { status: 409 });
});

const futureInput = (days: number, hour = 10, extra: Record<string, unknown> = {}) => {
  const date = new Date(); date.setUTCDate(date.getUTCDate() + days); date.setUTCHours(hour, 0, 0, 0);
  return { coachId: 'booking-coach', startTime: date.toISOString(), endTime: new Date(date.getTime() + 3600000).toISOString(), ...extra };
};

it('serializes the same member across two coaches and denies an unassigned coach', async () => {
  await db.doc('users/booking-coach-b').set({ id: 9003, role: 'coach', clubId: '876543' });
  await db.doc('users/booking-member-cross').set({ id: 9020, role: 'member', clubId: '876543', credits: 2, assignedCoachUid: 'booking-coach' });
  const slot = futureInput(3);
  await assert.rejects(reserveBooking(db, 'booking-coach-b', { ...slot, memberId: 9020, coachId: 'booking-coach-b' }), { status: 403 });
  const outcomes = await Promise.allSettled([
    reserveBooking(db, 'booking-owner', { ...slot, memberId: 9020 }),
    reserveBooking(db, 'booking-owner', { ...slot, memberId: 9020, coachId: 'booking-coach-b' }),
  ]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await db.doc('users/booking-member-cross').get()).data()?.credits, 2, 'staff booking keeps historical no-debit policy');
});

it('limits group capacity and refuses a different overlapping session type', async () => {
  await db.doc('clubs/876543').update({ 'settings.booking.sessionTypes': [
    { id: 'group', name: 'Groupe', duration: 60, maxParticipants: 2 },
    { id: 'private', name: 'Privé', duration: 60, maxParticipants: 1 },
  ], 'settings.booking.schedule': Array.from({ length: 7 }, (_, day) => ({ day, slots: [
    { start: '00:00', end: '23:00', sessionTypeId: 'group' }, { start: '00:00', end: '23:00', sessionTypeId: 'private' }
  ] })) });
  for (let index = 0; index < 3; index++) await db.doc(`users/booking-group-${index}`).set({ id: 9030 + index, role: 'member', clubId: '876543', assignedCoachUid: 'booking-coach', sessionCredits: { group: 1, private: 1 } });
  const slot = futureInput(4, 10, { sessionTypeId: 'group' });
  const first = await reserveBooking(db, 'booking-group-0', slot);
  const race = await Promise.allSettled([reserveBooking(db, 'booking-group-1', slot), reserveBooking(db, 'booking-group-2', slot)]);
  assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
  const winner = race.findIndex(result => result.status === 'fulfilled');
  const second = (race[winner] as PromiseFulfilledResult<{ id: string }>).value;
  assert.notEqual(first.id, second.id);
  const loserUid = `booking-group-${winner === 0 ? 2 : 1}`;
  await assert.rejects(reserveBooking(db, loserUid, slot), { status: 409 });
  await assert.rejects(reserveBooking(db, loserUid, { ...slot, sessionTypeId: 'private' }), { status: 409 });
  await assert.rejects(reserveBooking(db, loserUid, { ...slot, sessionTypeId: 'unknown' }), { status: 400 });
  const availability = await bookingAvailability(db, 'booking-group-2', slot.startTime.slice(0, 10));
  assert.equal(availability.slots.find(item => item.sessionTypeId === 'group')?.count, 2);
});

it('moves a booking atomically without changing credits or its stable ID', async () => {
  await db.doc('users/booking-move').set({ id: 9040, role: 'member', clubId: '876543', credits: 1, assignedCoachUid: 'booking-coach' });
  const original = futureInput(5), target = futureInput(6);
  const booked = await reserveBooking(db, 'booking-move', original);
  assert.equal((await db.doc('users/booking-move').get()).data()?.credits, 0);
  await assert.rejects(rescheduleBooking(db, 'booking-move', { id: booked.id, ...target }), { status: 403 });
  const moved = await rescheduleBooking(db, 'booking-coach', { id: booked.id, ...target });
  assert.equal(moved.id, booked.id);
  assert.equal((await db.doc(`bookings/${booked.id}`).get()).data()?.startTime, target.startTime);
  assert.equal((await db.doc('users/booking-move').get()).data()?.credits, 0);
  assert.equal((await rescheduleBooking(db, 'booking-coach', { id: booked.id, ...target })).unchanged, true);
  await assert.rejects(rescheduleBooking(db, 'booking-coach', { id: booked.id, ...futureInput(6, 10, { sessionTypeId: 'different' }) }), { status: 400 });
  assert.equal((await cancelBooking(db, 'booking-move', booked.id)).refunded, true);
  assert.equal((await db.doc('users/booking-move').get()).data()?.credits, 1);
});

it('keeps the original booking if the requested destination is occupied', async () => {
  await db.doc('users/booking-move-blocked').set({ id: 9050, role: 'member', clubId: '876543', credits: 1, assignedCoachUid: 'booking-coach' });
  await db.doc('users/booking-blocker').set({ id: 9051, role: 'member', clubId: '876543', credits: 1, assignedCoachUid: 'booking-coach' });
  const original = futureInput(7), target = futureInput(8);
  const first = await reserveBooking(db, 'booking-move-blocked', original);
  await reserveBooking(db, 'booking-blocker', target);
  await assert.rejects(rescheduleBooking(db, 'booking-coach', { id: first.id, ...target }), { status: 409 });
  assert.equal((await db.doc(`bookings/${first.id}`).get()).data()?.startTime, original.startTime);
  assert.equal((await db.doc('users/booking-move-blocked').get()).data()?.credits, 0);
});

it('creates a CRM trial through the server once and prevents coach overlap', async () => {
  await db.doc('prospects/booking-prospect').set({ id: 9060, clubId: '876543', status: 'lead' });
  const slot = futureInput(9);
  const first = await createTrialBooking(db, 'booking-coach', { prospectUid: 'booking-prospect', startTime: slot.startTime, endTime: slot.endTime });
  assert.equal((await db.doc('prospects/booking-prospect').get()).data()?.status, 'trial');
  assert.equal((await createTrialBooking(db, 'booking-coach', { prospectUid: 'booking-prospect', startTime: slot.startTime, endTime: slot.endTime })).id, first.id);
  await assert.rejects(reserveBooking(db, 'booking-owner', { ...slot, memberId: 9010 }), { status: 409 });
  await assert.rejects(createTrialBooking(db, 'booking-outsider', { prospectUid: 'booking-prospect', startTime: slot.startTime, endTime: slot.endTime }), { status: 403 });
});

it('validates coach, member, availability, duration, credits and policy boundaries', async () => {
  const slot = futureInput(10);
  await db.doc('users/booking-limits').set({ id: 9070, role: 'member', clubId: '876543', credits: 1, assignedCoachUid: 'booking-coach' });
  await assert.rejects(reserveBooking(db, 'booking-owner', { ...slot, memberId: 999999 }), { status: 404 });
  await assert.rejects(reserveBooking(db, 'booking-owner', { ...slot, memberId: 9070, coachId: 'missing' }), { status: 400 });
  await assert.rejects(reserveBooking(db, 'booking-limits', { ...slot, endTime: new Date(new Date(slot.endTime).getTime() + 60000).toISOString() }), { status: 400 });
  await assert.rejects(reserveBooking(db, 'booking-limits', { ...slot, startTime: '2020-01-01T10:00:00.000Z' }), { status: 400 });
  await db.doc('clubs/876543').update({ 'settings.booking.schedule': [] });
  await assert.rejects(reserveBooking(db, 'booking-limits', slot), { status: 400 });
  await db.doc('clubs/876543').update({ 'settings.booking.schedule': Array.from({ length: 7 }, (_, day) => ({ day, slots: [{ start: '00:00', end: '23:00' }] })), 'settings.booking.minAdvanceBookingHours': 300 });
  await assert.rejects(reserveBooking(db, 'booking-limits', slot), { status: 409 });
  await db.doc('clubs/876543').update({ 'settings.booking.minAdvanceBookingHours': 0, 'settings.booking.maxBookingsPerWeek': 1 });
  const first = await reserveBooking(db, 'booking-limits', slot);
  assert.equal((await db.doc('users/booking-limits').get()).data()?.credits, 0);
  await assert.rejects(reserveBooking(db, 'booking-limits', futureInput(10, 12)), { status: 409 });
  await db.doc('clubs/876543').update({ 'settings.booking.minCancellationHours': 500 });
  await assert.rejects(cancelBooking(db, 'booking-limits', first.id), { status: 409 });
  assert.equal((await cancelBooking(db, 'booking-owner', first.id)).refunded, true);
  assert.equal((await db.doc('users/booking-limits').get()).data()?.credits, 1);
});

it('supports Solo owner as implicit referent and denies unassigned Studio member', async () => {
  await db.doc('clubs/booking-solo').set({ ownerId: 'booking-solo-owner', accountType: 'solo', settings: { booking: { enabled: true, sessionDuration: 60, schedule: Array.from({ length: 7 }, (_, day) => ({ day, slots: [{ start: '00:00', end: '23:00' }] })) } } });
  await db.doc('users/booking-solo-owner').set({ id: 9080, role: 'owner', clubId: 'booking-solo' });
  await db.doc('users/booking-solo-member').set({ id: 9081, role: 'member', clubId: 'booking-solo', credits: 1 });
  const slot = futureInput(11, 10, { coachId: 'booking-solo-owner' });
  const result = await reserveBooking(db, 'booking-solo-member', slot);
  assert.equal((await db.doc(`bookings/${result.id}`).get()).data()?.coachId, '9080');
  await db.doc('users/booking-unassigned').set({ id: 9082, role: 'member', clubId: '876543', credits: 1 });
  await assert.rejects(reserveBooking(db, 'booking-unassigned', futureInput(12)), { status: 403 });
});

it('uses the current assignment when a coach cancels or moves a booking', async () => {
  await db.doc('users/booking-coach-b').set({ id: 9003, role: 'coach', clubId: '876543' });
  await db.doc('users/booking-reassigned').set({ id: 9090, role: 'member', clubId: '876543', assignedCoachUid: 'booking-coach', credits: 1 });
  const source = futureInput(13), target = futureInput(14);
  const booking = await reserveBooking(db, 'booking-reassigned', source);
  await db.doc('users/booking-reassigned').update({ assignedCoachUid: 'booking-coach-b' });
  await assert.rejects(cancelBooking(db, 'booking-coach', booking.id), { status: 403 });
  await assert.rejects(rescheduleBooking(db, 'booking-coach', { id: booking.id, ...target }), { status: 403 });
  assert.equal((await cancelBooking(db, 'booking-owner', booking.id)).refunded, true);
});
