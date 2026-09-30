import test from 'node:test';
import assert from 'node:assert/strict';
import { addParisDays, attachBookingsToSlots, generatePlanningSlots, parisDateKey, parisLocalInstant, parisWeekKeys, shiftPlanningWeek } from '../components/planningSlots.ts';
import type { Booking } from '../types';

const start = new Date('2026-09-28T07:00:00Z');
const end = new Date('2026-09-28T08:00:00Z');
const booking = (id: string, coachId = 'coach-a', extra: Partial<Booking> = {}): Booking => ({
  id, clubId: 'local-test', coachId, memberId: 1, type: 'coaching', status: 'confirmed',
  startTime: start.toISOString(), endTime: end.toISOString(), ...extra,
});

test('shows one card for a generic availability and its confirmed booking', () => {
  const slots = attachBookingsToSlots([{ start, end }], [booking('first')]);
  assert.equal(slots.length, 1);
  assert.deepEqual(slots[0].bookings.map(b => b.id), ['first']);
});

test('keeps simultaneous coaches separate and assigns each booking exactly once', () => {
  const availability = [{ start, end }, { start, end, coachId: 'coach-a' }, { start, end, coachId: 'coach-b' }];
  const bookings = [booking('a'), booking('b', 'coach-b')];
  const slots = attachBookingsToSlots(availability, bookings);
  assert.deepEqual(slots.map(s => s.bookings.map(b => b.id)), [[], ['a'], ['b']]);
  const filtered = attachBookingsToSlots(availability, bookings, 'coach-b');
  assert.deepEqual(filtered.flatMap(s => s.bookings.map(b => b.id)), ['b']);
  assert.equal(filtered.some(s => s.coachId === 'coach-a'), false);
});

test('retains bookings after availability changes without mixing durations or session types', () => {
  const slots = attachBookingsToSlots([{ start, end, sessionTypeId: 'group' }], [
    booking('individual'),
    booking('short', 'coach-a', { endTime: '2026-09-28T07:30:00Z' }),
    booking('cancelled', 'coach-a', { status: 'cancelled' }),
  ]);
  assert.equal(slots.length, 3);
  assert.deepEqual(slots.flatMap(s => s.bookings.map(b => b.id)), ['individual', 'short']);
});

test('keeps group participants on the same card and filters generic slots by coach', () => {
  const bookings = [booking('a1'), booking('a2', 'coach-a', { memberId: 2 }), booking('b', 'coach-b')];
  const slots = attachBookingsToSlots([{ start, end }], bookings, 'coach-a');
  assert.equal(slots.length, 1);
  assert.deepEqual(slots[0].bookings.map(b => b.id), ['a1', 'a2']);
});

test('week navigation moves the selected calendar day across month/year boundaries without mutating it', () => {
  const selected = new Date(2026, 11, 28, 12);
  const next = shiftPlanningWeek(selected, 1);
  assert.equal(next.getFullYear(), 2027);
  assert.equal(next.getMonth(), 0);
  assert.equal(next.getDate(), 4);
  assert.equal(next.getDay(), selected.getDay());
  assert.equal(shiftPlanningWeek(next, -1).getTime(), selected.getTime());
  assert.equal(selected.getDate(), 28);
});

test('Paris week and slot dates stay stable for a viewer in another timezone', () => {
  assert.equal(parisDateKey(new Date('2026-09-27T22:30:00Z')), '2026-09-28');
  assert.deepEqual(parisWeekKeys('2026-12-31'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  assert.equal(addParisDays('2026-12-31', 1), '2027-01-01');
  const slots = generatePlanningSlots('2026-09-28', [{ day: 1, slots: [{ start: '09:00', end: '11:00' }] }], [], 60);
  assert.deepEqual(slots.map(slot => slot.start.toISOString()), ['2026-09-28T07:00:00.000Z', '2026-09-28T08:00:00.000Z']);
});

test('rejects missing spring hour and does not stretch a booking across DST', () => {
  assert.equal(parisLocalInstant('2026-03-29', '02:30'), null);
  const spring = generatePlanningSlots('2026-03-29', [{ day: 0, slots: [{ start: '01:00', end: '04:00' }] }], [], 60);
  assert.deepEqual(spring.map(slot => slot.start.toISOString()), ['2026-03-29T01:00:00.000Z']);
  assert.equal(parisLocalInstant('2026-10-25', '02:30')?.toISOString(), '2026-10-25T00:30:00.000Z');
  const autumn = generatePlanningSlots('2026-10-25', [{ day: 0, slots: [{ start: '01:00', end: '04:00' }] }], [], 60);
  assert.ok(autumn.every(slot => slot.end.getTime() - slot.start.getTime() === 3600000));
});
