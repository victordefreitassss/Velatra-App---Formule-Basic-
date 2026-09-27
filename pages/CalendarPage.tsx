import React from 'react';
import type { AppState } from '../types';
import { MemberWorkoutEntry } from '../components/MemberWorkoutEntry';

export const CalendarPage: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => {
  const user = state.user!;
  const program = state.programs.find(p => p.clubId === user.clubId && Number(p.memberId) === Number(user.id) && !p.isPlannedSession);
  const total = program?.durationWeeks ? program.nbDays * program.durationWeeks : null;
  const progress = program && total ? Math.min(100, Math.round(program.currentDayIndex / total * 100)) : null;
  return <div className="mx-auto max-w-4xl space-y-6 pb-24">
    <header><h1 className="font-display text-3xl font-bold text-zinc-900">Mes séances</h1><p className="mt-2 text-sm text-zinc-700">Votre programme et votre séance en cours.</p></header>
    <MemberWorkoutEntry state={state} setState={setState} showProgramLink={false} />
    {program && <section className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-7 space-y-4" aria-label="Mon programme">
      <h2 className="font-display text-xl font-bold text-zinc-900">{program.name}</h2>
      <p className="text-sm text-zinc-700">{program.currentDayIndex} séance{program.currentDayIndex === 1 ? '' : 's'} terminée{program.currentDayIndex === 1 ? '' : 's'} dans ce programme{total ? ` sur ${total}` : ' · programme continu'}.</p>
      {progress !== null && <progress className="w-full accent-emerald-900" value={progress} max={100} aria-label="Progression du programme" />}
      <div className="space-y-3">{program.days.map((day, index) => <details key={index} className="rounded-2xl border border-zinc-200 px-4 py-1">
        <summary className="min-h-14 cursor-pointer py-3 text-sm font-semibold leading-6 text-zinc-900">{day.name}<span className="block text-xs font-normal text-zinc-700">{day.exercises.length} exercice{day.exercises.length === 1 ? '' : 's'}{index === program.currentDayIndex % program.nbDays ? ' · prochaine séance' : ''}</span></summary>
        <ul className="space-y-3 pb-4">{day.exercises.map((entry, exerciseIndex) => <li key={exerciseIndex} className="text-sm text-zinc-700"><strong className="block text-zinc-900">{state.exercises.find(exercise => exercise.id === entry.exId)?.name || 'Exercice'}</strong>{entry.sets} séries · {entry.reps || entry.duration || 'selon consignes'}{entry.notes && <p className="mt-1 leading-6">{entry.notes}</p>}</li>)}</ul>
      </details>)}</div>
    </section>}
    <button type="button" className="min-h-11 text-sm font-semibold text-emerald-900 underline" onClick={() => setState(previous => ({ ...previous, page: 'history' }))}>Retrouver mes séances enregistrées</button>
  </div>;
};
