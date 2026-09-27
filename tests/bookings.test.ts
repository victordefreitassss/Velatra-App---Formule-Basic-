import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { reserveBooking, cancelBooking } from '../server/bookings';

const app = initializeApp({ projectId: 'demo-velatra' });
const db = getFirestore(app);
const start = new Date(); start.setUTCDate(start.getUTCDate() + 2); start.setUTCHours(10, 0, 0, 0);
const input = { coachId: 'booking-coach', startTime: start.toISOString(), endTime: new Date(start.getTime() + 3600000).toISOString() };
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run with Firebase emulators');
  await db.doc('clubs/876543').set({ settings: { booking: { enabled: true, sessionDuration: 60, schedule: Array.from({ length: 7 }, (_, day) => ({ day, slots: [{ start: '00:00', end: '23:00' }] })) } } });
  await db.doc('users/booking-coach').set({ id: 9001, role: 'coach', clubId: '876543', assignedMemberIds: [9010, 9011] });
  for (let i = 0; i < 2; i++) await db.doc(`users/booking-member-${i}`).set({ id: 9010 + i, role: 'member', clubId: '876543', credits: 1, assignedCoachUid: 'booking-coach' });
  await db.doc('users/booking-outsider').set({ id: 9002, role: 'owner', clubId: '999999' });
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
