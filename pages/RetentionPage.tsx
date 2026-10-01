import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { AppState } from '../types';
import { Button, Card } from '../components/UI';
import { useProductFormat } from '../components/useProductFormat';
import { useHomeDestination } from '../components/useHomeDestination';
import { useRetention } from '../retention/useRetention';
import { RetentionDetail } from '../retention/RetentionDetail';
import { retentionLabels, retentionStates } from '../retention/retentionModel';
import { getRetentionMemberId } from '../components/dashboardNavigation';
import '../retention/retention.css';
export function RetentionPage({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [level, setLevel] = useState('all'), [signal, setSignal] = useState('all'), [coach, setCoach] = useState('all'), [search, setSearch] = useState('');
  const feed = useRetention(state, { state: level, signal, coach, search }), format = useProductFormat(), open = useHomeDestination(state, setState), location = useLocation();
  const memberId = getRetentionMemberId(location.state);
  const selected = state.users.find(item => item.id === memberId && item.clubId === state.user?.clubId && item.role === 'member' && (state.user?.role !== 'coach' || item.assignedCoachUid === state.user.firebaseUid));
  return <div data-retain-page data-format={format} className="va-retain min-w-0 space-y-4 pb-24">
    <header className="space-y-2"><h1>Velatra Retain</h1><p className="text-sm text-zinc-600">Qui nécessite une attention, pourquoi, et quoi faire. Niveaux expliqués par les faits enregistrés.</p></header>
    {selected?.firebaseUid ? <><Button variant="secondary" onClick={() => open({ page: 'retention' })}>Retour au portefeuille Retain</Button><RetentionDetail key={selected.firebaseUid} state={state} setState={setState} memberUid={selected.firebaseUid} /></> : <>
    <nav aria-label="Niveaux Retain" className="flex flex-wrap gap-2">{retentionStates.map(value => <Button key={value} variant={level === value ? 'primary' : 'secondary'} aria-pressed={level === value} onClick={() => setLevel(level === value ? 'all' : value)}>{retentionLabels[value]} · {feed.result?.counts[value] ?? '…'}</Button>)}</nav>
    <Card className="min-w-0 space-y-4"><div className="flex flex-wrap gap-3"><label className="min-w-0 text-sm">Recherche client<input className="block max-w-full rounded-lg border p-2" maxLength={100} value={search} onChange={event => setSearch(event.target.value)} /></label><label className="min-w-0 text-sm">Signal<select className="block max-w-full rounded-lg border p-2" value={signal} onChange={event => setSignal(event.target.value)}><option value="all">Tous</option>{feed.result?.signalTypes.map(value => <option key={value} value={value}>{({ ACTIVITY_STOPPED: 'Séances interrompues', NO_FIRST_ACTIVITY: 'Première séance attendue', ACTIVITY_FREQUENCY_DECLINE: 'Fréquence en baisse', BOOKING_CANCELLATIONS: 'Annulations', CHECKIN_LATE: 'Bilan en retard', FOLLOWUP_REPEATEDLY_MISSED: 'Bilans successifs', HABIT_ENGAGEMENT_DECLINE: 'Habitudes', NO_ACTIVE_PROGRAM: 'Programme absent', PROGRAM_ENDING_WITHOUT_NEXT: 'Suite du programme', VELATRA_INTERACTION_GAP: 'Interaction Velatra', PAYMENT_CONTEXT: 'Paiement · contexte', RENEWAL_WINDOW: 'Renouvellement' })[value]}</option>)}</select></label>
    {state.user?.role !== 'coach' && state.currentClub?.accountType === 'studio' && <label className="text-sm">Coach<select className="block rounded-lg border p-2" value={coach} onChange={event => setCoach(event.target.value)}><option value="all">Tous les coachs</option>{feed.result?.coaches.map(item => <option key={item.uid} value={item.uid}>{item.name}</option>)}</select></label>}<Button variant="ghost" onClick={feed.refresh}>Actualiser Retain</Button></div>
    {feed.error && <p role="alert">{feed.error}</p>}{feed.loading && <p role="status">Chargement de Retain…</p>}{!!feed.result?.partialSources.length && <p role="status">Certaines données sont partielles. Les niveaux concernés restent insuffisants.</p>}
    {feed.result && <p className="text-sm">{feed.result.total} client(s) dans cette vue. Les clients en pause sont exclus du portefeuille actif.</p>}
    {feed.result?.total === 0 && <p>Aucun client dans cette vue.</p>}
    <ul className="va-retain-list space-y-3">{feed.result?.assessments.map(a => <li key={a.memberUid} data-retain-card className="min-w-0 rounded-xl border p-4 space-y-3"><div className="space-y-1"><h2 className="break-words text-base font-semibold">{a.memberName}</h2><strong data-retain-state={a.state} className="text-sm">{retentionLabels[a.state]}</strong></div><ul className="text-sm space-y-1">{a.signals.filter(s => s.family !== 'BILLING').slice(0, 2).map((s, index) => <li key={index}>{s.evidence}</li>)}</ul>{!a.signals.filter(s => s.family !== 'BILLING').length && <p className="text-sm">{a.state === 'insufficient_data' ? 'Historique encore insuffisant.' : 'Aucun signal significatif enregistré.'}</p>}<div className="flex flex-wrap gap-2"><Button onClick={() => open({ page: 'retention', memberId: a.memberId })}>Voir Retain</Button><Button variant="secondary" onClick={() => open({ page: 'chat', memberId: a.memberId })}>Message</Button></div></li>)}</ul>
    {feed.result?.nextCursor && <Button variant="secondary" disabled={feed.loading} onClick={() => void feed.loadMore()}>Voir les clients suivants</Button>}
    </Card></>}
  </div>;
}
