import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../firebase';
import type { AppState } from '../types';
import { Button, Card } from '../components/UI';
import { useHomeDestination } from '../components/useHomeDestination';
import { interventionLabels, retentionLabels, type InterventionKind, type RetentionAssessment, type RetentionIntervention } from './retentionModel';
import './retention.css';
type Detail = { assessment: RetentionAssessment; interventions: RetentionIntervention[]; interventionsPartial: boolean };
export function RetentionDetail({ state, setState, memberUid, light = false }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; memberUid: string; light?: boolean }) {
  const scope = `${state.user?.firebaseUid}/${state.user?.role}/${state.user?.clubId}/${memberUid}`;
  const [view, setView] = useState<{ scope: string; data: Detail | null; error: string | null }>({ scope: '', data: null, error: null });
  const [retry, setRetry] = useState(0), [busy, setBusy] = useState(false), [kind, setKind] = useState<InterventionKind>('contacted'), [note, setNote] = useState(''), [message, setMessage] = useState('');
  const request = useRef<{ id: string; body: string } | null>(null), mutation = useRef<AbortController | null>(null);
  const open = useHomeDestination(state, setState);
  useEffect(() => { setBusy(false); setMessage(''); setKind('contacted'); setNote(''); request.current = null; mutation.current?.abort(); }, [scope]);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => { try { const response = await apiFetch(`/api/retention/${encodeURIComponent(memberUid)}`, { signal: controller.signal }); if (!response.ok) throw Error((await response.json()).error || 'Détail indisponible'); const data = await response.json(); if (!controller.signal.aborted) setView({ scope, data, error: null }); } catch (error: any) { if (!controller.signal.aborted) setView({ scope, data: null, error: error.message }); } };
    void load(); const timer = setInterval(load, 60000); window.addEventListener('focus', load);
    return () => { controller.abort(); mutation.current?.abort(); clearInterval(timer); window.removeEventListener('focus', load); };
  }, [scope, retry, state.logs, state.programs, state.bookings, state.messages]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true); setMessage('');
    const signature = JSON.stringify([kind, note.trim()]); if (!request.current || request.current.body !== signature) request.current = { id: crypto.randomUUID(), body: signature };
    const controller = new AbortController(); mutation.current = controller;
    try { const response = await apiFetch(`/api/retention/${encodeURIComponent(memberUid)}/interventions`, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: request.current.id, kind, note }) });
      if (!response.ok) throw Error((await response.json()).error || 'Intervention indisponible'); await response.json(); if (!controller.signal.aborted) { request.current = null; setNote(''); setMessage('Intervention enregistrée. Le niveau reste calculé depuis les faits.'); setRetry(value => value + 1); }
    } catch (error: any) { if (!controller.signal.aborted) setMessage(error.message); } finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const current = view.scope === scope ? view : null;
  if (current?.error) return <Card className="va-retain space-y-3"><p role="alert">{current.error}</p><Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Réessayer</Button></Card>;
  if (!current?.data) return <p role="status">Chargement du détail Retain…</p>;
  const { assessment: a, interventions, interventionsPartial } = current.data;
  const engagement = a.signals.filter(signal => signal.family !== 'BILLING'), commercial = a.signals.filter(signal => signal.family === 'BILLING');
  return <div data-retain-detail className="va-retain"><Card className="min-w-0 space-y-4">
    <header className="space-y-2"><h2 className="break-words">{a.memberName} · Rétention</h2><strong data-retain-state={a.state}>{retentionLabels[a.state]}</strong><p className="text-sm text-zinc-600">Des faits à examiner ; aucune prédiction de résiliation.</p></header>
    {a.partial && <p role="status">Historique partiel : le niveau ne peut pas être évalué complètement.</p>}
    {!engagement.length && <p>{a.state === 'insufficient_data' ? 'Historique encore insuffisant pour évaluer l’engagement.' : 'Aucun signal significatif dans les données disponibles.'}</p>}
    <ul className="space-y-3">{engagement.map((signal, index) => <li key={`${signal.type}-${index}`}><h3 className="font-semibold">{signal.title}</h3><p className="text-sm">{signal.evidence}</p><p className="text-xs text-zinc-500">{signal.window} · {signal.source}</p></li>)}</ul>
    {!!commercial.length && <section aria-label="Contexte commercial" className="rounded-lg bg-zinc-50 p-3 space-y-2"><h3>Contexte commercial · Owner</h3>{commercial.map((signal, index) => <p key={index} className="text-sm">{signal.evidence}</p>)}<p className="text-xs">Ce contexte ne modifie pas le niveau d’engagement.</p></section>}
    {!light && <><p className="text-sm">Activité : {a.activity.recent} séance(s) sur 14 jours, contre {a.activity.previous} sur les 14 jours précédents.</p><div className="flex flex-wrap gap-2">{a.suggestedActions.map(action => <Button key={action.label} variant="secondary" onClick={() => open(action.destination)}>{action.label}</Button>)}</div><Button variant="secondary" onClick={() => open({ page: 'users', memberId: a.memberId, section: 'retention' })}>Voir le dossier complet</Button>
    <details><summary className="min-h-11 cursor-pointer font-semibold">Chronologie factuelle · 56 jours</summary><ol className="space-y-2 mt-2">{a.timeline.map((item, index) => <li key={index} className="text-sm">{item.date} · {item.label}</li>)}</ol>{!a.timeline.length && <p className="text-sm">Aucun événement enregistré sur cette fenêtre.</p>}{a.timelineTotal > a.timeline.length && <p className="text-sm">100 derniers événements affichés sur {a.timelineTotal}.</p>}</details></>}
    <section className="space-y-3"><h3 className="font-semibold">Dernières interventions</h3>{!interventions.length && <p className="text-sm">Aucune intervention consignée.</p>}<ul className="space-y-2">{interventions.slice(0, light ? 3 : 10).map(item => <li key={item.id} className="rounded-lg bg-zinc-50 p-3 text-sm"><strong>{interventionLabels[item.kind]}</strong> · {new Date(item.createdAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}{item.note && <p className="whitespace-pre-wrap">{item.note}</p>}</li>)}</ul>{interventionsPartial && <p className="text-sm">Historique des interventions partiel.</p>}</section>
    <form onSubmit={save} className="space-y-3"><h3 className="font-semibold">Consigner une intervention</h3><label className="block text-sm">Action<select aria-label="Type d’intervention" className="block w-full rounded-lg border p-2" value={kind} onChange={event => setKind(event.target.value as InterventionKind)}>{Object.entries(interventionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm">Note optionnelle<textarea className="block w-full rounded-lg border p-2" rows={3} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></label><Button disabled={busy} type="submit">{busy ? 'Enregistrement…' : 'Enregistrer l’intervention'}</Button><p className="text-xs text-zinc-600">Une intervention ne résout pas automatiquement les signaux.</p>{message && <p role="status" className="text-sm">{message}</p>}</form>
    <p className="text-xs text-zinc-500">Évalué le {new Date(a.evaluatedAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
  </Card></div>;
}
