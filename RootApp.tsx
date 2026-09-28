import React, { Suspense, useLayoutEffect } from 'react';
import './components/mobile-platform.css';
import { useLocation } from 'react-router-dom';
import MarketingSite from './MarketingSite';

const CoachingApp = React.lazy(() => import('./App'));
const applicationPaths = new Set(['/login', '/register', '/dashboard']);

export default function RootApp() {
  const { pathname } = useLocation();
  const isCoachingApp = applicationPaths.has(pathname) || pathname.startsWith('/dashboard/');

  useLayoutEffect(() => {
    if (!isCoachingApp) return;
    const element = document.documentElement;
    const previous = element.getAttribute('data-va-app');
    element.setAttribute('data-va-app', 'true');
    return () => {
      if (previous === null) element.removeAttribute('data-va-app');
      else element.setAttribute('data-va-app', previous);
    };
  }, [isCoachingApp]);

  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f8faf8] text-sm text-zinc-500"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-500" aria-hidden="true" />Chargement de Velatra…</div>}>
    {isCoachingApp ? <CoachingApp /> : <MarketingSite />}
  </Suspense>;
}
