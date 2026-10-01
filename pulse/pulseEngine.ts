import { createHash } from 'node:crypto';
import type { AppState, Program } from '../types';
import { selectHomeMembers, selectOperationalTasks, selectHomeBookings } from '../components/experienceHomeSelectors.ts';
import { resolveExperienceCapabilities } from '../productExperience.ts';
import { getProductCapabilities } from '../productCapabilities.ts';
import { parisDateKey } from '../components/planningSlots.ts';
import { validDay } from '../server/followupModel.ts';
import type { PulseAction, PulseActionState, PulseCategory, PulseFollowup, PulseInput } from './pulseModel';
const DAY = 86400000;
const stamp = (value?: string) => typeof value === 'string' && validDay(value.slice(0, 10)) ? Date.parse(value) : NaN;
const fingerprint = (values: unknown[]) => createHash('sha256').update(JSON.stringify(values)).digest('hex');
const dateKey = (value?: string) => value && (validDay(value) ? value : Number.isFinite(stamp(value)) ? parisDateKey(new Date(value)) : null);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);
const usable = (program: Program) => Array.isArray(program.days) && program.days.some(day => Array.isArray(day.exercises) && day.exercises.length > 0);
export function pulseCategories(input: PulseInput): PulseCategory[] {
  if (!input.user || !['owner', 'manager', 'coach'].includes(input.user.role) || input.user.isSuspended || input.currentClub?.isActive === false || input.currentClub?.id !== input.user.clubId) return [];
  if (!resolveExperienceCapabilities(input.currentClub, input.user).clients.runtimeUsable) return [];
  const caps = getProductCapabilities(input.currentClub, input.user);
  return (['clients', 'coaching', 'followup', 'messages', 'tasks', 'planning', 'crm', 'business'] as const).filter(category =>
    category === 'business' ? input.user?.role === 'owner' && caps.finances.usable : category === 'crm' ? input.user?.role !== 'coach' && caps.crm.usable :
    category === 'followup' ? caps.clients.usable : category === 'coaching' ? caps.programs.usable : caps[category].usable);
}
/** Pure derivation. Caller provides verified facts; selectors recheck tenant/assignment. */
export function derivePulse(input: PulseInput, followups: PulseFollowup[] = [], now = new Date()): PulseAction[] {
  const state = input as AppState;
  const today = parisDateKey(now);
  const scopedMembers = selectHomeMembers(state), ids = new Set(scopedMembers.map(member => Number(member.id)));
  const clubId = input.user?.clubId;
  const data = {
    members: scopedMembers,
    programs: input.programs.filter(item => item.clubId === clubId && ids.has(Number(item.memberId)) && !item.isPlannedSession),
    logs: input.logs.filter(item => item.clubId === clubId && ids.has(Number(item.memberId)) && stamp(item.completedAt || item.date) <= now.getTime()),
    tasks: selectOperationalTasks(state), bookings: selectHomeBookings(state, now),
    prospects: input.user?.role !== 'coach' ? input.prospects.filter(item => item.clubId === clubId) : [],
    unreadMessages: input.messages.filter(item => item.clubId === clubId && item.to === input.user?.id && item.read === false && ids.has(Number(item.from))),
  };
  if (!pulseCategories(input).length) return [];
  const allowed = new Set(pulseCategories(input));
  const revision = (path: string) => input.sourceVersions?.[path] || null;
  const actions = new Map<string, PulseAction>();
  const members = new Map(data.members.map(member => [Number(member.id), member]));
  const memberUids = new Map(data.members.filter(member => member.firebaseUid).map(member => [member.firebaseUid!, member]));
  const programs = new Map<number, Program[]>();
  data.programs.forEach(program => { const id = Number(program.memberId); if (!programs.has(id)) programs.set(id, []); programs.get(id)!.push(program); });
  const activity = new Map<number, number>();
  data.logs.forEach(log => activity.set(Number(log.memberId), Math.max(activity.get(Number(log.memberId)) || 0, stamp(log.completedAt || log.date))));
  const add = (action: Omit<PulseAction, 'group'>) => {
    if (!allowed.has(action.category)) return;
    const due = dateKey(action.dueAt);
    const group = due && due < today ? 'overdue' : due && due > today ? 'upcoming' : 'today';
    if (!actions.has(action.key)) actions.set(action.key, { ...action, group });
  };
  data.members.forEach(member => {
    if (member.status === 'paused' || !member.firebaseUid) return;
    const identity = { memberId: member.id, memberUid: member.firebaseUid };
    const destination = { page: 'users', memberId: member.id } as const;
    const base = { ...identity, title: member.name, destination, quickActions: [{ label: 'Voir le client', destination }, ...(allowed.has('messages') ? [{ label: 'Message', destination: { page: 'chat', memberId: member.id } as const }] : [])] };
    const own = programs.get(Number(member.id)) || [];
    const current = own.filter(program => usable(program) && stamp(program.startDate) <= now.getTime() && (!program.durationWeeks || stamp(program.startDate) + program.durationWeeks * 7 * DAY > now.getTime())).sort((a, b) => stamp(b.startDate) - stamp(a.startDate))[0];
    const last = Math.max(activity.get(Number(member.id)) || 0, Number.isFinite(stamp(member.lastWorkoutDate)) && stamp(member.lastWorkoutDate) <= now.getTime() ? stamp(member.lastWorkoutDate) : 0);
    const inactive = last > 0 ? Math.floor((now.getTime() - last) / DAY) : null;
    const sinceCreated = Number.isFinite(stamp(member.createdAt)) ? Math.floor((now.getTime() - stamp(member.createdAt)) / DAY) : null;
    if (inactive !== null && inactive > 7 || inactive === null && sinceCreated !== null && sinceCreated > 7) add({ ...base, key: `inactive:${member.firebaseUid}`, type: 'CLIENT_INACTIVE', category: 'clients', priority: 'normal', reason: inactive !== null ? `${inactive} jours sans séance` : `Client créé depuis ${sinceCreated} jours, aucune séance enregistrée`, createdFrom: `users/${member.firebaseUid}`, sourceFingerprint: fingerprint([member.firebaseUid, last || member.createdAt]) });
    if (!current || member.planRequested === true) {
      const destination = { page: 'users', memberId: member.id, section: 'coaching' } as const;
      add({ ...base, key: `programMissing:${member.firebaseUid}`, type: 'PROGRAM_MISSING', category: 'coaching', priority: 'high', reason: member.planRequested ? 'Programme demandé' : 'Programme à préparer', destination, quickActions: [{ label: 'Préparer le programme', destination }], createdFrom: `users/${member.firebaseUid}`, sourceFingerprint: fingerprint([member.firebaseUid, member.planRequested === true, member.planRequested ? revision(`users/${member.firebaseUid}`) : null, own.map(program => [program.id, program.startDate, program.durationWeeks, usable(program), revision(`programs/${program.id}`)]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))]) });
    } else if (Number.isFinite(current.durationWeeks) && current.durationWeeks > 0) {
      const end = stamp(current.startDate) + current.durationWeeks * 7 * DAY, days = Math.ceil((end - now.getTime()) / DAY);
      if (days > 0 && days <= 14) { const destination = { page: 'users', memberId: member.id, section: 'coaching' } as const;
        add({ ...base, key: `programEnding:${member.firebaseUid}:${current.id}`, type: 'PROGRAM_ENDING', category: 'coaching', priority: days <= 7 ? 'high' : 'normal', reason: `Programme à échéance dans ${days} jour(s)`, dueAt: new Date(end).toISOString(), destination, quickActions: [{ label: 'Préparer la suite', destination }], createdFrom: `programs/${current.id}`, sourceFingerprint: fingerprint([member.firebaseUid, current.id, current.startDate, current.durationWeeks]) }); }
    }
    if (['owner', 'manager'].includes(input.user!.role) && input.currentClub?.accountType === 'studio' && !member.assignedCoachUid) { const destination = { page: 'users', memberId: member.id, section: 'coaching' } as const;
      add({ ...base, key: `unassigned:${member.firebaseUid}`, type: 'CLIENT_UNASSIGNED', category: 'clients', priority: 'high', reason: 'Sans coach principal affecté', destination, quickActions: [{ label: 'Affecter un coach', destination }], createdFrom: `users/${member.firebaseUid}`, sourceFingerprint: fingerprint([member.firebaseUid, member.assignedCoachUid || null, revision(`users/${member.firebaseUid}`)]) }); }
  });
  followups.forEach(item => {
    const member = memberUids.get(item.memberUid);
    if (!member || !item.id || !validDay(item.dueDate) || item.dueDate > today) return;
    const late = daysBetween(item.dueDate, today), destination = { page: 'users', memberId: member.id, section: 'followup' } as const;
    add({ key: `followup:${item.id}:${item.dueDate}`, type: late ? 'FOLLOWUP_LATE' : 'FOLLOWUP_DUE', category: 'followup', priority: late >= 7 ? 'urgent' : late ? 'high' : 'normal', title: member.name, reason: late ? `${item.templateName} en retard de ${late} jour(s)` : `${item.templateName} attendu aujourd’hui`, dueAt: item.dueDate, memberId: member.id, memberUid: member.firebaseUid, destination, quickActions: [{ label: 'Ouvrir le bilan', destination }], createdFrom: `coachCheckInAssignments/${item.id}`, sourceFingerprint: fingerprint([item.id, member.firebaseUid, item.dueDate]) });
  });
  const threads = new Map<number, typeof data.unreadMessages>();
  data.unreadMessages.filter(message => message.read === false && members.has(Number(message.from))).forEach(message => threads.set(Number(message.from), [...(threads.get(Number(message.from)) || []), message]));
  threads.forEach((messages, id) => { const member = members.get(id)!, destination = { page: 'chat', memberId: id } as const;
    add({ key: `messages:${member.firebaseUid || id}`, type: 'MESSAGE_UNREAD', category: 'messages', priority: 'normal', title: member.name, reason: `${messages.length} message(s) non lu(s)`, memberId: id, memberUid: member.firebaseUid, destination, quickActions: [{ label: 'Ouvrir la conversation', destination }], createdFrom: 'messages', sourceFingerprint: fingerprint(messages.map(message => [message.id, message.date, revision(`messages/${message.id}`)]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))) });
  });
  data.tasks.forEach(task => {
    const due = dateKey(task.dueDate); if (!due) return;
    // Historical automatic inactivity/birthday tasks remain in Tasks, not duplicated in Pulse.
    if (task.id.startsWith('auto_') || task.id.startsWith('bday_')) return;
    const destination = { page: 'crm_tasks', taskId: task.id } as const;
    add({ key: `task:${task.id}`, type: due < today ? 'TASK_OVERDUE' : due === today ? 'TASK_TODAY' : 'TASK_UPCOMING', category: 'tasks', priority: due < today ? 'urgent' : 'normal', title: task.title, reason: due < today ? `Tâche en retard de ${daysBetween(due, today)} jour(s)` : due === today ? 'Tâche due aujourd’hui' : `Tâche prévue le ${due}`, dueAt: task.dueDate, taskId: task.id, memberId: task.relatedMemberId, destination, quickActions: [{ label: 'Ouvrir la tâche', destination }], createdFrom: `tasks/${task.id}`, sourceFingerprint: fingerprint([task.id, task.dueDate, task.assignedTo, task.relatedMemberId || null, task.title, revision(`tasks/${task.id}`)]) });
  });
  data.prospects.filter(prospect => !['won', 'lost'].includes(prospect.status)).forEach(prospect => {
    const due = dateKey(prospect.nextReminderDate); if (!due || due > today || !prospect.firebaseUid) return;
    const destination = { page: 'crm_pipeline', prospectUid: prospect.firebaseUid } as const;
    add({ key: `prospectReminder:${prospect.firebaseUid}`, type: due < today ? 'PROSPECT_REMINDER_OVERDUE' : 'PROSPECT_REMINDER_TODAY', category: 'crm', priority: due < today ? 'urgent' : 'normal', title: prospect.name, reason: due < today ? `Relance en retard de ${daysBetween(due, today)} jour(s)` : 'Relance prévue aujourd’hui', dueAt: prospect.nextReminderDate, prospectId: prospect.id, destination, quickActions: [{ label: 'Ouvrir le prospect', destination }], createdFrom: `prospects/${prospect.firebaseUid}`, sourceFingerprint: fingerprint([prospect.firebaseUid, prospect.nextReminderDate, prospect.status]) });
  });
  data.bookings.filter(booking => booking.type === 'trial' && stamp(booking.startTime) >= now.getTime() && stamp(booking.startTime) <= now.getTime() + DAY).forEach(booking => {
    const destination = { page: 'calendar', bookingId: booking.id } as const;
    add({ key: `trial:${booking.id}`, type: 'TRIAL_UPCOMING', category: 'planning', priority: 'normal', title: members.get(Number(booking.memberId))?.name || data.prospects.find(item => item.id === booking.prospectId)?.name || 'Essai confirmé', reason: `Essai à venir · ${new Date(booking.startTime).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`, dueAt: booking.startTime, bookingId: booking.id, destination, quickActions: [{ label: 'Ouvrir le planning', destination }], createdFrom: `bookings/${booking.id}`, sourceFingerprint: fingerprint([booking.id, booking.startTime, booking.coachId, booking.memberId || booking.prospectId]) });
  });
  if (allowed.has('business')) {
    const attention = new Set<string>();
    state.subscriptions.filter(item => item.clubId === state.user!.clubId && ['past_due', 'unpaid'].includes(item.status) && members.has(Number(item.memberId))).forEach(subscription => {
      attention.add(subscription.id); const member = members.get(Number(subscription.memberId))!, destination = { page: 'users', memberId: member.id, section: 'administrative', adminSection: 'billing' } as const;
      add({ key: `subscriptionAttention:${subscription.id}`, type: 'PAYMENT_ATTENTION', category: 'business', priority: 'urgent', title: member.name, reason: subscription.status === 'past_due' ? 'Abonnement en retard de paiement' : 'Abonnement impayé', subscriptionId: subscription.id, memberId: member.id, memberUid: member.firebaseUid, destination, quickActions: [{ label: 'Voir la facturation', destination }], createdFrom: `subscriptions/${subscription.id}`, sourceFingerprint: fingerprint([subscription.id, subscription.status, subscription.memberId, revision(`subscriptions/${subscription.id}`)]) });
    });
    state.payments.filter(item => item.clubId === state.user!.clubId && item.status === 'failed' && members.has(Number(item.memberId)) && !attention.has(item.subscriptionId || '')).forEach(payment => {
      const member = members.get(Number(payment.memberId))!, destination = { page: 'users', memberId: member.id, section: 'administrative', adminSection: 'billing' } as const;
      add({ key: `paymentAttention:${payment.id}`, type: 'PAYMENT_ATTENTION', category: 'business', priority: 'urgent', title: member.name, reason: 'Paiement échoué à vérifier', paymentId: payment.id, memberId: member.id, memberUid: member.firebaseUid, destination, quickActions: [{ label: 'Voir la facturation', destination }], createdFrom: `payments/${payment.id}`, sourceFingerprint: fingerprint([payment.id, payment.status, payment.memberId, revision(`payments/${payment.id}`)]) });
    });
    state.subscriptions.filter(item => item.clubId === clubId && item.status === 'active' && members.has(Number(item.memberId)) && stamp(item.endDate || item.commitmentEndDate) >= now.getTime() && stamp(item.endDate || item.commitmentEndDate) <= now.getTime() + 30 * DAY).forEach(subscription => {
      const member = members.get(Number(subscription.memberId))!, destination = { page: 'users', memberId: member.id, section: 'administrative', adminSection: 'billing' } as const;
      const dueAt = subscription.endDate || subscription.commitmentEndDate!;
      add({ key: `subscriptionEnding:${subscription.id}`, type: 'SUBSCRIPTION_ENDING', category: 'business', priority: 'normal', title: member.name, reason: `Abonnement à échéance dans ${Math.max(0, daysBetween(dateKey(dueAt)!, today) * -1)} jour(s)`, dueAt, subscriptionId: subscription.id, memberId: member.id, memberUid: member.firebaseUid, destination, quickActions: [{ label: 'Voir l’abonnement', destination }], createdFrom: `subscriptions/${subscription.id}`, sourceFingerprint: fingerprint([subscription.id, dueAt, subscription.memberId]) });
    });
  }
  return [...actions.values()].sort((a, b) => ({ urgent: 0, high: 1, normal: 2 }[a.priority] - { urgent: 0, high: 1, normal: 2 }[b.priority]) || ({ overdue: 0, today: 1, upcoming: 2 }[a.group] - { overdue: 0, today: 1, upcoming: 2 }[b.group]) || ((a.dueAt ? stamp(a.dueAt) : Number.MAX_SAFE_INTEGER) - (b.dueAt ? stamp(b.dueAt) : Number.MAX_SAFE_INTEGER)) || a.key.localeCompare(b.key));
}
export function applyPulseStates(actions: PulseAction[], states: PulseActionState[], actorUid: string, clubId: string, now = new Date()): PulseAction[] {
  const indexed = new Map(states.filter(state => state.actorUid === actorUid && state.clubId === clubId).map(state => [state.key, state]));
  return actions.map(action => {
    const saved = indexed.get(action.key);
    const matches = saved?.sourceFingerprint === action.sourceFingerprint;
    const status = matches && saved.status === 'handled' ? 'handled' : matches && saved.status === 'snoozed' && stamp(saved.snoozedUntil) > now.getTime() ? 'snoozed' : 'open';
    return { ...action, state: status, ...(status === 'snoozed' ? { snoozedUntil: saved!.snoozedUntil } : {}) };
  });
}
