import type { User, Club } from '../types';
import type { HomeDestination } from '../components/experienceHomeSelectors';
export type RetentionState = 'insufficient_data' | 'stable' | 'watch' | 'attention' | 'critical';
export type RetentionFamily = 'ACTIVITY' | 'PLANNING' | 'FOLLOWUP' | 'HABITS' | 'PROGRAM' | 'INTERACTION' | 'BILLING';
export type RetentionSignalType = 'ACTIVITY_STOPPED' | 'NO_FIRST_ACTIVITY' | 'ACTIVITY_FREQUENCY_DECLINE' | 'BOOKING_CANCELLATIONS' | 'CHECKIN_LATE' | 'FOLLOWUP_REPEATEDLY_MISSED' | 'HABIT_ENGAGEMENT_DECLINE' | 'NO_ACTIVE_PROGRAM' | 'PROGRAM_ENDING_WITHOUT_NEXT' | 'VELATRA_INTERACTION_GAP' | 'PAYMENT_CONTEXT' | 'RENEWAL_WINDOW';
export interface RetentionSignal { type: RetentionSignalType; family: RetentionFamily; severity: 'watch' | 'attention' | 'critical' | 'context'; title: string; evidence: string; value?: number; previousValue?: number; window: string; source: string; factKey: string; }
export interface RetentionAssessment {
  memberId: number; memberUid: string; memberName: string; assignedCoachUid?: string;
  state: RetentionState; signals: RetentionSignal[]; strongestSignal: RetentionSignal | null;
  suggestedActions: { label: string; destination: HomeDestination }[];
  evaluatedAt: string; dataWindow: { from: string; to: string }; confidence: 'insufficient' | 'normal'; partial: boolean;
  activity: { recent: number; previous: number; lastSession: string | null };
  timeline: { date: string; kind: 'session' | 'cancellation' | 'checkin' | 'habit'; label: string }[]; timelineTotal: number;
}
/** Raw datasets stay on the server; responses expose explanations, never health or answer payloads. */
export interface RetentionFacts { actor: User; club: Club; users: User[]; programs: any[]; logs: any[]; bookings: any[]; assignments: any[]; responses: any[]; habits: any[]; entries: any[]; messages: any[]; subscriptions: any[]; partialSources: string[]; }
export const retentionStates: RetentionState[] = ['critical', 'attention', 'watch', 'stable', 'insufficient_data'];
export const retentionLabels: Record<RetentionState, string> = { critical: 'Critique', attention: 'Attention', watch: 'À surveiller', stable: 'Stable', insufficient_data: 'Données insuffisantes' };
export type RetentionCounts = Record<RetentionState, number>;
export const interventionLabels = { contacted: 'Contacté', called: 'Appel effectué', checkin_planned: 'Bilan planifié', program_adapted: 'Programme adapté', other: 'Autre' };
export type InterventionKind = keyof typeof interventionLabels;
export interface RetentionIntervention { id: string; kind: InterventionKind; note: string; actorUid: string; createdAt: string; }
export interface RetentionResult { assessments: RetentionAssessment[]; counts: RetentionCounts; total: number; nextCursor: string | null; coaches: { uid: string; name: string }[]; signalTypes: RetentionSignalType[]; partialSources: string[]; evaluatedAt: string; }
