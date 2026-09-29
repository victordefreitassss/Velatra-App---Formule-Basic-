import type { Page } from '../types';

export type DashboardLocationState = {
  velatraPage?: Page;
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

export const getPlanningMemberId = (locationState: unknown): number | null => {
  if (!locationState || typeof locationState !== 'object') return null;
  const state = locationState as DashboardLocationState;
  if (state.velatraPage !== 'calendar') return null;
  const memberId = state.planningMemberId;
  return typeof memberId === 'number' && Number.isSafeInteger(memberId) && memberId > 0 ? memberId : null;
};

export const getClient360MemberId = (locationState: unknown): number | null => {
  if (!locationState || typeof locationState !== 'object') return null;
  const state = locationState as DashboardLocationState;
  if (state.velatraPage !== 'users') return null;
  const memberId = state.client360MemberId;
  return typeof memberId === 'number' && Number.isSafeInteger(memberId) && memberId > 0 ? memberId : null;
};
