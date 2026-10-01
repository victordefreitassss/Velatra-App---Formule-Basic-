import type { AppState } from '../types';
import type { HomeDestination } from '../components/experienceHomeSelectors';
import { addParisDays, parisDateKey, parisLocalInstant } from '../components/planningSlots.ts';
export type PulseType = 'CLIENT_INACTIVE' | 'PROGRAM_MISSING' | 'PROGRAM_ENDING' | 'FOLLOWUP_DUE' | 'FOLLOWUP_LATE' | 'MESSAGE_UNREAD' | 'TASK_OVERDUE' | 'TASK_TODAY' | 'TASK_UPCOMING' | 'PROSPECT_REMINDER_OVERDUE' | 'PROSPECT_REMINDER_TODAY' | 'TRIAL_UPCOMING' | 'CLIENT_UNASSIGNED' | 'PAYMENT_ATTENTION' | 'SUBSCRIPTION_ENDING';
export type PulseCategory = 'clients' | 'coaching' | 'followup' | 'messages' | 'tasks' | 'crm' | 'planning' | 'business';
export type PulsePriority = 'urgent' | 'high' | 'normal';
export type PulseGroup = 'overdue' | 'today' | 'upcoming';
export type PulseStatus = 'open' | 'handled' | 'snoozed';
export type SnoozePreset = 'laterToday' | 'tomorrow' | 'threeDays' | 'sevenDays';
export interface PulseAction {
  key: string; type: PulseType; category: PulseCategory; priority: PulsePriority;
  title: string; reason: string; dueAt?: string; createdFrom: string;
  memberId?: number; memberUid?: string; prospectId?: number; bookingId?: string; taskId?: string; paymentId?: string; subscriptionId?: string;
  destination: HomeDestination; quickActions: { label: string; destination: HomeDestination }[];
  sourceFingerprint: string; group: PulseGroup; state?: PulseStatus; snoozedUntil?: string;
}
export interface PulseFollowup { id: string; memberUid: string; templateName: string; dueDate: string; }
export type PulseInput = Pick<AppState, 'user' | 'currentClub' | 'users' | 'programs' | 'logs' | 'bookings' | 'tasks' | 'messages' | 'prospects' | 'subscriptions' | 'payments'> & { sourceVersions?: Record<string, string> };
export interface PulseActionState { actorUid: string; clubId: string; key: string; sourceFingerprint: string; status: 'handled' | 'snoozed'; snoozedUntil?: string; createdAt: string; updatedAt: string; }
export interface PulseResult { actions: PulseAction[]; total: number; nextCursor: string | null; categories: PulseCategory[]; partialSources: string[]; generatedAt: string; }
export const pulseCategoryLabels: Record<PulseCategory, string> = { clients: 'Clients', coaching: 'Coaching', followup: 'Suivi', messages: 'Messages', tasks: 'Tâches', crm: 'CRM', planning: 'Planning', business: 'Business' };
export const pulsePriorityLabels: Record<PulsePriority, string> = { urgent: 'Urgent', high: 'Prioritaire', normal: 'Normal' };
export const snoozeLabels: Record<SnoozePreset, string> = { laterToday: 'Plus tard aujourd’hui', tomorrow: 'Demain', threeDays: 'Dans 3 jours', sevenDays: 'Dans 7 jours' };
export function snoozeUntil(now: Date, preset: SnoozePreset): string | null {
  const today = parisDateKey(now);
  if (preset === 'laterToday') {
    const end = parisLocalInstant(today, '23:59');
    if (!end) return null;
    const value = Math.min(now.getTime() + 2 * 3600000, end.getTime() + 59000);
    return value > now.getTime() + 1000 ? new Date(value).toISOString() : null;
  }
  const days = { tomorrow: 1, threeDays: 3, sevenDays: 7 }[preset];
  return days ? parisLocalInstant(addParisDays(today, days), '09:00')?.toISOString() || null : null;
}
