import React, { useState } from 'react';
import '../pulse/pulse.css';
import type { AppState } from '../types';
import { Button, Card } from '../components/UI';
import { useHomeDestination } from '../components/useHomeDestination';
import { useProductFormat } from '../components/useProductFormat';
import { usePulse } from '../pulse/usePulse';
import { PulseList } from '../pulse/PulseList';
import { pulseCategoryLabels, type PulseCategory, type PulseGroup, type PulseStatus } from '../pulse/pulseModel';
export function PulsePage({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [status, setStatus] = useState<PulseStatus>('open'), [group, setGroup] = useState<PulseGroup | 'all'>('all'), [category, setCategory] = useState<PulseCategory | 'all'>('all');
  const format = useProductFormat(), open = useHomeDestination(state, setState);
  const feed = usePulse(state, { limit: 20, status, group, category });
  return <div data-pulse-page data-format={format} className="va-pulse-page min-w-0 space-y-4 pb-24">
    <header className="space-y-2"><h1>Pulse · Actions</h1><p className="text-sm text-zinc-600">Les situations qui nécessitent votre attention. Traité signifie pris en charge et conserve la source métier.</p></header>
    <Card className="min-w-0 space-y-4">
      <nav aria-label="État des actions" className="flex flex-wrap gap-2">{([['open', 'À traiter'], ['handled', 'Traité'], ['snoozed', 'Rappels']] as const).map(([value, label]) => <Button key={value} variant={status === value ? 'primary' : 'secondary'} aria-pressed={status === value} onClick={() => { setStatus(value); setGroup('all'); }}>{label}</Button>)}</nav>
      <div className="flex flex-wrap gap-3"><label className="text-sm space-y-1">Échéance<select className="block min-h-11 max-w-full rounded-lg border p-2" value={group} onChange={event => setGroup(event.target.value as typeof group)}>{([['all', 'Toutes'], ['overdue', 'En retard'], ['today', 'Aujourd’hui'], ['upcoming', 'À venir']] as const).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm space-y-1">Catégorie<select className="block min-h-11 max-w-full rounded-lg border p-2" value={category} onChange={event => setCategory(event.target.value as typeof category)}><option value="all">Toutes</option>{feed.result?.categories.map(item => <option key={item} value={item}>{pulseCategoryLabels[item]}</option>)}</select></label>
      <Button variant="ghost" onClick={feed.refresh}>Actualiser Pulse</Button></div>
      {feed.result && <p className="text-sm">{feed.result.total} action(s) dans cette vue</p>}
      <PulseList feed={feed} open={open} />
      {feed.result?.nextCursor && <Button disabled={feed.loading} variant="secondary" onClick={() => void feed.loadMore()}>Voir les actions suivantes</Button>}
    </Card>
  </div>;
}
