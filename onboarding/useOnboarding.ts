import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../firebase';
import type { AppState } from '../types';
import type { MemberOnboardingAssessment } from './onboardingEngine';
export interface OnboardingResult { assessments: MemberOnboardingAssessment[]; total: number; activeTotal: number; coaches: { uid: string; name: string }[]; partialSources: string[]; nextCursor: string | null; }
export function useOnboarding(state: AppState, filters: { state: string; coach: string; search: string }, memberUid?: string) {
  const scope = JSON.stringify([state.user?.firebaseUid, state.user?.role, state.user?.clubId, filters, memberUid]);
  const [view, setView] = useState<{ scope: string; result: OnboardingResult | null; assessment: MemberOnboardingAssessment | null; error: string | null; loading: boolean }>({ scope: '', result: null, assessment: null, loading: true, error: null });
  const version = useRef(0), request = useRef<AbortController | null>(null);
  const refresh = useCallback(async (cursor?: string) => {
    const current = ++version.current; request.current?.abort(); request.current = new AbortController();
    setView(previous => ({ ...previous, scope, loading: true, error: null, result: cursor && previous.scope === scope ? previous.result : null, assessment: null }));
    try {
      const url = memberUid ? `/api/onboarding/${encodeURIComponent(memberUid)}` : `/api/onboarding?${new URLSearchParams({ ...filters, limit: '20', ...(cursor ? { cursor } : {}) })}`;
      const response = await apiFetch(url, { signal: request.current.signal }), result = await response.json();
      if (!response.ok) throw Error(result.error || 'Onboarding indisponible.');
      if (current === version.current) setView(previous => ({ scope, loading: false, error: null, assessment: result.assessment || null, result: Array.isArray(result.assessments) ? { ...result, assessments: cursor && previous.scope === scope && previous.result ? [...previous.result.assessments, ...result.assessments] : result.assessments } : null }));
    } catch (e: any) { if (current === version.current && e.name !== 'AbortError') setView(previous => ({ ...previous, scope, loading: false, error: e.message })); }
  }, [scope]);
  useEffect(() => { void refresh(); const focus = () => void refresh(), timer = window.setInterval(focus, 60000); window.addEventListener('focus', focus); return () => { version.current++; request.current?.abort(); clearInterval(timer); window.removeEventListener('focus', focus); }; }, [refresh]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 350); return () => clearTimeout(timer); }, [state.users, state.programs, state.logs, state.bookings, state.prospects, state.currentClub?.settings?.onboarding]);
  return { ...(view.scope === scope ? view : { result: null, assessment: null, loading: true, error: null }), refresh: () => void refresh(), more: () => view.scope === scope && view.result?.nextCursor && void refresh(view.result.nextCursor) };
}
