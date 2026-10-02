import type { DashboardLocationState } from '../components/dashboardNavigation';
export const notificationCategories = ['MESSAGE', 'PLANNING', 'COACHING', 'FOLLOWUP', 'SALES', 'SYSTEM'] as const;
export type NotificationCategory = typeof notificationCategories[number];
export type NotificationDestination = DashboardLocationState;
export interface NotificationV2 {
  id: string; clubId: string; recipientUid: string; category: NotificationCategory; type: string;
  title: string; body: string; destination: NotificationDestination;
  sourceType?: string; sourceId?: string; eventKey: string; createdAt: string; readAt: string | null;
  priority: 'normal' | 'high'; pushEligible: boolean;
}
export interface NotificationPreferences { pushEnabled: boolean; categories: Record<NotificationCategory, boolean> }
export const defaultPreferences = (): NotificationPreferences => ({ pushEnabled: false, categories: { MESSAGE: true, PLANNING: true, COACHING: true, FOLLOWUP: true, SALES: true, SYSTEM: true } });
export const categoryLabels: Record<NotificationCategory, string> = { MESSAGE: 'Messages', PLANNING: 'Planning', COACHING: 'Coaching', FOLLOWUP: 'Suivi', SALES: 'Commercial', SYSTEM: 'Système' };
export function safeNotificationDestination(value: unknown): NotificationDestination | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const positive = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) > 0;
  const safeId = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
  if (input.velatraPage === 'chat') return { velatraPage: 'chat', ...(positive(input.conversationMemberId) ? { conversationMemberId: input.conversationMemberId } : {}) };
  if (input.velatraPage === 'calendar') return { velatraPage: 'calendar', ...(safeId(input.planningBookingId) ? { planningBookingId: input.planningBookingId } : {}) };
  if (input.velatraPage === 'coaching') return { velatraPage: 'coaching', ...(safeId(input.followupAssignmentId) ? { followupAssignmentId: input.followupAssignmentId } : {}) };
  if (input.velatraPage === 'users' && positive(input.client360MemberId) && input.client360Section === 'followup') return { velatraPage: 'users', client360MemberId: input.client360MemberId, client360Section: 'followup' };
  if (input.velatraPage === 'notifications') return { velatraPage: 'notifications' };
  return null;
}
