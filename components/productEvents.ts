export type ProductEventName =
  | 'coach_signup_completed'
  | 'coach_first_login'
  | 'coach_onboarding_started'
  | 'coach_profile_completed'
  | 'first_member_created'
  | 'first_member_invited'
  | 'first_program_created'
  | 'first_program_assigned'
  | 'first_session_planned'
  | 'coach_onboarding_completed';

/** Lightweight analytics seam. A future analytics provider can subscribe to this event without adding one now. */
export const trackProductEvent = (name: ProductEventName, payload: Record<string, string | number | boolean> = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('velatra:product-event', {
    detail: { name, payload, occurredAt: new Date().toISOString() },
  }));
};

export const trackProductEventOnce = (
  name: ProductEventName,
  userKey: string | number | undefined,
  payload: Record<string, string | number | boolean> = {},
) => {
  if (typeof window === 'undefined' || userKey === undefined || userKey === '') return;
  const key = `velatra:product-event:${name}:${userKey}`;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, '1');
  } catch {
    // Continue without deduplication if browser storage is unavailable.
  }
  trackProductEvent(name, payload);
};

export const requestClubInviteDialog = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('velatra:open-club-invite'));
};
