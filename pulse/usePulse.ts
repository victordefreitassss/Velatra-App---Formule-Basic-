import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState } from '../types';
import { apiFetch } from '../firebase';
import type { PulseAction, PulseResult, PulseStatus, PulseGroup, PulseCategory, SnoozePreset } from './pulseModel';
export function usePulse(state: AppState, options: { limit: number; status?: PulseStatus; group?: PulseGroup | 'all'; category?: PulseCategory | 'all' }) {
  const identity = `${state.user?.firebaseUid}/${state.user?.role}/${state.user?.clubId}`;
  const { limit, status = 'open', group = 'all', category = 'all' } = options;
  const scope = `${identity}/${limit}/${status}/${group}/${category}`;
  const [view, setView] = useState<{ scope: string; result: PulseResult | null; loading: boolean; error: string | null }>({ scope: '', result: null, loading: true, error: null });
  const [busy, setBusy] = useState<string | null>(null), [retry, setRetry] = useState(0);
  const generation = useRef(0), controller = useRef<AbortController | null>(null), mutationController = useRef<AbortController | null>(null);
  const fetchPage = useCallback(async (cursor?: string) => {
    const current = ++generation.current;
    controller.current?.abort(); controller.current = new AbortController();
    setView(previous => ({ scope, result: cursor && previous.scope === scope ? previous.result : null, loading: true, error: null }));
    try {
      const params = new URLSearchParams({ limit: String(limit), status, group, category, ...(cursor ? { cursor } : {}) });
      const response = await apiFetch(`/api/pulse?${params}`, { signal: controller.current.signal });
      if (!response.ok) throw new Error((await response.json()).error || 'Pulse indisponible');
      const result: PulseResult = await response.json();
      if (current === generation.current) setView(previous => ({ scope, result: cursor && previous.scope === scope && previous.result ? { ...result, actions: [...previous.result.actions, ...result.actions] } : result, loading: false, error: null }));
    } catch (error: any) {
      if (current === generation.current && error.name !== 'AbortError') setView(previous => ({ ...previous, scope, loading: false, error: error.message }));
    }
  }, [scope]);
  useEffect(() => { setBusy(null); mutationController.current?.abort(); void fetchPage(); return () => { generation.current++; controller.current?.abort(); mutationController.current?.abort(); }; }, [fetchPage, retry]);
  useEffect(() => {
    const refresh = () => void fetchPage();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [fetchPage]);
  const sourceVersion = useRef<unknown[]>([]);
  useEffect(() => {
    const sources = [state.users, state.programs, state.logs, state.tasks, state.messages, state.bookings, state.prospects, state.subscriptions, state.payments];
    const changed = sourceVersion.current.length && sources.some((item, i) => item !== sourceVersion.current[i]);
    sourceVersion.current = sources;
    if (changed) { const timer = window.setTimeout(() => void fetchPage(), 500); return () => clearTimeout(timer); }
  }, [state.users, state.programs, state.logs, state.tasks, state.messages, state.bookings, state.prospects, state.subscriptions, state.payments, fetchPage]);
  const act = async (action: PulseAction, preset?: SnoozePreset) => {
    if (busy) return;
    const actionScope = scope;
    setBusy(action.key); const mutation = new AbortController(); mutationController.current = mutation;
    try {
      const response = await apiFetch(`/api/pulse/${encodeURIComponent(action.key)}/${preset ? 'snooze' : 'handled'}`, {
        method: 'POST', signal: mutation.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceFingerprint: action.sourceFingerprint, ...(preset ? { preset } : {}) }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Action indisponible');
      if (!mutation.signal.aborted) await fetchPage();
    } catch (error: any) {
      if (!mutation.signal.aborted && error.name !== 'AbortError') setView(previous => previous.scope === actionScope ? { ...previous, error: error.message } : previous);
    } finally { if (!mutation.signal.aborted) setBusy(null); }
  };
  const current = view.scope === scope ? view : { result: null, loading: true, error: null };
  return { ...current, busy, act, refresh: () => setRetry(value => value + 1), loadMore: () => current.result?.nextCursor && fetchPage(current.result.nextCursor) };
}
