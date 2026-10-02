import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { AppState } from '../types';
import { Card, Button } from '../components/UI';
import { useProductFormat } from '../components/useProductFormat';
import { useHomeDestination } from '../components/useHomeDestination';
import { getOnboardingMemberId } from '../components/dashboardNavigation';
import { OnboardingDetail } from '../onboarding/OnboardingDetail';
import { useOnboarding } from '../onboarding/useOnboarding';
import { onboardingStates, onboardingLabels } from '../onboarding/onboardingEngine';
import '../onboarding/onboarding.css';
export function OnboardingPage({ state, setState }: { state: AppState; setState: any }) {
  const [level, setLevel] = useState('active'), [coach, setCoach] = useState('all'), [search, setSearch] = useState('');
  const format = useProductFormat(), open = useHomeDestination(state, setState), location = useLocation();
  const feed = useOnboarding(state, { state: level, coach, search }), memberId = getOnboardingMemberId(location.state);
  const selected = state.users.find(u => u.role === 'member' && u.id === memberId && u.clubId === state.user?.clubId && (state.user?.role !== 'coach' || u.assignedCoachUid === state.user.firebaseUid));
  return <div className="va-onboarding min-w-0 space-y-4 pb-24" data-onboarding-page data-format={format}>
    <header><h1>Onboarding Center</h1><p className="text-sm text-zinc-700">Du client créé à sa première séance, à partir des faits enregistrés.</p></header>
    {selected?.firebaseUid ? <><Button variant="secondary" onClick={() => open({ page: 'onboarding' })}>Retour aux onboardings</Button><OnboardingDetail key={selected.firebaseUid} memberUid={selected.firebaseUid} state={state} setState={setState} /></> : <Card className="min-w-0 space-y-4">
      <div className="flex flex-wrap gap-3"><label className="text-sm min-w-0">Client<input aria-label="Rechercher un client en onboarding" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} /></label>
      <label className="text-sm">État<select aria-label="État onboarding" value={level} onChange={e => setLevel(e.target.value)}><option value="active">À poursuivre</option><option value="all">Tous les clients</option>{onboardingStates.map(s => <option key={s} value={s}>{onboardingLabels[s]}</option>)}</select></label>
      {state.user?.role !== 'coach' && state.currentClub?.accountType === 'studio' && <label className="text-sm">Coach<select aria-label="Coach onboarding" value={coach} onChange={e => setCoach(e.target.value)}><option value="all">Tous</option>{feed.result?.coaches.map(c => <option key={c.uid} value={c.uid}>{c.name}</option>)}</select></label>}
      <Button variant="ghost" onClick={feed.refresh}>Actualiser</Button></div>
      {feed.error && <p role="alert">{feed.error}</p>}{feed.loading && <p role="status">Chargement de l’onboarding…</p>}{!!feed.result?.partialSources.length && <p role="status">Données partielles : vérification nécessaire.</p>}
      {feed.result && <p className="text-sm">{feed.result.total} client(s) dans cette vue</p>}
      {feed.result?.total === 0 && <p>Aucun onboarding à poursuivre dans cette vue.</p>}
      <ul className="va-onboarding-list space-y-3">{feed.result?.assessments.map(a => <li key={a.memberUid} data-onboarding-card className="min-w-0 space-y-3 rounded-xl border p-4"><div><h2 className="break-words text-base font-semibold">{a.memberName}</h2><p data-onboarding-state={a.state} className="text-sm">{onboardingLabels[a.state]}</p><p className="text-sm">{a.coachName || 'Coach à affecter'} · <span data-onboarding-progress>{a.completedSteps}/{a.totalSteps}</span></p></div><p className="text-sm">{a.nextAction?.label || 'Première séance réalisée et étapes satisfaites.'}</p><Button onClick={() => open({ page: 'onboarding', memberId: a.memberId })}>{a.state === 'COMPLETED' ? 'Voir le parcours' : 'Continuer'}</Button></li>)}</ul>
      {feed.result?.nextCursor && <Button variant="secondary" disabled={feed.loading} onClick={feed.more}>Voir les clients suivants</Button>}
    </Card>}
  </div>;
}
