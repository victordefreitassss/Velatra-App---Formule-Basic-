import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import MarketingSite from './MarketingSite';

const CoachingApp = React.lazy(() => import('./App'));
const applicationPaths = new Set(['/login', '/register', '/dashboard']);

export default function RootApp() {
  const { pathname } = useLocation();
  const isCoachingApp = applicationPaths.has(pathname) || pathname.startsWith('/dashboard/');

  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f8faf8] text-sm text-zinc-500"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-500" aria-hidden="true" />Chargement de Velatra…</div>}>
    {isCoachingApp ? <CoachingApp /> : <MarketingSite />}
  </Suspense>;
}
