import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppState, Booking, Club, Payment, Program, Subscription, Task, User } from '../types';
import { resolvePresentationStrategy, resolveExperienceCapabilities } from '../productExperience';
import { canLoadLiveCollection } from '../productCapabilities';
import { getAllContextItems, getMobileMoreGroups, getPrimaryHubsForRole } from '../components/appShellHelpers';
import { selectHomeData, selectHomeFinance, selectHomeMembers, selectOperationalTasks, selectHomeBookings, selectCurrentProgram } from '../components/experienceHomeSelectors';
import { createClient360LocationState, createMessageLocationState, createPlanningBookingLocationState, createTaskLocationState, getClient360Section, getConversationMemberId, getPlanningBookingId, getTaskId, resolveClient360Member, shouldFocusClientNote } from '../components/dashboardNavigation';
const now = new Date('2026-10-01T12:00:00Z');
const club = { id: 'studio', accountType: 'studio', isActive: true, canAddStaff: true } as Club;
const actor = { id: 10, role: 'coach', firebaseUid: 'coach-a', clubId: club.id, assignedMemberIds: [2] } as User;
const member = (id = 1, assignedCoachUid = 'coach-a') => ({ id, role: 'member', firebaseUid: `member-${id}`, clubId: club.id, name: `Client ${id}`, assignedCoachUid } as User);
const fixture = (patch: Partial<AppState> = {}) => ({ user: actor, currentClub: club, users: [member(), member(2, 'coach-b'), { ...member(3), clubId: 'other' }], programs: [], logs: [], tasks: [], bookings: [], prospects: [], messages: [], subscriptions: [], payments: [], ...patch } as AppState);
const task = (patch: Partial<Task> = {}) => ({ id: 'task-1', clubId: club.id, title: 'Bilan à préparer', dueDate: '2026-10-01', assignedTo: '10', status: 'todo', relatedMemberId: 1, ...patch } as Task);
const booking = (patch: Partial<Booking> = {}) => ({ id: 'booking-1', clubId: club.id, coachId: 'coach-a', memberId: 1, status: 'confirmed', startTime: '2026-10-01T13:00:00Z', endTime: '2026-10-01T14:00:00Z', type: 'coaching', ...patch } as Booking);
const program = (patch: Partial<Program> = {}) => ({ id: 1, clubId: club.id, memberId: 1, startDate: '2026-09-25', durationWeeks: 4, days: [], ...patch } as Program);

test('Coach portfolio ignores cached IDs, foreign tenants, reassignment and a missing actor UID', () => {
  assert.deepEqual(selectHomeMembers(fixture()).map(item => item.id), [1]);
  assert.deepEqual(selectHomeMembers(fixture({ users: [member(1, 'coach-b')] })), []);
  assert.deepEqual(selectHomeMembers(fixture({ user: { ...actor, firebaseUid: undefined } })), []);
  assert.deepEqual(selectHomeMembers(fixture({ user: { ...actor, isSuspended: true } })), []);
  assert.deepEqual(selectHomeMembers(fixture({ currentClub: { ...club, isActive: false } })), []);
});
for (const role of ['SOLO_OWNER', 'STUDIO_OWNER', 'STUDIO_MANAGER', 'STUDIO_COACH'] as const) {
  const staff = { ...actor, role: role === 'STUDIO_COACH' ? 'coach' : role === 'STUDIO_MANAGER' ? 'manager' : 'owner' } as User;
  const tenant = { ...club, accountType: role === 'SOLO_OWNER' ? 'solo' : 'studio' } as Club;
  for (const count of [0, 1, 100]) test(`${role} handles ${count} real clients and empty collections`, () => {
    const state = fixture({ user: staff, currentClub: tenant, users: Array.from({ length: count }, (_, i) => member(i + 1)) });
    const data = selectHomeData(state, [], now);
    assert.equal(data.members.length, count);
    assert.equal(data.clientFacts.length, count);
    assert.equal(data.prospects.length, 0);
    assert.equal(data.todayBookings.length, 0);
    assert.equal(data.tasks.length, 0);
    assert.equal(data.clientFacts.some(item => item.inactiveDays !== null), false);
    assert.equal(data.actions.filter(item => item.type === 'program').length, count);
  });
  test(`${role} uses distinct field/preparation composition without changing capabilities`, () => {
    const before = resolveExperienceCapabilities(tenant, staff);
    assert.notDeepEqual(resolvePresentationStrategy(role, 'phone').sections, resolvePresentationStrategy(role, 'desktop').sections);
    assert.deepEqual(resolveExperienceCapabilities(tenant, staff), before);
    assert.equal(resolvePresentationStrategy(role, 'largeDesktop').density, 'expanded');
  });
}
test('Manager unknown entitlement and unsupported tenant fail closed for selectors', () => {
  const manager = { ...actor, role: 'manager' } as User;
  assert.deepEqual(selectHomeMembers(fixture({ user: manager, currentClub: { ...club, saasPlanId: 'unknown' } })), []);
  assert.deepEqual(selectHomeMembers(fixture({ user: manager, currentClub: { ...club, accountType: 'solo' } })), []);
});
test('Coach agenda and tasks are assigned, tenant scoped, open and chronologically sorted', () => {
  const state = fixture({ tasks: [task(), task({ id: 'foreign', clubId: 'other' }), task({ id: 'other-coach', assignedTo: '11' }), task({ id: 'old-assignment', relatedMemberId: 2 }), task({ id: 'crm', relatedProspectId: 22 }), task({ id: 'done', status: 'done' })], bookings: [booking(), booking({ id: 'foreign', clubId: 'other' }), booking({ id: 'other-coach', coachId: 'coach-b' }), booking({ id: 'old-assignment', memberId: 2 }), booking({ id: 'cancelled', status: 'cancelled' }), booking({ id: 'past', startTime: '2026-10-01T09:00:00Z', endTime: '2026-10-01T10:00:00Z' })] });
  assert.deepEqual(selectOperationalTasks(state).map(item => item.id), ['task-1']);
  assert.equal(selectOperationalTasks(state, true).length, 2);
  assert.deepEqual(selectHomeBookings(state, now).map(item => item.id), ['booking-1']);
});
test('Current programme excludes expired, future and planned sessions', () => {
  assert.equal(selectCurrentProgram([program({ startDate: '2025-01-01' }), program({ startDate: '2026-11-01' }), program({ isPlannedSession: true })], 1, now), null);
  const active = program();
  assert.equal(selectCurrentProgram([active, program({ memberId: 2 })], 1, now), active);
});
test('Actions use real inactivity, latest sessions, scoped check-ins, due tasks and messages', () => {
  const state = fixture({ users: [{ ...member(), lastWorkoutDate: '2026-09-01' }, { ...member(2), lastWorkoutDate: '2026-09-20' }, member(4)], programs: [program()], logs: [{ id: 1, clubId: club.id, memberId: 1, date: '2026-09-30' }, { id: 2, clubId: club.id, memberId: 2, date: '2026-09-21' }] as AppState['logs'], tasks: [task(), task({ id: 'tomorrow', dueDate: '2026-10-02' })], messages: [{ id: 1, clubId: club.id, from: 1, to: 10, read: false }, { id: 2, clubId: club.id, from: 99, to: 10, read: false }, { id: 3, clubId: 'other', from: 1, to: 10, read: false }] as AppState['messages'] });
  const data = selectHomeData(state, [{ memberUid: 'member-1', memberName: 'ignored', templateName: 'Bilan', dueDate: '2026-09-30', status: 'late' }, { memberUid: 'other', memberName: 'foreign', templateName: 'Bilan', dueDate: '2026-09-30', status: 'late' }], now);
  assert.equal(data.clientFacts[0].inactiveDays, null);
  assert.equal(data.clientFacts[1].inactiveDays, 10);
  assert.equal(data.clientFacts[2].inactiveDays, null);
  assert.equal(data.followups.length, 1);
  assert.equal(data.unreadMessages.length, 1);
  assert.deepEqual(data.actions.filter(item => item.type === 'task').map(item => item.id), ['task:task-1']);
  assert.equal(data.actions.some(item => /risque/i.test(item.label)), false);
  assert.equal(data.actions.some(item => item.memberId === 99), false);
});
test('Manager supervision counts authoritative assignments and actual CRM reminders without counting empty UIDs', () => {
  const state = fixture({ user: { ...actor, role: 'manager' }, users: [member(), member(2, ''), actor, { ...actor, id: 12, firebaseUid: undefined }], tasks: [task()], prospects: [{ id: 1, clubId: club.id, status: 'call_pending', name: 'À rappeler' }, { id: 2, clubId: club.id, status: 'won', name: 'Gagné', nextReminderDate: '2026-09-01' }, { id: 3, clubId: 'other', status: 'call_pending' }] as AppState['prospects'] });
  const data = selectHomeData(state, [], now);
  assert.equal(data.team[0].assignedClients, 1);
  assert.equal(data.team[1].assignedClients, 0);
  assert.equal(data.clientFacts.filter(item => item.unassigned).length, 1);
  assert.equal(data.prospectsToFollowUp.length, 1);
  assert.equal(selectHomeData({ ...state, user: actor }, [], now).prospects.length, 0);
});
test('Owner metrics reuse Billing V2, refunds, yearly normalization and EUR/tenant/date filters', () => {
  const subscriptions = [{ clubId: club.id, status: 'active', price: 120, billingCycle: 'monthly' }, { clubId: club.id, status: 'active', price: 1200, billingCycle: 'yearly' }, { clubId: club.id, status: 'active', price: 10000, billingCycle: 'monthly', currency: 'usd' }, { clubId: 'other', status: 'active', price: 10000, billingCycle: 'monthly' }] as Subscription[];
  const payment = (patch: Partial<Payment> = {}) => ({ clubId: club.id, status: 'paid', amount: 100, date: '2026-10-01T09:00:00Z', ...patch } as Payment);
  const state = fixture({ user: { ...actor, role: 'owner' }, subscriptions, payments: [payment(), payment({ status: 'partially_refunded', refundedAmount: 30 }), payment({ status: 'refunded' }), payment({ status: 'failed' }), payment({ currency: 'usd' }), payment({ clubId: 'other' }), payment({ date: '2026-10-02' })] });
  const metrics = selectHomeFinance(state, now)!;
  assert.equal(metrics.mrr, 220); assert.equal(metrics.arpu, 110);
  assert.equal(metrics.revenue, 170); assert.equal(metrics.weekRevenue, 170); assert.equal(metrics.yearRevenue, 170);
});
for (const role of ['manager', 'coach'] as const) test(`${role} never accesses financial arrays and never subscribes to finance`, () => {
  const state = fixture({ user: { ...actor, role } });
  for (const key of ['subscriptions', 'payments']) Object.defineProperty(state, key, { get() { throw Error(`Sensitive access: ${key}`); } });
  assert.equal(selectHomeFinance(state, now), null);
  assert.doesNotThrow(() => selectHomeData(state, [], now));
  for (const collection of ['plans', 'subscriptions', 'payments', 'invoices', 'expenses', 'fixedCosts', 'manualStats']) assert.equal(canLoadLiveCollection(collection, club, state.user!), false, collection);
  assert.equal(canLoadLiveCollection('payments', club, { ...actor, role: 'owner' }), true);
});
test('Phone has five destinations and every authorized secondary page stays reachable', () => {
  for (const [role, accountType] of [['owner', 'solo'], ['owner', 'studio'], ['manager', 'studio'], ['coach', 'studio']] as const) {
    const context = { role, club: { ...club, accountType }, format: 'phone' as const };
    const hubs = getPrimaryHubsForRole(context);
    assert.equal(hubs.length, 5);
    const reachable = new Set([...hubs.map(item => item.page), ...getMobileMoreGroups(context).flatMap(group => group.items.map(item => item.id))]);
    for (const item of getAllContextItems(context)) assert.ok(reachable.has(item.id), `${role}: ${item.id}`);
    if (role === 'coach') assert.equal(hubs.some(item => item.id === 'business'), false);
  }
});
test('Direct action history validates route, IDs, sections and authoritative client assignment', () => {
  const note = createClient360LocationState(1, 'followup', true);
  assert.equal(getClient360Section(note), 'followup'); assert.equal(shouldFocusClientNote(note), true);
  assert.equal(resolveClient360Member([member()], club.id, note, actor)?.id, 1);
  assert.equal(resolveClient360Member([member(1, 'coach-b')], club.id, note, actor), null);
  assert.equal(getConversationMemberId(createMessageLocationState(1)), 1);
  assert.equal(getPlanningBookingId(createPlanningBookingLocationState('booking-1')), 'booking-1');
  assert.equal(getTaskId(createTaskLocationState('task-1')), 'task-1');
  for (const value of [null, undefined, {}, { velatraPage: 'home', taskId: 'task-1' }, { velatraPage: 'crm_tasks', taskId: '../task' }]) assert.equal(getTaskId(value), null);
  assert.equal(getConversationMemberId({ velatraPage: 'chat', conversationMemberId: -1 }), null);
  assert.equal(getClient360Section({ velatraPage: 'users', client360Section: 'billing' }), undefined);
});
