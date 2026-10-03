import type { Page, Role, User } from '../types';

/** Only the current history entry may carry these short-lived dashboard contexts. */
export type DashboardLocationState = {
  velatraPage: Page;
  planningMemberId?: number;
  retentionMemberId?: number;
  onboardingMemberId?: number;
  client360MemberId?: number;
  client360Section?: import('./client360').Client360SectionId;
  client360AdminSection?: import('./client360').Client360AdminSectionId;
  focusNote?: boolean;
  focusCoachAssignment?: boolean;
  planningBookingId?: string;
  taskId?: string;
  conversationMemberId?: number;
  followupAssignmentId?: string;
};

export const createDashboardLocationState = (page: Page): DashboardLocationState => ({ velatraPage: page });

export const createPlanningLocationState = (memberId: number): DashboardLocationState => ({
  velatraPage: 'calendar',
  planningMemberId: memberId,
});

export const createClient360LocationState = (memberId: number, section?: DashboardLocationState['client360Section'], focusNote?: boolean, adminSection?: import('./client360').Client360AdminSectionId): DashboardLocationState => ({
  velatraPage: 'users',
  client360MemberId: memberId,
  ...(section ? { client360Section: section } : {}),
  ...(section === 'administrative' && adminSection ? { client360AdminSection: adminSection } : {}),
  ...(section === 'followup' && focusNote ? { focusNote: true } : {}),
});
export const createPlanningBookingLocationState = (bookingId: string): DashboardLocationState => ({ velatraPage: 'calendar', planningBookingId: bookingId });
export const createTaskLocationState = (taskId: string): DashboardLocationState => ({ velatraPage: 'crm_tasks', taskId });
export const createMessageLocationState = (memberId: number): DashboardLocationState => ({ velatraPage: 'chat', conversationMemberId: memberId });
const getRecordId = (value: unknown, page: Page, field: 'planningBookingId' | 'taskId') => {
  const state = value as DashboardLocationState | null;
  return state?.velatraPage === page && typeof state[field] === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(state[field]!) ? state[field]! : null;
};
export const getPlanningBookingId = (value: unknown) => getRecordId(value, 'calendar', 'planningBookingId');
export const getTaskId = (value: unknown) => getRecordId(value, 'crm_tasks', 'taskId');
export const getClient360Section = (value: unknown) => {
  const state = value as DashboardLocationState | null;
  return state?.velatraPage === 'users' && ['overview', 'onboarding', 'retention', 'coaching', 'progress', 'nutrition', 'calendar', 'followup', 'communication', 'administrative'].includes(state.client360Section || '') ? state.client360Section : undefined;
};
export const shouldFocusClientNote = (value: unknown) => getClient360Section(value) === 'followup' && (value as DashboardLocationState).focusNote === true;

const getMemberId = (locationState: unknown, page: Page, field: 'onboardingMemberId' | 'retentionMemberId' | 'planningMemberId' | 'client360MemberId' | 'conversationMemberId'): number | null => {
  if (!locationState || typeof locationState !== 'object') return null;
  const state = locationState as Partial<DashboardLocationState>;
  const memberId = state[field];
  return state.velatraPage === page && typeof memberId === 'number' && Number.isSafeInteger(memberId) && memberId > 0
    ? memberId
    : null;
};

export const getPlanningMemberId = (locationState: unknown): number | null => getMemberId(locationState, 'calendar', 'planningMemberId');
export const getClient360MemberId = (locationState: unknown): number | null => getMemberId(locationState, 'users', 'client360MemberId');
export const getConversationMemberId = (value: unknown): number | null => getMemberId(value, 'chat', 'conversationMemberId');

export const resolvePlanningMember = (users: User[], actor: { role?: Role; clubId?: string; firebaseUid?: string } | null, locationState: unknown): User | null => {
  if (!actor?.clubId || !['owner', 'manager', 'coach', 'superadmin'].includes(actor.role || '')) return null;
  const memberId = getPlanningMemberId(locationState);
  return memberId === null ? null : users.find(user =>
    user.role === 'member' && Number(user.id) === memberId && user.clubId === actor.clubId && (actor.role !== 'coach' || !!actor.firebaseUid && user.assignedCoachUid === actor.firebaseUid)
  ) || null;
};

export const resolveClient360Member = (users: User[], clubId: string | undefined, locationState: unknown, actor?: Pick<User, 'role' | 'firebaseUid'> | null): User | null => {
  const memberId = getClient360MemberId(locationState);
  return !clubId || memberId === null ? null : users.find(user =>
    user.role === 'member' && Number(user.id) === memberId && user.clubId === clubId && (actor?.role !== 'coach' || !!actor.firebaseUid && user.assignedCoachUid === actor.firebaseUid)
  ) || null;
};

export const getClient360AdminSection = (value: unknown) => getClient360Section(value) === 'administrative' && ['profile', 'billing', 'documents'].includes((value as DashboardLocationState).client360AdminSection || '') ? (value as DashboardLocationState).client360AdminSection : undefined;

export const getRetentionMemberId = (value: unknown) => getMemberId(value, 'retention', 'retentionMemberId');
export const createRetentionLocationState = (memberId: number): DashboardLocationState => ({ velatraPage: 'retention', retentionMemberId: memberId });

export const getOnboardingMemberId = (value: unknown) => getMemberId(value, 'onboarding', 'onboardingMemberId');
export const createOnboardingLocationState = (memberId: number): DashboardLocationState => ({ velatraPage: 'onboarding', onboardingMemberId: memberId });
