import type { AppState, Booking, Page, Program, Task, User } from '../types';
import { getProductCapabilities } from '../productCapabilities.ts';
import { resolveExperienceCapabilities, resolveProductExperience } from '../productExperience.ts';
import { billingMetrics, matchesPeriod } from './billingMetrics.ts';
import { parisDateKey } from './planningSlots.ts';

export interface FollowupPriority { memberUid: string; memberName: string; templateName: string; dueDate: string; status: 'late' | 'expected'; }
export interface HomeDestination {
  page: Page;
  memberId?: number;
  section?: 'onboarding' | 'retention' | 'coaching' | 'followup' | 'communication' | 'administrative';
  adminSection?: 'billing';
  focusNote?: boolean;
  focusCoachAssignment?: boolean;
  bookingId?: string;
  taskId?: string;
  prospectUid?: string;
}
export interface HomeAction {
  id: string;
  type: 'session' | 'task' | 'message' | 'prospect' | 'program' | 'checkIn' | 'inactive' | 'unassigned' | 'billing';
  label: string;
  priority: 0 | 1 | 2;
  memberId?: number;
  prospectId?: number;
  dueDate?: string;
  destination: HomeDestination;
}
const DAY = 86_400_000;
const time = (value: string | undefined) => value ? new Date(value).getTime() : NaN;
const validStaff = (state: Pick<AppState, 'user' | 'currentClub'>) => !!state.user &&
  state.user.clubId === state.currentClub?.id && state.user.isSuspended !== true && state.currentClub?.isActive !== false &&
  (state.user.role !== 'coach' || !!state.user.firebaseUid) &&
  (state.user.role !== 'manager' || resolveExperienceCapabilities(state.currentClub, state.user).clients.runtimeUsable) &&
  ['SOLO_OWNER', 'STUDIO_OWNER', 'STUDIO_MANAGER', 'STUDIO_COACH', 'LEGACY_OWNER', 'LEGACY_COACH'].includes(resolveProductExperience(state.currentClub, state.user));

/** UID assignment is authoritative; a cached assignedMemberIds list cannot expand the portfolio. */
export function selectHomeMembers(state: Pick<AppState, 'user' | 'currentClub' | 'users'>): User[] {
  if (!validStaff(state)) return [];
  return state.users.filter(member => member.role === 'member' && member.clubId === state.user!.clubId &&
    (state.user!.role !== 'coach' || !!state.user!.firebaseUid && member.assignedCoachUid === state.user!.firebaseUid));
}

export function selectOperationalTasks(state: Pick<AppState, 'user' | 'currentClub' | 'users' | 'tasks'>, includeDone = false): Task[] {
  if (!validStaff(state)) return [];
  const members = new Set(selectHomeMembers(state).map(member => Number(member.id)));
  const actor = state.user!;
  return state.tasks.filter(task => task.clubId === actor.clubId && (includeDone || task.status === 'todo') &&
    (actor.role !== 'coach' || [String(actor.id), actor.firebaseUid].includes(task.assignedTo) &&
      !task.relatedProspectId && (!task.relatedMemberId || members.has(Number(task.relatedMemberId)))))
    .sort((a, b) => (a.dueDate || '\uffff').localeCompare(b.dueDate || '\uffff') || a.id.localeCompare(b.id));
}

export function selectHomeBookings(state: Pick<AppState, 'user' | 'currentClub' | 'users' | 'bookings'>, now = new Date()): Booking[] {
  if (!validStaff(state)) return [];
  const actor = state.user!;
  const members = new Set(selectHomeMembers(state).map(member => Number(member.id)));
  return state.bookings.filter(booking => booking.clubId === actor.clubId && booking.status === 'confirmed' &&
    Number.isFinite(time(booking.startTime)) && (Number.isFinite(time(booking.endTime)) ? time(booking.endTime) > now.getTime() : time(booking.startTime) >= now.getTime()) &&
    (actor.role !== 'coach' || [actor.firebaseUid, String(actor.id)].includes(booking.coachId) &&
      (!booking.memberId || members.has(Number(booking.memberId)))))
    .sort((a, b) => time(a.startTime) - time(b.startTime) || a.id.localeCompare(b.id));
}

export function selectCurrentProgram(programs: Program[], memberId: number, now = new Date()): Program | null {
  return programs.filter(program => Number(program.memberId) === memberId && !program.isPlannedSession &&
    time(program.startDate) <= now.getTime() && (!program.durationWeeks || time(program.startDate) + program.durationWeeks * 7 * DAY > now.getTime()))
    .sort((a, b) => time(b.startDate) - time(a.startDate))[0] || null;
}

/** No financial array is accessed for Manager/Coach, even if stale data remains in memory. */
export function selectHomeFinance(state: AppState, now = new Date()) {
  if (!validStaff(state) || state.user?.role !== 'owner' || !getProductCapabilities(state.currentClub, state.user).finances.usable) return null;
  const clubId = state.user.clubId;
  const euro = (currency?: string) => !currency || currency.toLowerCase() === 'eur';
  const subscriptions = state.subscriptions.filter(item => item.clubId === clubId && euro(item.currency) && Number.isFinite(item.price) && item.price >= 0);
  const payments = state.payments.filter(item => item.clubId === clubId && euro(item.currency) && Number.isFinite(item.amount) && item.amount >= 0);
  return {
    ...billingMetrics(subscriptions, payments.filter(item => matchesPeriod(item.date, 'thisMonth', now)), []),
    weekRevenue: billingMetrics([], payments.filter(item => matchesPeriod(item.date, '7d', now)), []).revenue,
    yearRevenue: billingMetrics([], payments.filter(item => matchesPeriod(item.date, 'thisYear', now)), []).revenue,
    hasRecords: subscriptions.length > 0 || payments.length > 0,
    endingSubscriptions: subscriptions.filter(item => item.status === 'active' &&
      time(item.endDate || item.commitmentEndDate) >= now.getTime() && time(item.endDate || item.commitmentEndDate) <= now.getTime() + 30 * DAY),
  };
}

export function selectHomeData(state: AppState, priorities: FollowupPriority[] = [], now = new Date()) {
  const members = selectHomeMembers(state);
  const memberIds = new Set(members.map(member => Number(member.id)));
  const memberUids = new Set(members.map(member => member.firebaseUid).filter(Boolean));
  const actor = state.user;
  const clubId = validStaff(state) ? actor!.clubId : null;
  const experience = resolveProductExperience(state.currentClub, actor || {});
  const coach = actor?.role === 'coach';
  const caps = getProductCapabilities(state.currentClub, actor || {});
  const programs = caps.programs.usable ? state.programs.filter(item => item.clubId === clubId && memberIds.has(Number(item.memberId))) : [];
  const logs = state.logs.filter(item => item.clubId === clubId && memberIds.has(Number(item.memberId)) && time(item.completedAt || item.date) <= now.getTime());
  const tasks = selectOperationalTasks(state);
  const bookings = caps.planning.usable ? selectHomeBookings(state, now) : [];
  const today = parisDateKey(now);
  const todayBookings = bookings.filter(booking => parisDateKey(new Date(booking.startTime)) === today);
  const prospects = !coach && caps.crm.usable ? state.prospects.filter(item => item.clubId === clubId) : [];
  const activeProspects = prospects.filter(item => !['won', 'lost'].includes(item.status));
  const followups = priorities.filter(item => !!item && memberUids.has(item.memberUid) && ['late', 'expected'].includes(item.status) &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) && item.dueDate <= today);
  const unreadMessages = caps.messages.usable ? state.messages.filter(item => item.clubId === clubId && item.to === actor?.id && !item.read && (!coach || memberIds.has(Number(item.from)))) : [];
  const lastActivity = new Map<number, number>();
  logs.forEach(log => lastActivity.set(Number(log.memberId), Math.max(lastActivity.get(Number(log.memberId)) || 0, time(log.completedAt || log.date))));
  const clientFacts = members.map(member => {
    const currentProgram = selectCurrentProgram(programs, Number(member.id), now);
    const last = Math.max(lastActivity.get(Number(member.id)) || 0, Number.isFinite(time(member.lastWorkoutDate)) ? time(member.lastWorkoutDate) : 0);
    const inactiveDays = last > 0 && last <= now.getTime() ? Math.floor((now.getTime() - last) / DAY) : null;
    return { member, currentProgram, needsProgram: caps.programs.usable && (member.planRequested === true || !currentProgram), inactiveDays: inactiveDays !== null && inactiveDays >= 7 ? inactiveDays : null,
      followups: followups.filter(item => item.memberUid === member.firebaseUid), unassigned: experience === 'STUDIO_MANAGER' || experience === 'STUDIO_OWNER' ? !member.assignedCoachUid : false };
  });
  const actions: HomeAction[] = [];
  bookings.slice(0, 1).forEach(booking => actions.push({ id: `booking:${booking.id}`, type: 'session', label: `Prochain rendez-vous · ${members.find(member => Number(member.id) === Number(booking.memberId))?.name || (booking.type === 'trial' ? 'Essai' : 'Séance')}`, priority: 0,
    memberId: booking.memberId, dueDate: booking.startTime, destination: { page: 'calendar', bookingId: booking.id } }));
  if (caps.tasks.usable) tasks.filter(task => task.dueDate && task.dueDate.slice(0, 10) <= today).forEach(task => actions.push({ id: `task:${task.id}`, type: 'task', label: task.title, priority: task.dueDate.slice(0, 10) < today ? 0 : 1,
    memberId: task.relatedMemberId, dueDate: task.dueDate, destination: { page: 'crm_tasks', taskId: task.id } }));
  clientFacts.forEach(fact => {
    const { member } = fact;
    if (fact.needsProgram) actions.push({ id: `program:${member.id}`, type: 'program', label: `${member.name} · ${member.planRequested ? 'Programme demandé' : 'Programme à préparer'}`, priority: 1, memberId: member.id, destination: { page: 'users', memberId: member.id, section: 'coaching' } });
    if (fact.inactiveDays !== null) actions.push({ id: `inactive:${member.id}`, type: 'inactive', label: `${member.name} · ${fact.inactiveDays} jours sans séance`, priority: 2, memberId: member.id, destination: { page: 'users', memberId: member.id, section: 'followup' } });
    if (fact.unassigned) actions.push({ id: `unassigned:${member.id}`, type: 'unassigned', label: `${member.name} · Sans coach affecté`, priority: 1, memberId: member.id, destination: { page: 'users', memberId: member.id, section: 'coaching' } });
  });
  followups.forEach((item, index) => {
    const member = members.find(member => member.firebaseUid === item.memberUid)!;
    actions.push({ id: `checkin:${item.memberUid}:${item.templateName}:${index}`, type: 'checkIn', label: `${member.name} · ${item.templateName} ${item.status === 'late' ? 'en retard' : 'attendu'}`, priority: item.status === 'late' ? 0 : 1, memberId: member.id, dueDate: item.dueDate, destination: { page: 'users', memberId: member.id, section: 'followup' } });
  });
  const prospectsToFollowUp = activeProspects.filter(item => item.nextReminderDate ? Number.isFinite(time(item.nextReminderDate)) && item.nextReminderDate.slice(0, 10) <= today : item.status === 'call_pending');
  prospectsToFollowUp.forEach(item => actions.push({ id: `prospect:${item.id}`, type: 'prospect', label: `${item.name} · À relancer`, priority: item.nextReminderDate && item.nextReminderDate.slice(0, 10) < today ? 0 : 1, prospectId: item.id, dueDate: item.nextReminderDate, destination: { page: 'crm_pipeline', prospectUid: item.firebaseUid } }));
  if (unreadMessages.length) actions.push({ id: 'messages', type: 'message', label: `${unreadMessages.length} message${unreadMessages.length > 1 ? 's' : ''} non lu${unreadMessages.length > 1 ? 's' : ''}`, priority: 1, destination: { page: 'chat' } });
  const team = !coach && caps.teamManagement.usable ? state.users.filter(user => user.clubId === clubId && user.role === 'coach').map(user => ({
    user, assignedClients: members.filter(member => !!user.firebaseUid && member.assignedCoachUid === user.firebaseUid).length,
    tasksDue: tasks.filter(task => [String(user.id), user.firebaseUid].includes(task.assignedTo) && task.dueDate?.slice(0, 10) <= today).length,
    todayBookings: todayBookings.filter(booking => [String(user.id), user.firebaseUid].includes(booking.coachId)).length,
  })) : [];
  return { experience, members, clientFacts, tasks, bookings, todayBookings, nextBooking: bookings[0] || null, programs, logs, prospects, activeProspects, prospectsToFollowUp, unreadMessages, followups, team,
    actions: actions.sort((a, b) => a.priority - b.priority || (a.dueDate || '\uffff').localeCompare(b.dueDate || '\uffff') || a.id.localeCompare(b.id)),
    today, caps };
}
