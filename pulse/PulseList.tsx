import React, { useState } from 'react';
import { Button } from '../components/UI';
import type { HomeDestination } from '../components/experienceHomeSelectors';
import { pulsePriorityLabels, snoozeLabels, type PulseAction, type SnoozePreset } from './pulseModel';
import type { usePulse } from './usePulse';
type Feed = ReturnType<typeof usePulse>;
function ActionCard({ action, feed, open }: { action: PulseAction; feed: Feed; open: (destination: HomeDestination) => void }) {
  const [preset, setPreset] = useState<SnoozePreset>('tomorrow');
  const status = action.state || 'open';
  const legacyType = action.type.startsWith('TASK_') ? 'task' : action.type === 'FOLLOWUP_DUE' || action.type === 'FOLLOWUP_LATE' ? 'checkIn' : action.type === 'PROGRAM_MISSING' ? 'program' : action.type === 'MESSAGE_UNREAD' ? 'message' : action.type === 'TRIAL_UPCOMING' ? 'session' : action.type === 'CLIENT_UNASSIGNED' ? 'unassigned' : action.category;
  return <li data-pulse-action={action.key} data-pulse-type={action.type} className="min-w-0 rounded-xl border border-zinc-200 p-3 space-y-2">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="min-w-0 break-words font-semibold">{action.title}</h3><span className="text-xs font-semibold">{pulsePriorityLabels[action.priority]}</span></div>
    <p className="break-words text-sm text-zinc-600">{action.reason}</p>
    {status === 'handled' && <p className="text-xs">Pris en charge · source métier inchangée</p>}
    {status === 'snoozed' && action.snoozedUntil && <p className="text-xs">Rappel le {new Date(action.snoozedUntil).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>}
    <div className="flex flex-wrap gap-2">{action.quickActions.map((item, i) => <Button key={i} variant="secondary" className="min-h-11 whitespace-normal text-left" data-home-action={i === 0 ? legacyType : undefined} onClick={() => open(item.destination)}>{item.label}</Button>)}
      {status === 'open' && <Button variant="ghost" className="min-h-11" disabled={!!feed.busy} onClick={() => void feed.act(action)}>Traité</Button>}
    </div>
    {status === 'open' && <div className="flex flex-wrap gap-2 items-center"><label className="text-sm flex flex-wrap items-center gap-2">Me le rappeler<select aria-label={`Rappel pour ${action.title}`} value={preset} onChange={event => setPreset(event.target.value as SnoozePreset)} className="min-h-11 max-w-full rounded-lg border border-zinc-300 px-2 focus-visible:ring-2 focus-visible:ring-emerald-700">{Object.entries(snoozeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <Button variant="ghost" className="min-h-11" disabled={!!feed.busy} onClick={() => void feed.act(action, preset)}>Rappeler</Button></div>}
  </li>;
}
export function PulseList({ feed, open }: { feed: Feed; open: (destination: HomeDestination) => void }) {
  return <div className="min-w-0 space-y-3" aria-busy={feed.loading}>
    {feed.loading && <p role="status" className="text-sm">Chargement des actions…</p>}
    {feed.error && <div role="alert" className="text-sm">{feed.error} <Button variant="ghost" onClick={feed.refresh}>Actualiser Pulse</Button></div>}
    {feed.result?.partialSources.length ? <p role="status" className="text-sm">Certaines sources atteignent la limite de lecture. Les actions affichées peuvent être incomplètes.</p> : null}
    {!feed.loading && !feed.error && feed.result?.actions.length === 0 && <p className="text-sm text-zinc-600">Aucune action dans cette vue.</p>}
    {feed.result && <ul className="min-w-0 space-y-3">{feed.result.actions.map(action => <ActionCard key={`${action.key}/${action.sourceFingerprint}`} action={action} feed={feed} open={open} />)}</ul>}
  </div>;
}
