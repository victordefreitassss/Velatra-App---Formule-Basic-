import type { Page, Role, User } from '../types';

/** Only the current history entry may carry these short-lived dashboard contexts. */
export type DashboardLocationState = {
  velatraPage: Page;
  planningMemberId?: number;
  client360MemberId?: number;
};

export const createDashboardLocationState = (page: Page): DashboardLocationState => ({ velatraPage: page });

export const createPlanningLocationState = (memberId: number): DashboardLocationState => ({
  velatraPage: 'calendar',
  planningMemberId: memberId,
});

export const createClient360LocationState = (memberId: number): DashboardLocationState => ({
  velatraPage: 'users',
  client360MemberId: memberId,
});

const getMemberId = (locationState: unknown, page: Page, field: 'planningMemberId' | 'client360MemberId'): number | null => {
  if (!locationState || typeof locationState !== 'object') return null;
  const state = locationState as Partial<DashboardLocationState>;
  const memberId = state[field];
  return state.velatraPage === page && typeof memberId === 'number' && Number.isSafeInteger(memberId) && memberId > 0
    ? memberId
    : null;
};

export const getPlanningMemberId = (locationState: unknown): number | null => getMemberId(locationState, 'calendar', 'planningMemberId');
export const getClient360MemberId = (locationState: unknown): number | null => getMemberId(locationState, 'users', 'client360MemberId');

export const resolvePlanningMember = (users: User[], actor: { role?: Role; clubId?: string } | null, locationState: unknown): User | null => {
  if (!actor?.clubId || !['owner', 'coach', 'superadmin'].includes(actor.role || '')) return null;
  const memberId = getPlanningMemberId(locationState);
  return memberId === null ? null : users.find(user =>
    user.role === 'member' && Number(user.id) === memberId && user.clubId === actor.clubId
  ) || null;
};

export const resolveClient360Member = (users: User[], clubId: string | undefined, locationState: unknown): User | null => {
  const memberId = getClient360MemberId(locationState);
  return !clubId || memberId === null ? null : users.find(user =>
    user.role === 'member' && Number(user.id) === memberId && user.clubId === clubId
  ) || null;
};
