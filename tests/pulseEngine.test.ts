import test from 'node:test';
import assert from 'node:assert/strict';
import type { Club, User, Program } from '../types';
import { derivePulse, applyPulseStates, pulseCategories } from '../pulse/pulseEngine';
import { snoozeUntil, type PulseActionState, type PulseInput, type PulseType, type SnoozePreset } from '../pulse/pulseModel';
const now = new Date('2026-10-01T12:00:00Z');
const club = { id: 'pulse-studio', accountType: 'studio', ownerId: 'owner', isActive: true } as Club;
const actor = { id: 10, clubId: club.id, role: 'owner', firebaseUid: 'owner' } as User;
const member = (id = 1, patch: Partial<User> = {}) => ({ id, clubId: club.id, role: 'member', firebaseUid: `m-${id}`, assignedCoachUid: 'coach', name: `Client ${id}`, status: 'active', createdAt: '2026-09-30', ...patch } as User);
const fixture = (patch: Partial<PulseInput> = {}): PulseInput => ({ user: actor, currentClub: club, users: [member()], programs: [], logs: [], tasks: [], bookings: [], messages: [], prospects: [], subscriptions: [], payments: [], ...patch });
const program = (patch: Partial<Program> = {}) => ({ id: 1, clubId: club.id, memberId: 1, startDate: '2026-09-10T12:00:00Z', durationWeeks: 4, days: [{ name: 'A', exercises: [{ exerciseId: 1 }] }], ...patch } as unknown as Program);
const followup = (dueDate: string) => ({ id: 'assignment', memberUid: 'm-1', templateName: 'Bilan', dueDate });
const samples: Record<PulseType, Partial<PulseInput>> = {
  CLIENT_INACTIVE: { users: [member(1, { lastWorkoutDate: '2026-09-22T12:00:00Z' })] },
  PROGRAM_MISSING: {}, PROGRAM_ENDING: { programs: [program()] }, FOLLOWUP_DUE: {}, FOLLOWUP_LATE: {},
  MESSAGE_UNREAD: { messages: [{ id: 1, clubId: club.id, from: 1, to: 10, read: false, date: now.toISOString() }] as any },
  TASK_OVERDUE: { tasks: [{ id: 'overdue', clubId: club.id, title: 'Hier', status: 'todo', assignedTo: '10', dueDate: '2026-09-30' }] as any },
  TASK_TODAY: { tasks: [{ id: 'today', clubId: club.id, title: 'Aujourd’hui', status: 'todo', assignedTo: '10', dueDate: '2026-10-01' }] as any },
  TASK_UPCOMING: { tasks: [{ id: 'future', clubId: club.id, title: 'Demain', status: 'todo', assignedTo: '10', dueDate: '2026-10-02' }] as any },
  PROSPECT_REMINDER_OVERDUE: { prospects: [{ id: 2, firebaseUid: 'p', clubId: club.id, name: 'P', status: 'call_pending', nextReminderDate: '2026-09-30' }] as any },
  PROSPECT_REMINDER_TODAY: { prospects: [{ id: 2, firebaseUid: 'p', clubId: club.id, name: 'P', status: 'lead', nextReminderDate: '2026-10-01' }] as any },
  TRIAL_UPCOMING: { bookings: [{ id: 'trial', clubId: club.id, coachId: 'coach', memberId: 1, status: 'confirmed', type: 'trial', startTime: '2026-10-01T18:00:00Z', endTime: '2026-10-01T19:00:00Z' }] as any },
  CLIENT_UNASSIGNED: { users: [member(1, { assignedCoachUid: undefined })] },
  PAYMENT_ATTENTION: { subscriptions: [{ id: 'past', clubId: club.id, memberId: 1, status: 'past_due', price: 10 }] as any },
  SUBSCRIPTION_ENDING: { subscriptions: [{ id: 'ending', clubId: club.id, memberId: 1, status: 'active', price: 10, endDate: '2026-10-07T12:00:00Z' }] as any },
};
for (const [type, patch] of Object.entries(samples)) test(`Pulse derives ${type} from real facts`, () => {
  const actions = derivePulse(fixture(patch), type === 'FOLLOWUP_DUE' ? [followup('2026-10-01')] : type === 'FOLLOWUP_LATE' ? [followup('2026-09-29')] : [], now);
  const action = actions.find(item => item.type === type);
  assert.ok(action); assert.match(action.sourceFingerprint, /^[a-f0-9]{64}$/); assert.ok(action.reason); assert.ok(action.quickActions.length);
  if (type === 'CLIENT_INACTIVE') assert.equal(action.reason, '9 jours sans séance');
  if (type === 'FOLLOWUP_LATE') assert.match(action.reason, /2 jour/);
});
test('Pulse has deterministic priority, group, instant/date and key ordering', () => {
  const input = fixture({ tasks: [samples.TASK_TODAY.tasks![0], samples.TASK_OVERDUE.tasks![0]], subscriptions: samples.PAYMENT_ATTENTION.subscriptions });
  const actions = derivePulse(input, [followup('2026-09-20')], now);
  assert.deepEqual(actions.slice(0, 3).map(item => item.priority), ['urgent', 'urgent', 'urgent']);
  assert.equal(actions[0].type, 'FOLLOWUP_LATE');
  assert.deepEqual(derivePulse({ ...input, tasks: [...input.tasks].reverse() }, [followup('2026-09-20')], now), actions);
});
test('Deduplication covers duplicate followup/task and matching failed payment/subscription', () => {
  const input = fixture({ tasks: [samples.TASK_TODAY.tasks![0], samples.TASK_TODAY.tasks![0]], subscriptions: samples.PAYMENT_ATTENTION.subscriptions, payments: [{ id: 'failed', clubId: club.id, memberId: 1, subscriptionId: 'past', status: 'failed' }] as any });
  const actions = derivePulse(input, [followup('2026-09-29'), followup('2026-09-29')], now);
  assert.equal(actions.filter(item => item.type === 'FOLLOWUP_LATE').length, 1);
  assert.equal(actions.filter(item => item.type === 'TASK_TODAY').length, 1);
  assert.equal(actions.filter(item => item.type === 'PAYMENT_ATTENTION').length, 1);
});
const saved = (key: string, sourceFingerprint: string, status: PulseActionState['status'] = 'handled'): PulseActionState => ({ key, sourceFingerprint, actorUid: 'owner', clubId: club.id, status, createdAt: now.toISOString(), updatedAt: now.toISOString() });
test('Handled belongs to actor + tenant + fingerprint and never mutates facts', () => {
  const input = fixture(samples.CLIENT_INACTIVE), copy = structuredClone(input), actions = derivePulse(input, [], now);
  const action = actions.find(item => item.type === 'CLIENT_INACTIVE')!;
  assert.equal(applyPulseStates(actions, [saved(action.key, action.sourceFingerprint)], 'owner', club.id, now).find(item => item.key === action.key)?.state, 'handled');
  assert.equal(applyPulseStates(actions, [saved(action.key, action.sourceFingerprint)], 'coach', club.id, now).find(item => item.key === action.key)?.state, 'open');
  assert.equal(applyPulseStates(actions, [saved(action.key, action.sourceFingerprint)], 'owner', 'other', now).find(item => item.key === action.key)?.state, 'open');
  assert.deepEqual(input, copy);
});
test('A resumed client/new unread message/new task due date/next followup occurrence reopens', () => {
  const original = derivePulse(fixture(samples.CLIENT_INACTIVE), [followup('2026-09-29')], now);
  const states = original.map(item => saved(item.key, item.sourceFingerprint));
  const next = derivePulse(fixture({ users: [member(1, { lastWorkoutDate: '2026-10-02' })] }), [followup('2026-10-06')], new Date('2026-10-12T12:00:00Z'));
  assert.equal(applyPulseStates(next, states, 'owner', club.id, new Date('2026-10-12')).find(item => item.type === 'CLIENT_INACTIVE')?.state, 'open');
  for (const source of ['tasks', 'messages'] as const) {
    const first = derivePulse(fixture(source === 'tasks' ? samples.TASK_TODAY : samples.MESSAGE_UNREAD), [], now);
    const action = first.find(item => item.category === source)!;
    const changed = source === 'tasks' ? fixture({ tasks: [{ ...samples.TASK_TODAY.tasks![0], dueDate: '2026-10-02' }] }) : fixture({ messages: [...samples.MESSAGE_UNREAD.messages!, { ...samples.MESSAGE_UNREAD.messages![0], id: 2 }] });
    assert.equal(applyPulseStates(derivePulse(changed, [], now), [saved(action.key, action.sourceFingerprint)], 'owner', club.id, now).find(item => item.category === source)?.state, 'open');
  }
  assert.equal(applyPulseStates(next, states, 'owner', club.id, now).find(item => item.type === 'FOLLOWUP_LATE')?.state, 'open');
});
for (const preset of ['laterToday', 'tomorrow', 'threeDays', 'sevenDays'] as SnoozePreset[]) test(`Snooze ${preset} disappears before and returns at expiry`, () => {
  const action = derivePulse(fixture(), [], now)[0], until = snoozeUntil(now, preset)!;
  assert.ok(Date.parse(until) > now.getTime());
  const state = { ...saved(action.key, action.sourceFingerprint, 'snoozed'), snoozedUntil: until };
  assert.equal(applyPulseStates([action], [state], 'owner', club.id, new Date(Date.parse(until) - 1))[0].state, 'snoozed');
  assert.equal(applyPulseStates([action], [state], 'owner', club.id, new Date(until))[0].state, 'open');
});
test('Snooze follows Paris DST and handles end of day without past reminder', () => {
  assert.equal(snoozeUntil(new Date('2026-10-24T12:00:00Z'), 'tomorrow'), '2026-10-25T08:00:00.000Z');
  assert.equal(snoozeUntil(new Date('2026-10-01T21:59:59.999Z'), 'laterToday'), null);
});
for (const role of ['owner', 'manager', 'coach', 'member', 'superadmin'] as const) test(`Role ${role} follows tenant/portfolio/business/CRM policy`, () => {
  const input = fixture({ user: { ...actor, role, firebaseUid: role === 'coach' ? 'coach' : role }, users: [member(), member(2, { assignedCoachUid: 'other' }), member(3, { assignedCoachUid: undefined }), member(4, { clubId: 'other' })], subscriptions: samples.PAYMENT_ATTENTION.subscriptions, prospects: samples.PROSPECT_REMINDER_TODAY.prospects });
  if (role !== 'owner') Object.defineProperty(input, 'payments', { get() { throw Error('Forbidden financial read'); } });
  const actions = derivePulse(input, [followup('2026-09-20')], now);
  if (role === 'member' || role === 'superadmin') { assert.deepEqual(actions, []); assert.deepEqual(pulseCategories(input), []); return; }
  assert.ok(actions.every(item => item.memberId !== 4));
  if (role === 'coach') { assert.ok(actions.every(item => !item.memberId || item.memberId === 1)); assert.ok(actions.every(item => !['crm', 'business'].includes(item.category))); assert.ok(!actions.some(item => item.type === 'CLIENT_UNASSIGNED')); }
  if (role === 'manager') { assert.ok(actions.some(item => item.type === 'CLIENT_UNASSIGNED')); assert.ok(!actions.some(item => item.category === 'business')); }
});
test('Solo Owner mixes sales/coaching/followup/business without unassigned Studio actions', () => {
  const actions = derivePulse(fixture({ currentClub: { ...club, accountType: 'solo' }, prospects: samples.PROSPECT_REMINDER_TODAY.prospects, subscriptions: samples.PAYMENT_ATTENTION.subscriptions, users: [member(1, { assignedCoachUid: undefined })] }), [followup('2026-09-29')], now);
  for (const category of ['crm', 'coaching', 'followup', 'business']) assert.ok(actions.some(item => item.category === category));
  assert.ok(!actions.some(item => item.type === 'CLIENT_UNASSIGNED'));
});
test('Cross-club, suspended, unsupported and unknown Manager plan fail closed', () => {
  for (const input of [fixture({ currentClub: { ...club, id: 'other' } }), fixture({ user: { ...actor, isSuspended: true } }), fixture({ currentClub: { ...club, isActive: false } }), fixture({ user: { ...actor, role: 'manager' }, currentClub: { ...club, saasPlanId: 'unknown' as any } })]) assert.deepEqual(derivePulse(input, [], now), []);
});
test('Auto-resolution follows usable program/read message/done task/assigned coach/rescheduled prospect', () => {
  const before = fixture({ users: [member(1, { assignedCoachUid: undefined })], tasks: samples.TASK_TODAY.tasks, messages: samples.MESSAGE_UNREAD.messages, prospects: samples.PROSPECT_REMINDER_TODAY.prospects });
  const after = fixture({ users: [member()], programs: [program({ startDate: '2026-09-30' })], tasks: [{ ...before.tasks[0], status: 'done' }], messages: [{ ...before.messages[0], read: true }], prospects: [{ ...before.prospects[0], nextReminderDate: '2026-10-02' }] });
  assert.equal(derivePulse(before, [], now).length, 5); assert.equal(derivePulse(after, [], now).length, 0);
});
test('No fabricated deadlines/no-show/reminder/inactivity or legacy task duplicates', () => {
  const input = fixture({ programs: [program({ durationWeeks: undefined as any })], users: [member(1, { lastWorkoutDate: '2026-09-24T12:00:00Z' })], prospects: [{ ...samples.PROSPECT_REMINDER_TODAY.prospects![0], status: 'won' }, { ...samples.PROSPECT_REMINDER_TODAY.prospects![0], firebaseUid: 'missing', nextReminderDate: undefined }] as any, tasks: [{ ...samples.TASK_TODAY.tasks![0], id: 'auto_club_1_2026' }, { ...samples.TASK_TODAY.tasks![0], id: 'bday_1_2026' }], bookings: [{ ...samples.TRIAL_UPCOMING.bookings![0], status: 'cancelled' }] });
  assert.deepEqual(derivePulse(input, [], now), []);
  assert.ok(derivePulse(fixture({ users: [member(1, { createdAt: '2026-09-20' })] }), [], now).some(item => item.type === 'CLIENT_INACTIVE'));
});
for (const count of [0, 1, 50, 100, 500]) test(`Pulse supports ${count} clients deterministically with one in-memory aggregation`, () => {
  const input = fixture({ users: Array.from({ length: count }, (_, i) => member(i + 1)) });
  const actions = derivePulse(input, [], now); assert.equal(actions.length, count); assert.equal(new Set(actions.map(item => item.key)).size, count);
  assert.deepEqual(derivePulse({ ...input, users: [...input.users].reverse() }, [], now), actions);
});
test('Document revisions reopen repeated unassignment/task/unread/payment/request occurrences', () => {
  const cases: Array<[Partial<PulseInput>, PulseType, string]> = [[samples.CLIENT_UNASSIGNED, 'CLIENT_UNASSIGNED', 'users/m-1'], [samples.TASK_TODAY, 'TASK_TODAY', 'tasks/today'], [samples.MESSAGE_UNREAD, 'MESSAGE_UNREAD', 'messages/1'], [samples.PAYMENT_ATTENTION, 'PAYMENT_ATTENTION', 'subscriptions/past'], [{ users: [member(1, { planRequested: true })] }, 'PROGRAM_MISSING', 'users/m-1']];
  for (const [patch, type, path] of cases) {
    const first = derivePulse(fixture({ ...patch, sourceVersions: { [path]: '1' } }), [], now).find(item => item.type === type)!;
    const second = derivePulse(fixture({ ...patch, sourceVersions: { [path]: '2' } }), [], now).find(item => item.type === type)!;
    assert.equal(applyPulseStates([second], [saved(first.key, first.sourceFingerprint)], 'owner', club.id, now)[0].state, 'open');
  }
});
