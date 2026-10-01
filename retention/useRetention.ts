import { useEffect, useRef, useState, useCallback } from 'react';
import { apiFetch } from '../firebase';
import type { AppState } from '../types';
import type { RetentionResult } from './retentionModel';
export function useRetention(state: AppState, filters: { state: string; signal: string; coach: string; search: string }) {
  const scope = JSON.stringify([state.user?.firebaseUid, state.user?.role, state.user?.clubId, filters]);
  const [view, setView] = useState<{ scope: string; result: RetentionResult | null; loading: boolean; error: string | null }>({ scope: '', result: null, loading: true, error: null });
  const generation = useRef(0), controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async (cursor?: string) => {
    const current = ++generation.current; controller.current?.abort(); controller.current = new AbortController();
    setView(previous => ({ scope, result: cursor && previous.scope === scope ? previous.result : null, loading: true, error: null }));
    try {
      const response = await apiFetch(`/api/retention?${new URLSearchParams({ ...filters, limit: '20', ...(cursor ? { cursor } : {}) })}`, { signal: controller.current.signal });
      if (!response.ok) throw Error((await response.json()).error || 'Retain indisponible'); const result: RetentionResult = await response.json();
      if (current === generation.current) setView(previous => ({ scope, result: cursor && previous.scope === scope && previous.result ? { ...result, assessments: [...previous.result.assessments, ...result.assessments] } : result, loading: false, error: null }));
    } catch (error: any) { if (current === generation.current && error.name !== 'AbortError') setView(previous => ({ ...previous, scope, loading: false, error: error.message })); }
  }, [scope]);
  useEffect(() => { void refresh(); const onFocus = () => void refresh(), timer = window.setInterval(onFocus, 60000); window.addEventListener('focus', onFocus); return () => { generation.current++; controller.current?.abort(); clearInterval(timer); window.removeEventListener('focus', onFocus); }; }, [refresh]);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } const timer = setTimeout(() => void refresh(), 500); return () => clearTimeout(timer); }, [state.users, state.logs, state.programs, state.bookings, state.messages, state.subscriptions]);
  return { ...(view.scope === scope ? view : { result: null, loading: true, error: null }), refresh: () => void refresh(), loadMore: () => view.scope === scope && view.result?.nextCursor && refresh(view.result.nextCursor) };
}
