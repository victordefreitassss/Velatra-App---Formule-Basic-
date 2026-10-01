import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, differenceInCalendarDays, format, isBefore, isToday, parseISO, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { runTransaction } from 'firebase/firestore';
import type { AppState, Prospect, Task } from '../types';
import { auth, db, doc } from '../firebase';
import { prospectActivity } from '../components/prospectCrm';
import { parisLocalInstant } from '../components/planningSlots';

import { useLocation } from 'react-router-dom';
import { selectOperationalTasks } from '../components/experienceHomeSelectors';
import { getTaskId } from '../components/dashboardNavigation';
import { getAllContextItems } from '../components/appShellHelpers';

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
  const location = useLocation();
  const taskRefs = useRef(new Map<string, HTMLElement>());
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const tasks = useMemo(() => selectOperationalTasks(state, true), [state.user, state.currentClub, state.users, state.tasks]);
  const focusedTask = getTaskId(location.state);
  useEffect(() => {
    const target = focusedTask ? taskRefs.current.get(focusedTask) : null;
    target?.scrollIntoView({ block: 'center' });
    target?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [location.key, focusedTask, tasks]);
  const hasCrm = getAllContextItems({ role: state.user?.role || 'member', club: state.currentClub }).some(item => item.id === 'crm_pipeline');
  const prospects = hasCrm ? state.prospects.filter(item => item.clubId === state.user?.clubId) : [];
  const visible = prospects.filter(prospect => groupOf(prospect, now) === selectedGroup)
    .sort((a, b) => (a.nextReminderDate || a.date).localeCompare(b.nextReminderDate || b.date));

  const toggleTask = async (task: Task) => {
    if (busyTask || !tasks.some(item => item.id === task.id)) return;
    setBusyTask(task.id);
    try {
      await runTransaction(db, async transaction => {
        const reference = doc(db, 'tasks', task.id);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) throw new Error('Tâche indisponible.');
        const current = { ...snapshot.data(), id: task.id } as Task;
        if (!selectOperationalTasks({ ...state, tasks: [current] }, true).length) throw new Error('Tâche indisponible.');
        transaction.update(reference, { status: current.status === 'done' ? 'todo' : 'done' });
      });
      showToast?.(task.status === 'done' ? 'Tâche réouverte.' : 'Tâche terminée.', 'success');
    } catch { showToast?.('Impossible de modifier cette tâche.', 'error'); }
    finally { setBusyTask(null); }
  };

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
      <h1 className="font-display text-3xl font-bold text-zinc-950">{hasCrm ? 'Tâches et relances' : 'Mes tâches'}</h1>
      <p className="mt-1 text-sm text-zinc-700">Vos tâches opérationnelles{hasCrm ? ' et les prochaines relances prospects.' : ' affectées.'}</p>
    </header>
    <section aria-labelledby="operational-tasks" className="space-y-3">
      <h2 id="operational-tasks" className="text-lg font-semibold">{state.user?.role === 'coach' ? 'Mes tâches affectées' : 'Tâches du Studio'}</h2>
      {tasks.length === 0 && <p className="rounded-2xl border bg-white p-5 text-zinc-700">Aucune tâche opérationnelle.</p>}
      <div className="grid gap-3 lg:grid-cols-2">{tasks.map(task => <article key={task.id} ref={element => { if (element) taskRefs.current.set(task.id, element); else taskRefs.current.delete(task.id); }} data-operational-task={task.id} className={`min-w-0 rounded-2xl border bg-white p-5 ${focusedTask === task.id ? 'border-emerald-700' : 'border-zinc-200'}`}>
        <h3 className="break-words font-semibold">{task.title}</h3>
        {task.description && <p className="mt-2 break-words text-sm text-zinc-700">{task.description}</p>}
        <p className="mt-2 text-sm text-zinc-600">{task.status === 'done' ? 'Terminée' : 'À faire'}{task.dueDate ? ` · Échéance ${task.dueDate.slice(0, 10)}` : ''}</p>
        <button type="button" disabled={busyTask === task.id} onClick={() => toggleTask(task)} className="mt-3 min-h-11 rounded-xl border border-zinc-300 px-4 text-sm font-semibold">{task.status === 'done' ? 'Réouvrir la tâche' : 'Terminer la tâche'}</button>
        {task.relatedMemberId && <button type="button" className="ml-2 mt-3 min-h-11 rounded-xl border border-zinc-300 px-4 text-sm font-semibold" onClick={() => { const member = state.users.find(item => Number(item.id) === Number(task.relatedMemberId) && item.clubId === state.user?.clubId && (state.user?.role !== 'coach' || !!state.user.firebaseUid && item.assignedCoachUid === state.user.firebaseUid)); if (member) setState(previous => ({ ...previous, page: 'users', selectedMember: member })); }}>Ouvrir le client</button>}
      </article>)}</div>
    </section>
    {hasCrm && <>
    <nav className="flex max-w-full gap-2 overflow-x-auto pb-2" aria-label="Catégorie des relances">
      {groups.map(group => <button key={group.id} type="button" aria-pressed={selectedGroup === group.id} onClick={() => setSelectedGroup(group.id)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-emerald-700 ${selectedGroup === group.id ? 'border-emerald-900 bg-emerald-900 text-white' : 'border-zinc-300 bg-white text-zinc-800'}`}>{group.label} <span className="ml-1 opacity-80">{prospects.filter(prospect => groupOf(prospect, now) === group.id).length}</span></button>)}
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
    </>}
  </main>;
};
