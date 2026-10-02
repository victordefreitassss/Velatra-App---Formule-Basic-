import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import type { Booking, Prospect, User } from '../types';
import { attendance, normalizeSource, lastShowedCoach, salesJoins, trialSignals, type SalesInput } from '../sales/salesModel';
import { salesOverview } from '../sales/salesEngine';
import { withSalesActions } from '../sales/salesPulse';
import { derivePulse } from '../pulse/pulseEngine';
const now = new Date('2026-10-01T12:00:00Z'), clubId = 'sales-unit';
const coach = (uid = 'coach', id = 2) => ({ firebaseUid: uid, id, name: uid, clubId, role: 'coach' } as User);
const prospect = (id = 1, patch: Partial<Prospect> = {}) => ({ firebaseUid: `p-${id}`, id, clubId, name: `P ${id}`, email: '', phone: '', answers: {}, status: 'lead', source: 'Instagram', date: '2026-09-20T10:00:00Z', ...patch } as Prospect);
const booking = (id = 'b', patch: Partial<Booking> = {}) => ({ id, clubId, type: 'trial', status: 'confirmed', prospectId: 1, prospectUid: 'p-1', coachId: '2', coachUid: 'coach', startTime: '2026-09-25T10:00:00Z', endTime: '2026-09-25T11:00:00Z', ...patch } as Booking);
const input = (patch: Partial<SalesInput> = {}): SalesInput => ({ clubId, studio: true, prospects: [prospect()], bookings: [], coaches: [coach()], events: [], ...patch });
const overview = (facts: SalesInput) => salesOverview(facts, '2026-09-01', '2026-09-30', now);
const pulseInput = (facts: SalesInput, role = 'owner') => ({ user: { id: role === 'coach' ? 2 : 10, firebaseUid: role === 'coach' ? 'coach' : 'owner', role, clubId }, currentClub: { id: clubId, isActive: true, ownerId: 'owner', accountType: 'studio' }, prospects: facts.prospects, bookings: facts.bookings, users: facts.coaches, programs: [], logs: [], tasks: [], messages: [], subscriptions: [], payments: [] } as any);
for (const count of [0, 1, 100, 500]) test(`cohort ${count}: distinct leads and exact denominators in bounded time`, () => {
  const prospects = Array.from({ length: count }, (_, i) => prospect(i + 1, { convertedMemberUid: `member-${i}`, convertedAt: '2026-10-01T10:00:00Z' }));
  const bookings = prospects.flatMap(p => [booking(`a-${p.id}`, { prospectUid: p.firebaseUid, prospectId: p.id, attendanceStatus: 'NO_SHOW' as any }), booking(`b-${p.id}`, { prospectUid: p.firebaseUid, prospectId: p.id, attendanceStatus: 'SHOWED_UP' as any, startTime: '2026-09-29T10:00:00Z' })]);
  const events = prospects.map(p => ({ clubId, prospectUid: p.firebaseUid!, eventType: 'CONTACTED' as const, at: '2026-09-21T10:00:00Z' }));
  const start = performance.now(), result = overview(input({ prospects, bookings, events }));
  assert.deepEqual(result.funnel, { leads: count, contacted: count, booked: count, showed: count, converted: count, lost: 0 });
  assert.equal(result.attendance.noShowRate.denominator, count * 2); assert.equal(result.attendance.noShowRate.numerator, count);
  assert.equal(result.rates.showedConverted.denominator, count); assert.equal(result.rates.showedConverted.percent, count ? 100 : 0);
  assert.ok(performance.now() - start < 2000); assert.equal(result.coaches.reduce((n, c) => n + c.conversions, 0), count);
});
test('multiple trials keep one prospect and conversion, but two appointment outcomes', () => {
  const result = overview(input({ prospects: [prospect(1, { status: 'won', convertedMemberUid: 'member', convertedAt: '2026-09-30T12:00:00Z' })], bookings: [booking('first', { attendanceStatus: 'NO_SHOW' as any }), booking('second', { attendanceStatus: 'SHOWED_UP' as any, startTime: '2026-09-29T10:00:00Z' })] }));
  assert.equal(result.funnel.leads, 1); assert.equal(result.funnel.converted, 1); assert.equal(result.funnel.showed, 1); assert.equal(result.attendance.noShow, 1); assert.equal(result.attendance.showed, 1);
});
for (const status of ['confirmed', 'completed'] as const) test(`historical ${status} without explicit attendance stays unknown`, () => {
  const result = overview(input({ bookings: [booking('old', { status })] }));
  assert.equal(result.funnel.booked, 1); assert.equal(result.funnel.showed, 0); assert.equal(result.attendance.noShow, 0); assert.equal(result.attendance.unknown, 1); assert.equal(result.attendance.noShowRate.denominator, 0);
});
test('cancelled and future pending trials do not enter finalized attendance denominator', () => {
  const result = overview(input({ bookings: [booking('cancel', { status: 'cancelled', attendanceStatus: 'NO_SHOW' as any }), booking('future', { startTime: '2026-10-05T10:00:00Z' })] }));
  assert.equal(result.attendance.cancelled, 1); assert.equal(result.attendance.noShow, 0); assert.equal(result.attendance.unknown, 0); assert.equal(result.attendance.noShowRate.denominator, 0);
});
test('won text does not prove conversion; labels do not prove contact', () => {
  const result = overview(input({ prospects: [prospect(1, { status: 'won', activityHistory: [{ id: 'a', label: 'Étape : Contacté', date: now.toISOString() }] })] }));
  assert.equal(result.funnel.converted, 0); assert.equal(result.funnel.contacted, 0);
});
test('loss is separate and needs a real loss date', () => {
  const result = overview(input({ prospects: [prospect(1, { status: 'lost' }), prospect(2, { status: 'lost', lostAt: '2026-09-28T10:00:00Z' })] }));
  assert.equal(result.funnel.lost, 1); assert.equal(result.funnel.leads, 2);
});
test('direct conversion is not a showed conversion numerator', () => {
  const result = overview(input({ prospects: [prospect(1, { convertedMemberUid: 'direct', convertedAt: '2026-09-29T10:00:00Z' }), prospect(2)], bookings: [booking('second', { prospectId: 2, prospectUid: 'p-2', attendanceStatus: 'SHOWED_UP' as any })] }));
  assert.equal(result.rates.showedConverted.denominator, 1); assert.equal(result.rates.showedConverted.numerator, 0); assert.equal(result.rates.leadConverted.numerator, 1);
});
test('sources normalize case, accents and whitespace without mutating stored values', () => {
  const prospects = ['Instagram', 'instagram', ' INSTAGRAM ', ' Événement personnalisé '].map((source, i) => prospect(i + 1, { source }));
  const before = JSON.stringify(prospects), result = overview(input({ prospects }));
  assert.equal(result.sources.find(s => s.source === 'instagram')?.leads, 3); assert.equal(normalizeSource(prospects[3].source), 'evenement personnalise'); assert.equal(JSON.stringify(prospects), before);
});
test('Paris cohort is inclusive across UTC boundaries and DST, later outcomes remain observable', () => {
  const result = salesOverview(input({ prospects: [prospect(1, { date: '2026-09-30T22:00:00Z', convertedMemberUid: 'm', convertedAt: '2026-10-02T10:00:00Z' }), prospect(2, { date: '2026-10-01T21:59:59Z' }), prospect(3, { date: '2026-10-01T22:00:00Z' })] }), '2026-10-01', '2026-10-01', new Date('2026-10-03T10:00:00Z'));
  assert.equal(result.funnel.leads, 2); assert.equal(result.funnel.converted, 1);
  assert.equal(salesOverview(input({ prospects: [prospect(1, { date: '2026-10-24T22:00:00Z' })] }), '2026-10-25', '2026-10-25', new Date('2026-10-26T12:00:00Z')).funnel.leads, 1);
});
test('foreign sources, events and bookings cannot enter the tenant cohort', () => {
  const result = overview(input({ prospects: [prospect(), prospect(2, { clubId: 'other' })], bookings: [booking('foreign', { clubId: 'other', attendanceStatus: 'SHOWED_UP' as any })], events: [{ clubId: 'other', prospectUid: 'p-1', eventType: 'CONTACTED', at: now.toISOString() }] }));
  assert.equal(result.funnel.leads, 1); assert.equal(result.funnel.contacted, 0); assert.equal(result.funnel.booked, 0);
});
test('legacy numeric prospect joins require uniqueness and explicit UID never downgrades', () => {
  const facts = input({ prospects: [prospect(), prospect(1, { firebaseUid: 'other-same-number' })], bookings: [booking('numeric', { prospectUid: undefined }), booking('wrong', { prospectUid: 'absent' })] });
  const result = overview(facts); assert.equal(result.funnel.booked, 0); assert.equal(result.dataQuality.unlinkedTrials, 2);
  assert.equal(overview(input({ bookings: [booking('legacy', { prospectUid: undefined })] })).funnel.booked, 1);
});
for (const scenario of ['missing', 'ambiguous', 'afterConversion', 'markedAfterConversion'] as const) test(`coach attribution ${scenario} is unassigned`, () => {
  const coaches = scenario === 'missing' ? [] : scenario === 'ambiguous' ? [coach(), coach('second', 2)] : [coach()];
  const trial = booking('last', { coachUid: scenario === 'ambiguous' ? undefined : 'coach', attendanceStatus: 'SHOWED_UP' as any,
    ...(scenario === 'afterConversion' ? { startTime: '2026-10-01T10:00:00Z' } : {}), ...(scenario === 'markedAfterConversion' ? { attendanceMarkedAt: '2026-10-01T10:00:00Z' } : {}) });
  assert.equal(lastShowedCoach([trial], '2026-09-30T10:00:00Z', salesJoins(input({ coaches })).coach), null);
});
test('last showed before conversion wins, tied appointments are unassigned', () => {
  const trials = [booking('first', { attendanceStatus: 'SHOWED_UP' as any }), booking('second', { coachUid: 'second', coachId: '3', attendanceStatus: 'SHOWED_UP' as any, startTime: '2026-09-29T10:00:00Z' })];
  const joins = salesJoins(input({ coaches: [coach(), coach('second', 3)] }));
  assert.equal(lastShowedCoach(trials, '2026-09-30T10:00:00Z', joins.coach), 'second'); assert.equal(lastShowedCoach([...trials, { ...trials[1], id: 'tie' }], '2026-09-30T10:00:00Z', joins.coach), null);
});
test('conversion source snapshot keeps attribution when attendance is corrected later', () => {
  const result = overview(input({ prospects: [prospect(1, { convertedMemberUid: 'm', convertedAt: '2026-09-30T10:00:00Z' })], events: [{ clubId, prospectUid: 'p-1', at: '2026-09-30T10:00:00Z', eventType: 'CONVERTED', coachUid: 'coach' }], bookings: [booking('corrected', { attendanceStatus: 'NO_SHOW' as any })] }));
  assert.equal(result.coaches.find(c => c.coachUid === 'coach')?.conversions, 1);
});
test('Solo hides team analytics; partial and unknown dates are visible', () => {
  const result = overview(input({ studio: false, prospects: [prospect(1, { date: 'invalid' })], partialSources: ['prospects'] }));
  assert.deepEqual(result.coaches, []); assert.equal(result.partial, true); assert.equal(result.dataQuality.invalidLeadDates, 1);
});
for (const role of ['owner', 'manager', 'coach']) test(`Pulse ${role}: missing attendance disappears on explicit marking`, () => {
  const facts = input({ bookings: [booking()] }), source = pulseInput(facts, role);
  const actions = withSalesActions([], source, now); assert.equal(actions.filter(a => a.type === 'TRIAL_ATTENDANCE_MISSING').length, 1);
  source.bookings[0] = booking('b', { attendanceStatus: 'SHOWED_UP' as any }); assert.equal(withSalesActions([], source, now).length, 0);
});
for (const patch of [{ nextReminderDate: '2026-10-02T10:00:00Z' }, { nextReminderDate: '2026-09-30T10:00:00Z' }, { status: 'lost' }, { convertedMemberUid: 'member' }] as Partial<Prospect>[]) test(`no-show followup suppressed by ${JSON.stringify(patch)}`, () => {
  const facts = input({ prospects: [prospect(1, patch)], bookings: [booking('no', { attendanceStatus: 'NO_SHOW' as any })] }); assert.equal(trialSignals(facts, now).noShowFollowups.length, 0);
});
test('no-show followup requires latest trial, no future trial, and complete booking source', () => {
  const facts = input({ bookings: [booking('no', { attendanceStatus: 'NO_SHOW' as any })] });
  assert.equal(trialSignals(facts, now).noShowFollowups.length, 1);
  assert.equal(trialSignals({ ...facts, bookings: [...facts.bookings, booking('new', { startTime: '2026-10-02T10:00:00Z' })] }, now).noShowFollowups.length, 0);
  assert.equal(trialSignals({ ...facts, partialSources: ['bookings'] }, now).noShowFollowups.length, 0);
  assert.equal(trialSignals({ ...facts, bookings: [...facts.bookings, booking('new', { startTime: '2026-09-29T10:00:00Z', attendanceStatus: 'SHOWED_UP' as any })] }, now).noShowFollowups.length, 0);
});
test('Coach gets own trial signal only, Member and Superadmin get none', () => {
  const facts = input({ bookings: [booking('own'), booking('other', { coachUid: 'second', coachId: '3' })] });
  assert.deepEqual(withSalesActions([], pulseInput(facts, 'coach'), now).map(a => a.bookingId), ['own']);
  for (const role of ['member', 'superadmin']) assert.equal(withSalesActions([], pulseInput(facts, role), now).length, 0);
});
test('no-show signal is deduplicated with due reminder; shown does not trigger immediate relance', () => {
  const facts = input({ prospects: [prospect(1, { nextReminderDate: '2026-10-01T10:00:00Z' })], bookings: [booking('no', { attendanceStatus: 'NO_SHOW' as any })] }); const source = pulseInput(facts);
  const actions = withSalesActions(derivePulse(source, [], now), source, now);
  assert.equal(actions.filter(a => a.type.startsWith('PROSPECT_REMINDER')).length, 1); assert.equal(actions.filter(a => a.type === 'TRIAL_NO_SHOW_FOLLOWUP').length, 0);
  assert.equal(withSalesActions([], pulseInput(input({ bookings: [booking('show', { attendanceStatus: 'SHOWED_UP' as any })] })), now).length, 0);
});
test('Pulse legacy Coach numeric identity must resolve uniquely from canonical roster', () => {
  const facts = input({ coaches: [coach(), coach('collision', 2)], bookings: [booking('legacy', { coachUid: undefined })] });
  assert.equal(withSalesActions([], pulseInput(facts, 'coach'), now).length, 0);
  const unique = input({ bookings: [booking('legacy', { coachUid: undefined })] }); assert.equal(withSalesActions([], pulseInput(unique, 'coach'), now).length, 1);
});
test('late presence correction without conversion snapshot cannot reattribute a historical conversion', () => {
  const b = booking('correction', { attendanceStatus: 'SHOWED_UP' as any, attendanceMarkedAt: '2026-09-25T12:00:00Z', attendanceUpdatedAt: '2026-10-01T10:00:00Z' });
  assert.equal(lastShowedCoach([b], '2026-09-30T10:00:00Z', salesJoins(input()).coach), null);
});
test('partial sources never claim unique historical numeric identities', () => {
  const joins = salesJoins(input({ partialSources: ['prospects', 'users'] }));
  assert.equal(joins.prospect(booking('legacy', { prospectUid: undefined })), null); assert.equal(joins.coach(booking('legacy', { coachUid: undefined })), null);
  assert.equal(joins.prospect(booking())?.firebaseUid, 'p-1'); assert.equal(joins.coach(booking())?.firebaseUid, 'coach');
});
