import React, { Suspense, useEffect, useRef } from 'react';
import { browserWarmupHost, schedulePageWarmup, warmupAttempts, warmupTasks } from './pageWarmup';

interface Props {
  page: string; role: string; identity: string; warmup: boolean; children: React.ReactNode;
}
function ReadyPage({ page, role, identity, warmup, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Do not steal focus from navigation, an autofocus field or an open dialog.
    const frame = requestAnimationFrame(() => {
      if (document.activeElement !== document.body || !ref.current) return;
      const target = ref.current.querySelector<HTMLElement>('h1,h2') || ref.current;
      if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!warmup) return;
    return schedulePageWarmup(warmupTasks(role).filter(task => task.key !== page), warmupAttempts(identity), browserWarmupHost());
  }, [page, role, identity, warmup]);
  return <div ref={ref} className="va-page-body">{children}</div>;
}
export function AppPageContent(props: Props) {
  return <div className="va-content max-w-none w-full">
    <Suspense key={props.page} fallback={<div className="va-content-loading" role="status" aria-live="polite"><span className="va-content-loading-dot" aria-hidden="true"/><span>Chargement…</span></div>}>
      <ReadyPage {...props}/>
    </Suspense>
  </div>;
}
export function SessionLoading({ onCancel }: { onCancel: () => void }) {
  return <div className="va-session-loading">
    <span role="status" aria-live="polite">Préparation de votre séance…</span>
    <button type="button" onClick={onCancel}>Annuler</button>
  </div>;
}
