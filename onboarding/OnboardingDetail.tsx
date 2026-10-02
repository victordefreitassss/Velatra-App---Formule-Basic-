import React from 'react';
import type { AppState } from '../types';
import { Card, Button } from '../components/UI';
import { useHomeDestination } from '../components/useHomeDestination';
import { useOnboarding } from './useOnboarding';
import { onboardingLabels } from './onboardingEngine';
import './onboarding.css';
export function OnboardingDetail({ state, setState, memberUid }: { state: AppState; setState: any; memberUid: string }) {
  const feed = useOnboarding(state, { state: 'all', coach: 'all', search: '' }, memberUid), open = useHomeDestination(state, setState), a = feed.assessment;
  return <section className="va-onboarding min-w-0" data-onboarding-detail><Card className="space-y-3 min-w-0">
    <h3 className="text-lg font-semibold">Onboarding</h3>
    {feed.error && <p role="alert">{feed.error}</p>}{feed.loading && <p role="status">Chargement de l’onboarding…</p>}
    {a && <><p data-onboarding-member className="break-words font-semibold">{a.memberName}</p><p className="text-sm text-zinc-700">{a.coachName || 'Coach à affecter'}</p><strong data-onboarding-state={a.state}>{onboardingLabels[a.state]}</strong><p data-onboarding-progress>{a.completedSteps}/{a.totalSteps} étapes satisfaites</p>
    {a.state !== 'COMPLETED' && <><ol className="space-y-2">{a.steps.map(step => <li key={step.id} className="rounded-lg border p-3" data-onboarding-step={step.id} data-step-state={step.state}><strong>{['complete', 'not_required'].includes(step.state) ? '✓ ' : ''}{step.label}</strong><p className="text-sm text-zinc-700">{step.reason}</p></li>)}</ol>
    {a.nextAction && <Button onClick={() => open(a.nextAction!.destination)}>{a.nextAction.label}</Button>}
    {a.partial && <p role="status">Données partielles : les étapes concernées restent inconnues.</p>}</>}
    </>}
    <Button variant="ghost" onClick={feed.refresh}>Actualiser l’onboarding</Button>
  </Card></section>;
}
