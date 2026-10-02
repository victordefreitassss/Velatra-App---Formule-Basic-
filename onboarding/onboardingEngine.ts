import type { Club, User } from '../types';
import type { HomeDestination } from '../components/experienceHomeSelectors.ts';
import { selectHomeMembers } from '../components/experienceHomeSelectors.ts';
import { dayKey, safeId, validDay, validateAnswers } from '../server/followupModel.ts';
export const onboardingStates = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'READY', 'COMPLETED'] as const;
export type OnboardingState = typeof onboardingStates[number];
export type StepId = 'account_created' | 'profile_completed' | 'coach_reference' | 'initial_assessment' | 'program_ready' | 'first_session';
export interface OnboardingStep { id: StepId; label: string; state: 'pending' | 'complete' | 'blocked' | 'unknown' | 'not_required'; reason: string; destination: HomeDestination; implicit?: boolean; }
export interface MemberOnboardingAssessment {
  memberUid: string; memberId: number; memberName: string; assignedCoachUid?: string; coachName?: string;
  state: OnboardingState; steps: OnboardingStep[]; completedSteps: number; totalSteps: number;
  nextAction: { label: string; stepId: StepId; destination: HomeDestination } | null;
  blockers: string[]; startedAt: string | null; completedAt?: string; partial: boolean;
  sessionState: 'FIRST_SESSION_PENDING' | 'FIRST_SESSION_BOOKED' | 'FIRST_SESSION_COMPLETED' | 'UNKNOWN';
  postSale: boolean; needsAttention: boolean;
}
export interface OnboardingFacts { actor: User; club: Club; users: User[]; programs: any[]; logs: any[]; bookings: any[]; prospects: any[]; assignments: any[]; responses: any[]; templates: any[]; partialSources: string[]; }
export const onboardingLabels: Record<OnboardingState, string> = { NOT_STARTED: 'À démarrer', IN_PROGRESS: 'En cours', BLOCKED: 'À débloquer', READY: 'Prêt pour la première séance', COMPLETED: 'Onboarding terminé' };
const stamp = (v: unknown): string | null => typeof v === 'string' && (validDay(v) || Number.isFinite(Date.parse(v))) ? v : null;
const index = (rows: any[], key: string) => { const map = new Map<string, any[]>(); for (const row of rows) { if (row[key] == null) continue; const k = String(row[key]); const list = map.get(k) || []; list.push(row); map.set(k, list); } return map; };
const satisfied = (step: OnboardingStep) => ['complete', 'not_required'].includes(step.state);
/** Facts only, indexed once. No writes, no mutable lifecycle and no deployment-date cutoff. */
export function assessOnboarding(facts: OnboardingFacts, now = new Date()): MemberOnboardingAssessment[] {
  const { actor, club } = facts;
  if (!['solo', 'studio'].includes(club.accountType || '') || actor.role === 'owner' && actor.firebaseUid !== club.ownerId) return [];
  const rows = (value: any[]) => value.filter(row => row.clubId === club.id);
  const programs = index(rows(facts.programs), 'memberId'), logs = index(rows(facts.logs), 'memberId'), bookings = index(rows(facts.bookings), 'memberId');
  const assignments = index(rows(facts.assignments), 'memberUid'), responses = index(rows(facts.responses), 'memberUid');
  const people = new Map(rows(facts.users).map(row => [row.firebaseUid, row])), prospects = new Map(rows(facts.prospects).map(row => [row.firebaseUid, row])), templates = new Map(rows(facts.templates).map(row => [row.id, row]));
  const partial = new Set(facts.partialSources), policy = club.settings?.onboarding;
  return selectHomeMembers({ user: actor, currentClub: club, users: facts.users }).map(member => {
    const uid = member.firebaseUid || '', key = String(member.id), source = member.sourceProspectUid ? prospects.get(member.sourceProspectUid) : null;
    // Explicit CRM link only: never join people by names, email or telephone.
    const conversion = source?.convertedMemberUid === uid ? stamp(source.convertedAt) : null;
    const startedAt = conversion || stamp(member.createdAt), postSale = !!member.sourceProspectUid && !!conversion;
    const destination = (section: HomeDestination['section']): HomeDestination => ({ page: 'users', memberId: member.id, section });
    const steps: OnboardingStep[] = [];
    const add = (id: StepId, label: string, state: OnboardingStep['state'], reason: string, target: HomeDestination, sources: string[] = [], implicit = false) => {
      const incomplete = sources.some(name => partial.has(name));
      steps.push({ id, label, state: incomplete ? 'unknown' : state, reason: incomplete ? 'Source partielle : actualisez avant de conclure.' : reason, destination: target, ...(implicit ? { implicit: true } : {}) });
    };
    add('account_created', 'Compte adhérent', safeId(uid) && Number.isSafeInteger(member.id) && member.id > 0 ? 'complete' : 'blocked', safeId(uid) && member.id > 0 ? 'Compte adhérent réel dans cet espace.' : 'Identité adhérent à vérifier.', destination('administrative'), ['users']);
    add('profile_completed', 'Profil et objectifs', member.onboardingCompleted === true && member.profileMeasurementsPending !== true ? 'complete' : 'pending', member.onboardingCompleted === true && member.profileMeasurementsPending !== true ? 'Questionnaire de profil terminé.' : 'Le membre doit compléter son questionnaire ; les valeurs provisoires ne suffisent pas.', destination('communication'), ['users']);
    const coach = member.assignedCoachUid ? people.get(member.assignedCoachUid) : null;
    const validCoach = coach?.role === 'coach' && coach.isSuspended !== true && coach.status !== 'paused';
    add('coach_reference', 'Coach référent', club.accountType === 'solo' ? 'complete' : validCoach ? 'complete' : 'blocked', club.accountType === 'solo' ? 'Owner Solo responsable implicitement.' : validCoach ? `Référent : ${coach.name}` : 'Affecter un coach actif de ce Studio dans le dossier client.', { ...destination('administrative'), focusCoachAssignment: true }, ['users'], club.accountType === 'solo');
    const ownAssignments = assignments.get(uid) || [], ownResponses = responses.get(uid) || [];
    const initial = ownAssignments.filter(row => row.purpose === 'onboarding' && row.templateId === policy?.initialAssessmentTemplateId);
    const answered = initial.some(a => ownResponses.some(r => r.assignmentId === a.id && r.templateId === a.templateId && validDay(r.dueDate) && r.dueDate <= dayKey(now) && r.id === `${a.id}_${r.dueDate}` && r.dueDate >= a.startDate && stamp(r.answeredAt) && dayKey(new Date(r.answeredAt)) >= r.dueDate && Date.parse(r.answeredAt) <= now.getTime() && Date.parse(r.answeredAt) >= Date.parse(a.createdAt) && Array.isArray(a.questions) && validateAnswers(a.questions, r.answers) !== null));
    const template = templates.get(policy?.initialAssessmentTemplateId);
    add('initial_assessment', 'Bilan initial', !policy?.requireInitialAssessment ? 'not_required' : answered ? 'complete' : template?.active !== true ? 'blocked' : 'pending', !policy?.requireInitialAssessment ? 'Bilan initial facultatif selon la politique de cet espace.' : answered ? 'Réponse réelle reçue au bilan initial.' : template?.active !== true ? 'Configurer un modèle de bilan initial dans Suivi.' : initial.some(a => a.active) ? 'Bilan initial assigné, réponse du membre attendue.' : 'Assigner le modèle initial depuis Suivi.', destination('followup'), policy?.requireInitialAssessment ? ['coachCheckInTemplates', 'coachCheckInAssignments', 'coachCheckInResponses'] : []);
    const usable = (programs.get(key) || []).some(p => !p.isPlannedSession && stamp(p.startDate) && Array.isArray(p.days) && p.days.some((day: any) => Array.isArray(day.exercises) && day.exercises.some((e: any) => Number.isSafeInteger(e.exId) && e.exId > 0)) && (p.durationWeeks == null || Number.isFinite(p.durationWeeks) && p.durationWeeks > 0 && Date.parse(p.startDate) + p.durationWeeks * 7 * 86400000 > now.getTime()));
    add('program_ready', 'Programme utilisable', usable ? 'complete' : 'pending', usable ? 'Programme actif ou à venir avec exercices.' : 'Préparer un programme réel avec au moins un jour et un exercice.', destination('coaching'), ['programs']);
    const performed = (logs.get(key) || []).filter(l => stamp(l.completedAt || l.date) && Date.parse(l.completedAt || l.date) <= now.getTime() && (!postSale || !!conversion && Date.parse(l.completedAt || l.date) >= Date.parse(conversion))).sort((a, b) => Date.parse(a.completedAt || a.date) - Date.parse(b.completedAt || b.date));
    const booked = (bookings.get(key) || []).some(b => b.type === 'coaching' && b.status === 'confirmed' && stamp(b.startTime) && Date.parse(b.startTime) >= now.getTime() && (!b.memberUid || b.memberUid === uid));
    const sessionState: MemberOnboardingAssessment['sessionState'] = partial.has('logs') || partial.has('bookings') ? 'UNKNOWN' : performed.length ? 'FIRST_SESSION_COMPLETED' : booked ? 'FIRST_SESSION_BOOKED' : 'FIRST_SESSION_PENDING';
    add('first_session', 'Première séance', sessionState === 'FIRST_SESSION_COMPLETED' ? 'complete' : 'pending', sessionState === 'FIRST_SESSION_COMPLETED' ? 'Séance réellement enregistrée.' : booked ? 'Première séance réservée ; réalisation encore attendue.' : 'Planifier une première séance.', { page: 'calendar', memberId: member.id }, ['logs', 'bookings', ...(member.sourceProspectUid ? ['prospects'] : [])]);
    const blockers = steps.filter(s => ['blocked', 'unknown'].includes(s.state)).map(s => s.reason);
    const completedSteps = steps.filter(satisfied).length;
    const order: StepId[] = ['account_created', 'coach_reference', 'profile_completed', 'initial_assessment', 'program_ready', 'first_session'];
    const next = order.map(id => steps.find(s => s.id === id)!).find(s => !satisfied(s));
    const state: OnboardingState = blockers.length ? 'BLOCKED' : completedSteps === steps.length ? 'COMPLETED' : completedSteps === 5 && booked ? 'READY' : completedSteps ? 'IN_PROGRESS' : 'NOT_STARTED';
    return { memberUid: uid, memberId: member.id, memberName: member.name, ...(member.assignedCoachUid ? { assignedCoachUid: member.assignedCoachUid } : {}), coachName: club.accountType === 'solo' ? 'Owner Solo' : validCoach ? coach.name : undefined,
      steps, state, completedSteps, totalSteps: steps.length, nextAction: next ? { stepId: next.id, label: next.state === 'unknown' ? 'Vérifier les données' : ({ account_created: 'Vérifier le compte', coach_reference: 'Affecter le coach', profile_completed: 'Contacter le membre', initial_assessment: 'Ouvrir Suivi', program_ready: 'Préparer le programme', first_session: booked ? 'Voir la séance' : 'Planifier la séance' })[next.id], destination: next.destination } : null,
      blockers, startedAt, partial: steps.some(s => s.state === 'unknown'), sessionState, postSale, needsAttention: state !== 'COMPLETED' && (postSale || member.profileMeasurementsPending === true || !!startedAt && Date.parse(startedAt) <= now.getTime() && now.getTime() - Date.parse(startedAt) <= 30 * 86400000) };
  }).sort((a, b) => ({ BLOCKED: 0, IN_PROGRESS: 1, NOT_STARTED: 2, READY: 3, COMPLETED: 4 }[a.state] - { BLOCKED: 0, IN_PROGRESS: 1, NOT_STARTED: 2, READY: 3, COMPLETED: 4 }[b.state]) || a.memberUid.localeCompare(b.memberUid));
}
