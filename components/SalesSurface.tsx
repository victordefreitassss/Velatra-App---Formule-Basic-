import '../sales/sales.css';
import React, { useEffect, useRef, useState } from 'react';
import type { AppState, AttendanceStatus, Booking, Prospect } from '../types';
import type { SalesOverview } from '../sales/salesEngine';
import { attendance, attendanceLabels, trialGroupLabels, type TrialGroup } from '../sales/salesModel';
import { addParisDays, parisDateKey } from './planningSlots';
import { apiFetch } from '../firebase';
export const salesRequest = async (url: string, body?: unknown, signal?: AbortSignal) => {
  const res = await apiFetch(url, body === undefined ? { signal } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Sales indisponible.');
  return result;
};
const button = 'min-h-[44px] rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50';
const date = (value: string) => new Date(value).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export function TrialAttendanceControls({ booking: original, state, setState, onChanged }: { booking: Booking; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onChanged?: () => void }) {
  const current = state.bookings.find(b => b.id === original.id) || original;
  const [saved, setSaved] = useState<Booking | null>(null);
  const booking = saved && (!current.attendanceUpdatedAt || (saved.attendanceUpdatedAt || '') >= current.attendanceUpdatedAt) ? saved : current;
  useEffect(() => { setSaved(null); }, [original.id, state.user?.firebaseUid, state.user?.clubId]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [correction, setCorrection] = useState<AttendanceStatus | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null), previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!correction) return;
    previousFocus.current = document.activeElement as HTMLElement;
    confirmRef.current?.focus();
    return () => previousFocus.current?.focus();
  }, [correction]);
  const identity = `${state.user?.firebaseUid}:${state.user?.clubId}`, identityRef = useRef(identity); identityRef.current = identity;
  const value = attendance(booking), own = state.user?.role !== 'coach' || (booking.coachUid ? booking.coachUid === state.user.firebaseUid : [state.user.firebaseUid, String(state.user.id)].includes(booking.coachId));
  const allowed = !!state.user && ['owner', 'manager', 'coach'].includes(state.user.role) && own && state.user.clubId === booking.clubId;
  const future = Date.parse(booking.startTime) > Date.now();
  const save = async (target: AttendanceStatus) => {
    setBusy(true); setError('');
    try { const result = await salesRequest(`/api/bookings/${encodeURIComponent(booking.id)}/attendance`, { attendanceStatus: target });
      if (identityRef.current !== identity) return;
      setSaved(result.booking); setState(prev => ({ ...prev, bookings: prev.bookings.map(b => b.id === booking.id ? result.booking : b) })); setCorrection(null); onChanged?.();
    } catch (e: any) { if (identityRef.current === identity) setError(e.message); } finally { setBusy(false); }
  };
  const choose = (target: AttendanceStatus) => value !== 'PENDING' && value !== target ? setCorrection(target) : save(target);
  return <section data-sales-attendance={booking.id} className="space-y-2 rounded-xl border border-zinc-200 p-3">
    <p className="font-semibold">Présence : {attendanceLabels[value]}</p>
    {future && <p className="text-sm text-zinc-600">Saisie disponible au début de l’essai.</p>}
    {allowed && value !== 'CANCELLED' && <div className="flex flex-wrap gap-2">
      <button className={button} disabled={busy || future || value === 'SHOWED_UP'} onClick={() => choose('SHOWED_UP' as AttendanceStatus)}>Présent</button>
      <button className={button} disabled={busy || future || value === 'NO_SHOW'} onClick={() => choose('NO_SHOW' as AttendanceStatus)}>No-show</button>
    </div>}
    {correction && <div role="alertdialog" aria-label="Confirmer la correction de présence" onKeyDown={e => { if (e.key === 'Escape') setCorrection(null); if (e.key === 'Tab') { e.preventDefault(); const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button')); buttons[(buttons.indexOf(document.activeElement as HTMLButtonElement) + 1) % buttons.length]?.focus(); } }} className="space-y-2 rounded-lg bg-zinc-50 p-3">
      <p>Corriger « {attendanceLabels[value]} » en « {attendanceLabels[correction]} » ? Cette correction sera conservée dans l’historique.</p>
      <div className="flex flex-wrap gap-2"><button ref={confirmRef} className={button} disabled={busy} onClick={() => save(correction)}>Confirmer la correction</button><button className={button} disabled={busy} onClick={() => setCorrection(null)}>Annuler la correction</button></div>
    </div>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
  </section>;
}
interface TrialRow { booking: Booking; group: TrialGroup; prospectUid: string | null; prospectName: string; coachName: string; }
function useSales(url: string, identity: string, revision: number) {
  const [result, setResult] = useState<any>(null), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    setResult(null); setError('');
    const reload = () => salesRequest(url, undefined, controller.signal).then(r => { if (active) { setResult(r); setError(''); } }).catch(e => { if (active && e.name !== 'AbortError') setError(e.message); });
    reload(); const timer = setInterval(reload, 60000); window.addEventListener('focus', reload);
    return () => { active = false; controller.abort(); clearInterval(timer); window.removeEventListener('focus', reload); };
  }, [url, identity, revision]);
  return { result, error };
}
export function SalesSurface({ tab, state, setState, onProspect }: { tab: 'trials' | 'performance'; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onProspect: (uid: string) => void }) {
  const today = parisDateKey(new Date()), [from, setFrom] = useState(addParisDays(today, -29)), [to, setTo] = useState(today);
  const [group, setGroup] = useState<TrialGroup>('missing'), [offset, setOffset] = useState(0), [revision, setRevision] = useState(0);
  const identity = `${state.user?.firebaseUid}:${state.user?.clubId}`;
  const url = tab === 'performance' ? `/api/sales/overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : `/api/sales/trials?group=${group}&offset=${offset}&limit=20`;
  const { result, error } = useSales(url, identity, revision);
  const overview = result as SalesOverview;
  const rateLabels = { leadContacted: 'Lead → contacté', leadBooked: 'Lead → essai réservé', bookedShowed: 'Essai réservé → présent', showedConverted: 'Présent → adhérent', leadConverted: 'Lead → adhérent' };
  return <section data-sales-tab={tab} className="space-y-4 text-zinc-900 min-w-0">
    <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold mr-auto">{tab === 'performance' ? 'Performance commerciale' : 'Essais · actions du jour'}</h2><button className={button} onClick={() => setRevision(r => r + 1)}>Actualiser Sales</button></div>
    {tab === 'performance' ? <div className="flex flex-wrap gap-2 items-end">
      {[7, 30, 90].map(days => <button key={days} className={button} onClick={() => { setFrom(addParisDays(today, 1 - days)); setTo(today); }}>{days} jours</button>)}
      <label className="text-sm">Du (inclus)<input aria-label="Début de cohorte" type="date" className="block min-h-[44px] rounded-lg border p-2 max-w-full" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label className="text-sm">Au (inclus)<input aria-label="Fin de cohorte" type="date" className="block min-h-[44px] rounded-lg border p-2 max-w-full" value={to} onChange={e => setTo(e.target.value)} /></label>
      <p className="w-full text-sm text-zinc-600">Prospects créés pendant cette période · Europe/Paris · Conversions observées à ce jour.</p>
    </div> : <div className="flex flex-wrap gap-2" aria-label="Filtrer les essais">{Object.entries(trialGroupLabels).map(([key, label]) => <button key={key} aria-pressed={group === key} className={button} onClick={() => { setGroup(key as TrialGroup); setOffset(0); }}>{label}</button>)}</div>}
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {!result && !error && <p role="status">Chargement Sales…</p>}
    {result?.partial && <p role="status" className="rounded-lg border border-amber-300 p-3">Données partielles : {result.partialSources?.join(', ')}. Les totaux portent sur les documents accessibles dans les limites annoncées.</p>}
    {result && tab === 'trials' && <>
      <p>{result.total || 0} essais · 20 par page</p>
      {!(result.trials || []).length && <p>Aucun essai dans cette catégorie.</p>}
      <div className="grid gap-3 lg:grid-cols-2">{(result.trials || []).map((row: TrialRow) => <article key={row.booking.id} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 min-w-0">
        <p className="font-bold break-words">{row.prospectName}</p><p className="text-sm">{date(row.booking.startTime)} · {row.coachName}</p>
        <TrialAttendanceControls booking={row.booking} state={state} setState={setState} onChanged={() => setRevision(r => r + 1)} />
        {row.prospectUid && state.user?.role !== 'coach' && <button className={button} onClick={() => onProspect(row.prospectUid!)}>Ouvrir le prospect / relancer</button>}
        {row.booking.status === 'confirmed' && attendance(row.booking) === 'PENDING' && <button className={button} onClick={async () => { try { await salesRequest('/api/bookings/cancel', { id: row.booking.id }); setRevision(r => r + 1); } catch (e: any) { window.alert(e.message); } }}>Annuler l’essai</button>}
      </article>)}</div>
      <div className="flex gap-2"><button className={button} disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Page précédente</button><button className={button} disabled={offset + 20 >= (result.total || 0)} onClick={() => setOffset(offset + 20)}>Page suivante</button></div>
    </>}
    {result && tab === 'performance' && overview.funnel && <>
      <div data-sales-funnel className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{Object.entries({ leads: 'Leads créés', contacted: 'Contactés', booked: 'Essai réservé', showed: 'Présents', converted: 'Convertis', lost: 'Perdus (séparément)' }).map(([key, label]) => <div key={key} className="rounded-xl border bg-white p-3"><p className="text-sm">{label}</p><p className="text-2xl font-bold">{overview.funnel[key as keyof typeof overview.funnel]}</p></div>)}</div>
      <div className="rounded-xl border bg-white p-4 space-y-2">{Object.entries(overview.rates).map(([key, rate]) => <p key={key}>{rateLabels[key as keyof typeof rateLabels]} : {rate.percent}% ({rate.numerator}/{rate.denominator})</p>)}<p>No-show : {overview.attendance.noShowRate.percent}% ({overview.attendance.noShowRate.numerator}/{overview.attendance.noShowRate.denominator} présences finalisées hors annulation)</p></div>
      <p data-sales-quality className="text-sm">{overview.dataQuality.unknownAttendance} essais historiques sans présence renseignée · {overview.dataQuality.unlinkedTrials} essais sans lien prospect fiable · {overview.dataQuality.invalidLeadDates} dates de création inconnues.</p>
      <h3 className="font-bold">Sources · même cohorte</h3><div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-sm"><thead><tr>{['Source', 'Leads', 'Réservés', 'Présents', 'Convertis', 'Lead → adhérent'].map(h => <th key={h} className="text-left p-3 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{overview.sources.map(row => <tr key={row.source}><td className="p-3">{row.source}</td>{[row.leads, row.booked, row.showed, row.converted].map((n, i) => <td key={i} className="p-3">{n}</td>)}<td className="p-3">{row.conversion.percent}% ({row.conversion.numerator}/{row.conversion.denominator})</td></tr>)}</tbody></table></div>
      {state.currentClub?.accountType === 'studio' && <><h3 className="font-bold">Résultats opérationnels par Coach</h3><p className="text-sm">Conversions liées au dernier essai présent avant conversion. Taux par prospects distincts ; volumes de présence par rendez-vous.</p><div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-sm"><thead><tr>{['Coach', 'Essais réalisés', 'No-shows', 'Conversions liées', 'Présent → adhérent'].map(h => <th key={h} className="p-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{overview.coaches.map(row => <tr key={row.coachUid || 'unassigned'}><td className="p-3">{row.name}</td><td className="p-3">{row.showed}</td><td className="p-3">{row.noShow}</td><td className="p-3">{row.conversions}</td><td className="p-3">{row.conversion.percent}% ({row.conversion.numerator}/{row.conversion.denominator})</td></tr>)}</tbody></table></div></>}
    </>}
  </section>;
}
export function ProspectSalesDetail({ prospect, state, setState, onAction }: { prospect: Prospect; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onAction: (status: string) => void }) {
  const [revision, setRevision] = useState(0), [offset, setOffset] = useState(0), [error, setError] = useState('');
  const { result, error: loadError } = useSales(`/api/sales/trials?prospectUid=${encodeURIComponent(prospect.firebaseUid || '')}&offset=${offset}&limit=20`, `${state.user?.firebaseUid}:${state.user?.clubId}`, revision);
  const rows: TrialRow[] = result?.trials || [];
  return <section className="space-y-3" data-sales-prospect><h3 className="font-bold">Essais et présence</h3>
    {loadError && <p role="alert">{loadError}</p>}{result?.partial && <p>Données partielles.</p>}
    {state.currentClub?.accountType === 'studio' && <label className="block text-sm">Responsable commercial<select aria-label="Responsable du prospect" value={prospect.assignedCoachUid || ''} disabled={!!prospect.convertedMemberUid} className="block w-full min-h-[44px] border rounded-lg p-2" onChange={async e => { try { const r = await salesRequest(`/api/sales/prospects/${prospect.firebaseUid}/assignment`, { coachUid: e.target.value || null }); setState(prev => ({ ...prev, prospects: prev.prospects.map(p => p.firebaseUid === prospect.firebaseUid ? r.prospect : p) })); setError(''); } catch (err: any) { setError(err.message); } }}><option value="">Non attribué</option>{state.users.filter(u => u.role === 'coach' && u.clubId === prospect.clubId && !u.isSuspended).map(u => <option key={u.firebaseUid} value={u.firebaseUid}>{u.name}</option>)}</select></label>}
    {state.currentClub?.accountType === 'solo' && <p className="text-sm">Responsable : Owner Solo</p>}
    {error && <p role="alert">{error}</p>}
    {!rows.length && <p className="text-sm">Aucun essai enregistré.</p>}
    {rows.map((row, i) => <div key={row.booking.id} className="space-y-2"><p className="text-sm">{i === 0 && offset === 0 ? 'Dernier résultat · ' : ''}{date(row.booking.startTime)} · {row.coachName}</p><TrialAttendanceControls booking={row.booking} state={state} setState={setState} onChanged={() => setRevision(r => r + 1)} /></div>)}
    {(result?.total || 0) > 20 && <div className="flex flex-wrap gap-2"><button className={button} disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Essais précédents</button><button className={button} disabled={offset + 20 >= result.total} onClick={() => setOffset(offset + 20)}>Essais suivants</button></div>}
    {!prospect.convertedMemberUid && prospect.status !== 'won' && <div className="flex flex-wrap gap-2"><button className={button} onClick={() => onAction('won')}>Convertir en adhérent</button><button className={button} onClick={() => onAction('call_pending')}>Planifier une relance</button><button className={button} onClick={() => onAction('trial')}>Reprogrammer un essai</button><button className={button} onClick={() => onAction('lost')}>Classer perdu</button></div>}
  </section>;
}
