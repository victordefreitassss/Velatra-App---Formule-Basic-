import React, { useState } from 'react';
import type { AppState } from '../types';
import { Button } from './UI';
import { useWorkoutDraft } from './useWorkoutDraft';
import { executionSteps, workoutDay } from './workoutSession';

export const MemberWorkoutEntry: React.FC<{state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; showProgramLink?: boolean; onRequestPlan?: () => Promise<void>}> = ({ state, setState, showProgramLink = true, onRequestPlan }) => {
  const [requesting, setRequesting] = useState(false);
  const user = state.user!;
  const draft = useWorkoutDraft(user);
  const active = state.programs.find(program => program.clubId === user.clubId && Number(program.memberId) === Number(user.id) && !program.isPlannedSession);
  const program = draft?.program || active;
  const day = program ? workoutDay(program) : null;
  const label = draft?.status === 'saved' ? 'Voir ma séance terminée' : draft?.status === 'pending' ? 'Confirmer ma séance' : draft ? 'Reprendre ma séance' : 'Commencer ma séance';
  return <section aria-label="Ma prochaine action" className="rounded-3xl border border-emerald-900/15 bg-white p-5 sm:p-7 space-y-4 shadow-sm">
    <p className="text-sm font-semibold text-emerald-900">{draft ? 'Votre séance vous attend' : 'Votre prochaine action'}</p>
    <h2 className="font-display text-2xl font-bold leading-tight text-zinc-900">{day?.name || 'Préparons votre prochaine séance'}</h2>
    {program && day ? <>
      <p className="text-sm leading-6 text-zinc-700">{program.name} · {day.exercises.length} exercice{day.exercises.length === 1 ? '' : 's'}{day.duration ? ` · environ ${day.duration} min` : ''}</p>
      {draft && <p className="text-sm text-zinc-700">{draft.status === 'saved' ? 'Enregistrement confirmé.' : `${draft.confirmed.length} / ${executionSteps(day).length} séries validées · brouillon sur cet appareil.`}</p>}
      <Button fullWidth className="!min-h-14 !text-base" disabled={!day.exercises.length} onClick={() => setState(previous => ({ ...previous, workout: program, workoutMember: user }))}>{label}</Button>
      {!day.exercises.length && <p className="text-sm text-zinc-700">Votre coach doit encore ajouter les exercices. Retrouvez-le dans Messages.</p>}
      {showProgramLink && <button type="button" className="min-h-11 text-sm font-semibold text-emerald-900 underline" onClick={() => setState(previous => ({ ...previous, page: 'calendar' }))}>Voir mon programme</button>}
    </> : <>
      <p className="text-sm leading-6 text-zinc-700">Votre coach n’a pas encore activé de programme. Échangez avec lui pour préparer la suite.</p>
      {onRequestPlan && <Button fullWidth disabled={requesting || user.planRequested} onClick={async () => { setRequesting(true); try { await onRequestPlan(); } finally { setRequesting(false); } }}>{user.planRequested ? 'Programme demandé au coach' : requesting ? 'Envoi de la demande…' : 'Demander mon programme'}</Button>}
      <Button fullWidth variant={onRequestPlan ? 'secondary' : 'primary'} onClick={() => setState(previous => ({ ...previous, page: 'messages' }))}>Écrire à mon coach</Button>
    </>}
  </section>;
};
