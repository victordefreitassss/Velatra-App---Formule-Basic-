import React, { useState } from 'react';
import { addDays, differenceInCalendarDays, format, isBefore, isToday, parseISO, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { runTransaction } from 'firebase/firestore';
import type { AppState, Prospect } from '../types';
import { auth, db, doc } from '../firebase';
import { prospectActivity } from '../components/prospectCrm';
import { parisLocalInstant } from '../components/planningSlots';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}
type Group = 'overdue' | 'today' | 'upcoming' | 'done';
const groups: { id: Group; label: string }[] = [
  { id: 'overdue', label: 'En retard' }, { id: 'today', label: 'Aujourd’hui' },
  { id: 'upcoming', label: 'À venir' }, { id: 'done', label: 'Terminées / sans action' }
];
function groupOf(prospect: Prospect, now: Date): Group {
  if (!prospect.nextReminderDate || prospect.status === 'won' || prospect.status === 'lost') return 'done';
  const date = parseISO(prospect.nextReminderDate);
  if (isBefore(date, startOfDay(now))) return 'overdue';
  if (isToday(date)) return 'today';
  return 'upcoming';
}

export const TasksPage: React.FC<Props> = ({ state, setState, showToast }) => {
  const [selectedGroup, setSelectedGroup] = useState<Group>('today');
  const [customDateFor, setCustomDateFor] = useState<number | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const now = new Date();
  const visible = state.prospects.filter(prospect => groupOf(prospect, now) === selectedGroup)
    .sort((a, b) => (a.nextReminderDate || a.date).localeCompare(b.nextReminderDate || b.date));

  const updateReminder = async (prospect: Prospect, nextReminderDate: string | null) => {
    if (!prospect.firebaseUid || busyId === prospect.id || prospect.status === 'won' || prospect.status === 'lost') return;
    setBusyId(prospect.id);
    try {
      await runTransaction(db, async transaction => {
        const reference = doc(db, 'prospects', prospect.firebaseUid!);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists() || snapshot.data().clubId !== state.user?.clubId) throw new Error('Prospect indisponible.');
        transaction.update(reference, {
          nextReminderDate, status: nextReminderDate ? 'call_pending' : 'contacted',
          activityHistory: prospectActivity(snapshot.data().activityHistory, nextReminderDate ? 'Relance reportée' : 'Relance terminée', auth.currentUser?.uid)
        });
      });
      showToast?.(nextReminderDate ? 'Relance reportée.' : 'Relance terminée.', 'success');
      setCustomDateFor(null);
    } catch { showToast?.('Impossible de modifier cette relance.', 'error'); }
    finally { setBusyId(null); }
  };

  return <main className="mx-auto w-full max-w-6xl space-y-5 p-4 pb-24 md:p-6 lg:p-8">
    <header className="rounded-3xl border border-zinc-200 bg-white p-5 md:p-7">
      <h1 className="font-display text-3xl font-bold text-zinc-950">Tâches et relances</h1>
      <p className="mt-1 text-sm text-zinc-700">Les prochaines actions de vos prospects, à partir de leur date de relance.</p>
    </header>
    <nav className="flex max-w-full gap-2 overflow-x-auto pb-2" aria-label="Catégorie des relances">
      {groups.map(group => <button key={group.id} type="button" aria-pressed={selectedGroup === group.id} onClick={() => setSelectedGroup(group.id)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-emerald-700 ${selectedGroup === group.id ? 'border-emerald-900 bg-emerald-900 text-white' : 'border-zinc-300 bg-white text-zinc-800'}`}>{group.label} <span className="ml-1 opacity-80">{state.prospects.filter(prospect => groupOf(prospect, now) === group.id).length}</span></button>)}
    </nav>
    {visible.length === 0 ? <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-700">Aucune relance dans cette catégorie.</div> :
      <div className="grid gap-3 lg:grid-cols-2">{visible.map(prospect => {
        const due = prospect.nextReminderDate ? parseISO(prospect.nextReminderDate) : null;
        const overdueDays = due ? -differenceInCalendarDays(due, now) : 0;
        return <article key={prospect.firebaseUid || prospect.id} className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><h2 className="break-words text-lg font-bold text-zinc-950">{prospect.name}</h2><p className="break-all text-sm text-zinc-700">{prospect.email || prospect.phone || 'Coordonnées manquantes'}</p></div>
            {due && <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-950">{overdueDays > 0 ? `En retard de ${overdueDays} jour${overdueDays > 1 ? 's' : ''}` : format(due, "d MMM yyyy 'à' HH:mm", { locale: fr })}</span>}
          </div>
          {prospect.notesHistory?.[0] && <p className="mt-3 line-clamp-2 text-sm text-zinc-700">{prospect.notesHistory[0].content}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {prospect.phone && <a href={`tel:${prospect.phone}`} className="min-h-11 rounded-xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white">Appeler</a>}
            <button type="button" onClick={() => setState(previous => ({ ...previous, page: 'crm_pipeline', pendingProspectUid: prospect.firebaseUid }))} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-900">Ouvrir le prospect</button>
            {selectedGroup !== 'done' && <><button type="button" disabled={busyId === prospect.id} onClick={() => updateReminder(prospect, addDays(now, 1).toISOString())} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-900">Demain</button>
              {now.getHours() < 22 && <button type="button" disabled={busyId === prospect.id} onClick={() => updateReminder(prospect, new Date(now.getTime() + 2 * 3600000).toISOString())} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-900">Plus tard aujourd’hui</button>}
              <button type="button" disabled={busyId === prospect.id} onClick={() => updateReminder(prospect, null)} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-900">Terminer la relance</button></>}
            {prospect.status !== 'won' && prospect.status !== 'lost' && <button type="button" onClick={() => { setCustomDateFor(prospect.id); setCustomDate(prospect.nextReminderDate?.slice(0, 10) || ''); }} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-900">Choisir une date</button>}
          </div>
          {customDateFor === prospect.id && <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-sm font-semibold text-zinc-800">Nouvelle date<input type="date" value={customDate} onChange={event => setCustomDate(event.target.value)} className="mt-1 block min-h-11 rounded-xl border border-zinc-300 px-3" /></label><button type="button" disabled={!customDate || busyId === prospect.id} onClick={() => { const instant = parisLocalInstant(customDate, '10:00'); if (instant) updateReminder(prospect, instant.toISOString()); else showToast?.('Date invalide.', 'error'); }} className="min-h-11 rounded-xl bg-emerald-900 px-4 text-sm font-semibold text-white">Enregistrer</button></div>}
        </article>;
      })}</div>}
  </main>;
};
