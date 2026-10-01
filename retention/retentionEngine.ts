import { selectHomeMembers } from '../components/experienceHomeSelectors.ts';
import { parisDateKey } from '../components/planningSlots.ts';
import { dueDateFor, parseFrequency, shiftDay, validDay } from '../server/followupModel.ts';
import type { RetentionAssessment, RetentionFacts, RetentionSignal, RetentionCounts, RetentionState } from './retentionModel.ts';
const DAY = 86400000;
export const retentionDay = (value: unknown): string | null => typeof value === 'string' && (validDay(value) ? value : Number.isFinite(Date.parse(value)) ? parisDateKey(new Date(value)) : null);
const span = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);
const rank = { context: 0, watch: 1, attention: 2, critical: 3 };
export function classifyRetention(signals: RetentionSignal[], sufficient: boolean, partial = false): RetentionState {
  if (partial) return 'insufficient_data';
  const families = new Map<string, number>();
  signals.filter(s => !['INTERACTION', 'BILLING'].includes(s.family)).forEach(s => families.set(s.family, Math.max(families.get(s.family) || 0, rank[s.severity])));
  const levels = [...families.values()];
  if (levels.includes(3) || levels.filter(value => value === 2).length >= 2) return 'critical';
  if (levels.includes(2)) return 'attention';
  if (levels.includes(1) || signals.some(s => s.family === 'INTERACTION' && s.severity === 'watch')) return 'watch';
  return sufficient ? 'stable' : 'insufficient_data';
}
function index(rows: any[], key: (row: any) => string | number | undefined) {
  const result = new Map<string, any[]>();
  for (const row of rows) { const id = key(row); if (id == null) continue; const k = String(id); if (!result.has(k)) result.set(k, []); result.get(k)!.push(row); }
  return result;
}
export function assessRetention(facts: RetentionFacts, now = new Date()): RetentionAssessment[] {
  const today = parisDateKey(now), from = shiftDay(today, -55), recentFrom = shiftDay(today, -13), previousFrom = shiftDay(today, -27);
  const past = (value: unknown) => validDay(value) ? value <= today : typeof value === 'string' && Date.parse(value) <= now.getTime();
  const clubRows = (rows: any[]) => rows.filter(row => row.clubId === facts.club.id);
  const byId = (rows: any[]) => index(clubRows(rows), row => row.memberId);
  const byUid = (rows: any[]) => index(clubRows(rows), row => row.memberUid);
  const logs = byId(facts.logs), programs = byId(facts.programs), bookings = byId(facts.bookings);
  const assignments = byUid(facts.assignments), habits = byUid(facts.habits), entries = byUid(facts.entries), responses = byUid(facts.responses);
  // Only this actor's personal conversations; another coach's history is never fetched or inferred.
  const messages = index(clubRows(facts.messages).filter(row => row.from === facts.actor.id || row.to === facts.actor.id), row => row.from === facts.actor.id ? row.to : row.from);
  const subscriptions = facts.actor.role === 'owner' ? byId(facts.subscriptions) : new Map<string, any[]>();
  const partial = facts.partialSources.some(source => ['users', 'programs', 'logs', 'bookings', 'coachCheckInAssignments', 'coachCheckInResponses', 'coachHabits', 'coachHabitEntries', 'messages', 'subscriptions'].includes(source));
  return selectHomeMembers({ user: facts.actor, currentClub: facts.club, users: facts.users }).filter(member => member.status !== 'paused' && member.firebaseUid).flatMap(member => {
    const id = String(member.id), uid = member.firebaseUid!, ownSubs = subscriptions.get(id) || [];
    if (ownSubs.some(row => ['cancelled', 'canceled'].includes(row.status)) && !ownSubs.some(row => ['active', 'trialing', 'past_due', 'unpaid'].includes(row.status))) return [];
    const signals: RetentionSignal[] = [], timeline: RetentionAssessment['timeline'] = [];
    const add = (signal: RetentionSignal) => signals.push(signal);
    const ageDay = retentionDay(member.createdAt), age = ageDay ? span(ageDay, today) : null;
    const ownLogs = (logs.get(id) || []).filter(row => retentionDay(row.completedAt || row.date) && past(row.completedAt || row.date));
    const dates = ownLogs.map(row => retentionDay(row.completedAt || row.date)!);
    const last = dates.slice().sort().at(-1) || null, inactivity = last ? span(last, today) : null;
    const recent = dates.filter(day => day >= recentFrom && day <= today).length, previous = dates.filter(day => day >= previousFrom && day < recentFrom).length;
    if (inactivity != null && inactivity >= 8) add({ type: 'ACTIVITY_STOPPED', family: 'ACTIVITY', severity: inactivity >= 21 ? 'critical' : inactivity >= 14 ? 'attention' : 'watch', title: 'Séances interrompues', evidence: `${inactivity} jours sans séance enregistrée`, value: inactivity, window: 'Depuis la dernière séance', source: 'logs', factKey: `last:${last}` });
    if (!(logs.get(id) || []).length && !last && age != null && age >= 7) add({ type: 'NO_FIRST_ACTIVITY', family: 'ACTIVITY', severity: age >= 14 ? 'attention' : 'watch', title: 'Première séance attendue', evidence: `Aucune première séance enregistrée · inscription depuis ${age} jours`, value: age, window: 'Depuis l’inscription', source: 'users + logs', factKey: `first:${ageDay}` });
    if (previous >= 3) { const drop = (previous - recent) / previous;
      if (drop >= .25) add({ type: 'ACTIVITY_FREQUENCY_DECLINE', family: 'ACTIVITY', severity: drop >= .9 ? 'critical' : drop >= .5 ? 'attention' : 'watch', title: 'Fréquence en baisse', evidence: `${recent} séance(s) sur 14 jours contre ${previous} auparavant · baisse de ${Math.round(drop * 100)} %`, value: recent, previousValue: previous, window: '14 jours / 14 jours précédents', source: 'logs', factKey: `frequency:${ownLogs.filter(row => retentionDay(row.completedAt || row.date)! >= previousFrom).map(row => [row.id, row.completedAt || row.date]).sort().join('|')}` });
    }
    ownLogs.forEach(row => { const date = retentionDay(row.completedAt || row.date)!; if (date >= from) timeline.push({ date, kind: 'session', label: 'Séance enregistrée' }); });
    const cancels = (bookings.get(id) || []).filter(row => row.status === 'cancelled' && retentionDay(row.startTime) && retentionDay(row.startTime)! >= shiftDay(today, -29) && past(row.startTime));
    if (cancels.length >= 2) add({ type: 'BOOKING_CANCELLATIONS', family: 'PLANNING', severity: cancels.length >= 3 ? 'attention' : 'watch', title: 'Annulations répétées', evidence: `${cancels.length} réservations annulées sur 30 jours (date de séance)`, value: cancels.length, window: '30 jours', source: 'bookings.status', factKey: cancels.map(row => [row.id, row.startTime]).sort().join('|') });
    (bookings.get(id) || []).filter(row => row.status === 'cancelled' && retentionDay(row.startTime) && retentionDay(row.startTime)! >= from && past(row.startTime)).forEach(row => timeline.push({ date: retentionDay(row.startTime)!, kind: 'cancellation', label: 'Réservation annulée' }));
    const answers = new Map((responses.get(uid) || []).map(row => [row.id, row]));
    (assignments.get(uid) || []).filter(row => row.active === true && validDay(row.startDate) && parseFrequency(row.frequency)).forEach(assignment => {
      const due = new Set<string>();
      for (let n = 55; n >= 0; n--) { const day = shiftDay(today, -n), date = assignment.frequency.kind === 'manual' ? assignment.startDate <= day ? assignment.startDate : null : dueDateFor(assignment.frequency, assignment.startDate, day); if (date && date < today) due.add(date); }
      const ordered = [...due].sort().reverse(); let missed = 0;
      for (const date of ordered) { if (answers.has(`${assignment.id}_${date}`)) break; missed++; }
      if (!missed) return;
      const latest = ordered[0], late = span(latest, today), repeated = missed >= 2;
      add({ type: repeated ? 'FOLLOWUP_REPEATEDLY_MISSED' : 'CHECKIN_LATE', family: 'FOLLOWUP', severity: repeated || late >= 7 ? 'attention' : 'watch', title: repeated ? 'Bilans successifs non reçus' : 'Bilan en retard', evidence: repeated ? `${assignment.templateName || 'Bilan'} · ${missed} échéances consécutives sans réponse enregistrée` : `${assignment.templateName || 'Bilan'} en retard de ${late} jour(s)`, value: repeated ? missed : late, window: 'Échéances observées sur 56 jours', source: 'coachCheckInAssignments + coachCheckInResponses', factKey: `${assignment.id}:${ordered.slice(0, missed).join(',')}` });
    });
    (responses.get(uid) || []).filter(row => answers.get(row.id) === row && row.id === `${row.assignmentId}_${row.dueDate}` && retentionDay(row.answeredAt) && retentionDay(row.answeredAt)! >= from && past(row.answeredAt)).forEach(row => timeline.push({ date: retentionDay(row.answeredAt)!, kind: 'checkin', label: 'Bilan reçu' }));
    const ownEntries = entries.get(uid) || [], entryByHabit = index(ownEntries, row => row.habitId);
    (habits.get(uid) || []).filter(row => row.active === true && row.frequency?.kind === 'daily' && validDay(row.startDate) && row.startDate <= shiftDay(today, -14) && (!row.endDate || row.endDate >= shiftDay(today, -1))).forEach(habit => {
      const valid = (entryByHabit.get(String(habit.id)) || []).filter(row => row.id === `${habit.id}_${row.date}` && validDay(row.date) && row.date < today && row.met === true);
      const days = new Set(valid.map(row => row.date));
      const current = [...days].filter(day => day >= shiftDay(today, -7)).length, prior = [...days].filter(day => day >= shiftDay(today, -14) && day < shiftDay(today, -7)).length;
      if (prior >= 4 && (prior - current) / prior >= .25) add({ type: 'HABIT_ENGAGEMENT_DECLINE', family: 'HABITS', severity: (prior - current) / prior >= .5 ? 'attention' : 'watch', title: 'Habitude moins renseignée', evidence: `${habit.title || habit.name || 'Habitude'} · ${current}/7 validations enregistrées contre ${prior}/7 auparavant`, value: current, previousValue: prior, window: '7 jours complets / 7 jours précédents', source: 'coachHabits + coachHabitEntries', factKey: `${habit.id}:${valid.filter(row => row.date >= shiftDay(today, -14)).map(row => row.date).sort().join(',')}` });
    });
    ownEntries.filter(row => row.id === `${row.habitId}_${row.date}` && validDay(row.date) && row.date >= from && row.date <= today && row.met === true).forEach(row => timeline.push({ date: row.date, kind: 'habit', label: 'Habitude validée' }));
    const ownPrograms = (programs.get(id) || []).filter(row => !row.isPlannedSession && Array.isArray(row.days) && row.days.some((day: any) => day.exercises?.length > 0) && Number.isFinite(Date.parse(row.startDate)));
    const end = (row: any) => row.durationWeeks > 0 ? Date.parse(row.startDate) + row.durationWeeks * 7 * DAY : Infinity;
    const active = ownPrograms.filter(row => Date.parse(row.startDate) <= now.getTime() && end(row) > now.getTime()).sort((a, b) => Date.parse(b.startDate) - Date.parse(a.startDate))[0];
    const next = ownPrograms.some(row => Date.parse(row.startDate) > now.getTime());
    if (!active && age != null && age >= 7) { const expired = ownPrograms.map(end).filter(value => value <= now.getTime()).sort((a, b) => b - a)[0]; const ended = Number.isFinite(expired) ? span(parisDateKey(new Date(expired)), today) : null;
      add({ type: 'NO_ACTIVE_PROGRAM', family: 'PROGRAM', severity: ended != null && ended >= 7 ? 'attention' : 'watch', title: 'Programme actif absent', evidence: ended != null ? `Programme terminé depuis ${ended} jour(s), aucun programme actif` : 'Aucun programme utilisable actuellement', value: ended ?? undefined, window: 'Programme actuel', source: 'programs', factKey: ownPrograms.map(row => [row.id, row.startDate, row.durationWeeks]).sort().join('|') || 'none' });
    } else if (active && !next && Number.isFinite(end(active)) && end(active) - now.getTime() <= 14 * DAY) add({ type: 'PROGRAM_ENDING_WITHOUT_NEXT', family: 'PROGRAM', severity: 'watch', title: 'Suite du programme à préparer', evidence: `Programme à échéance dans ${Math.ceil((end(active) - now.getTime()) / DAY)} jour(s), sans suite programmée`, window: '14 jours', source: 'programs', factKey: `${active.id}:${active.startDate}:${active.durationWeeks}` });
    const lastMessage = (messages.get(id) || []).map(row => retentionDay(row.date)).filter((day): day is string => !!day && day <= today).sort().at(-1);
    if (lastMessage && span(lastMessage, today) >= 21) add({ type: 'VELATRA_INTERACTION_GAP', family: 'INTERACTION', severity: 'watch', title: 'Interaction Velatra ancienne', evidence: `Aucune interaction enregistrée dans Velatra depuis ${span(lastMessage, today)} jours dans votre conversation · les contacts externes ne sont pas connus`, window: 'Conversation personnelle', source: 'messages', factKey: lastMessage });
    ownSubs.forEach(row => { if (['past_due', 'unpaid'].includes(row.status)) add({ type: 'PAYMENT_CONTEXT', family: 'BILLING', severity: 'context', title: 'Contexte commercial', evidence: row.status === 'past_due' ? 'Abonnement en retard de paiement' : 'Abonnement impayé', window: 'État actuel', source: 'subscriptions', factKey: `${row.id}:${row.status}` });
      const date = retentionDay(row.endDate || row.commitmentEndDate); if (row.status === 'active' && date && span(today, date) >= 0 && span(today, date) <= 30) add({ type: 'RENEWAL_WINDOW', family: 'BILLING', severity: 'context', title: 'Renouvellement à préparer', evidence: `Échéance d’abonnement dans ${span(today, date)} jour(s)`, window: '30 jours', source: 'subscriptions', factKey: `${row.id}:${date}` });
    });
    signals.sort((a, b) => rank[b.severity] - rank[a.severity] || a.type.localeCompare(b.type));
    const sufficient = age != null ? age >= 28 || ownLogs.length >= 3 && age >= 7 : ownLogs.length >= 3;
    const memberPartial = partial || (logs.get(id) || []).some(row => !retentionDay(row.completedAt || row.date));
    const state = classifyRetention(signals, sufficient, memberPartial);
    const suggestedActions: RetentionAssessment['suggestedActions'] = [{ label: 'Envoyer un message', destination: { page: 'chat', memberId: member.id } }, { label: 'Planifier un bilan', destination: { page: 'calendar', memberId: member.id } }];
    if (signals.some(s => s.family === 'FOLLOWUP')) suggestedActions.push({ label: 'Ouvrir le bilan', destination: { page: 'users', memberId: member.id, section: 'followup' } });
    if (signals.some(s => s.family === 'PROGRAM')) suggestedActions.push({ label: 'Préparer la suite', destination: { page: 'users', memberId: member.id, section: 'coaching' } });
    if (signals.some(s => s.family === 'BILLING')) suggestedActions.push({ label: 'Voir le renouvellement / paiement', destination: { page: 'users', memberId: member.id, section: 'administrative', adminSection: 'billing' } });
    if (!member.assignedCoachUid && facts.club.accountType === 'studio' && facts.actor.role !== 'coach') suggestedActions.push({ label: 'Affecter un coach', destination: { page: 'users', memberId: member.id, section: 'coaching' } });
    timeline.sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind));
    return [{ memberId: member.id, memberUid: uid, memberName: member.name, ...(member.assignedCoachUid ? { assignedCoachUid: member.assignedCoachUid } : {}), state, signals, strongestSignal: signals.find(s => s.family !== 'BILLING') || null, suggestedActions, evaluatedAt: now.toISOString(), dataWindow: { from, to: today }, confidence: state === 'insufficient_data' ? 'insufficient' as const : 'normal' as const, partial: memberPartial, activity: { recent, previous, lastSession: last }, timeline: timeline.slice(0, 100), timelineTotal: timeline.length }];
  }).sort((a, b) => ({ critical: 0, attention: 1, watch: 2, stable: 3, insufficient_data: 4 }[a.state] - { critical: 0, attention: 1, watch: 2, stable: 3, insufficient_data: 4 }[b.state]) || a.memberUid.localeCompare(b.memberUid));
}
export function retentionCounts(assessments: RetentionAssessment[]): RetentionCounts { const counts: RetentionCounts = { critical: 0, attention: 0, watch: 0, stable: 0, insufficient_data: 0 }; assessments.forEach(item => counts[item.state]++); return counts; }
