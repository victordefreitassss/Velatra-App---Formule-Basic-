import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AppState, Performance, Program, SessionLog, User } from '../types';
import { apiFetch } from '../firebase';
import { Button } from './UI';
import {
  completionPayload, createWorkoutDraft, DRAFT_EVENT, draftKey, emptySet, executionSteps,
  formatSet, isTimedExercise, latestExerciseLog, matchesCurrentProgram, readWorkoutDraft,
  restAfter, setCount, stepKey, validSet, workoutDay, writeWorkoutDraft,
  type SetValues, type WorkoutDraft,
} from './workoutSession';
import './member-workout.css';

interface WorkoutViewProps {
  program: Program; member: User; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>;
  onClose: () => void; onComplete: (log: SessionLog, perfs: Performance[]) => void;
  showToast: (message: string, type?: any) => void; isCoachView?: boolean;
}
const timeLabel = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export const WorkoutView: React.FC<WorkoutViewProps> = ({ program, member, state, setState, onClose, onComplete }) => {
  const [draft, setDraft] = useState<WorkoutDraft>(() => readWorkoutDraft(member) || createWorkoutDraft(program, member, state.logs, state.exercises));
  const live = useRef(draft);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now());
  const [storageOk, setStorageOk] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const day = workoutDay(draft.program);
  const steps = executionSteps(day);
  const current = steps[Math.min(draft.cursor, steps.length - 1)];
  const entry = current ? day.exercises[current.exercise] : null;
  const exercise = state.exercises.find(ex => ex.id === entry?.exId);
  const currentKey = current ? stepKey(current) : '';
  const values = draft.values[currentKey] || emptySet();
  const cardio = exercise?.cat === 'Cardio';
  const timed = entry ? isTimedExercise(exercise, entry) : false;
  const confirmedCount = steps.filter(step => draft.confirmed.includes(stepKey(step))).length;
  const allDone = steps.length > 0 && confirmedCount === steps.length;
  const changed = draft.status === 'active' && !matchesCurrentProgram(draft, state.programs);
  const restLeft = draft.restUntil ? Math.max(0, Math.ceil((draft.restUntil - now) / 1000)) : 0;
  const lastLog = entry ? latestExerciseLog(state.logs.filter(log => log.id !== draft.receipt?.log.id), member, entry.exId) : undefined;
  const lastExercise = lastLog?.exercises?.find(ex => ex.exId === entry?.exId);
  const lastSet = lastExercise?.sets[current?.set];

  const commit = (next: WorkoutDraft) => {
    live.current = next; setDraft(next); setStorageOk(writeWorkoutDraft(next));
    window.dispatchEvent(new Event(DRAFT_EVENT));
  };
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setStorageOk(writeWorkoutDraft(live.current));
    window.dispatchEvent(new Event(DRAFT_EVENT));
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const connection = () => setOnline(navigator.onLine);
    const flush = () => writeWorkoutDraft(live.current);
    window.addEventListener('online', connection); window.addEventListener('offline', connection);
    window.addEventListener('pagehide', flush);
    return () => {
      clearInterval(clock); window.removeEventListener('online', connection); window.removeEventListener('offline', connection);
      window.removeEventListener('pagehide', flush); document.body.style.overflow = overflow;
      dialog.current?.close(); previousFocus?.focus();
    };
  }, []);
  const clearDraft = () => {
    try { localStorage.removeItem(draftKey(draft.owner)); } catch { /* The local copy may remain; its saved receipt is harmless. */ }
    window.dispatchEvent(new Event(DRAFT_EVENT));
  };
  const close = () => {
    if (savingRef.current) return;
    if (draft.status === 'saved' && draft.receipt) { clearDraft(); onComplete(draft.receipt.log, draft.receipt.performances); }
    else if (storageOk || window.confirm('La copie locale est indisponible. Fermer maintenant peut perdre vos saisies. Fermer quand même ?')) onClose();
  };
  const changeValue = (field: keyof SetValues, value: string) => {
    if (draft.status !== 'active' || changed || saving) return;
    setError('');
    commit({ ...live.current, values: { ...live.current.values, [currentKey]: { ...values, [field]: value } }, confirmed: live.current.confirmed.filter(key => key !== currentKey) });
  };
  const increment = (field: 'weight' | 'reps', amount: number) => {
    const currentValue = Number(values[field].replace(',', '.')) || 0;
    changeValue(field, String(Math.max(0, Math.round((currentValue + amount) * 100) / 100)));
  };
  const confirmSet = () => {
    if (!entry || draft.status !== 'active' || changed) return;
    if (!validSet(values, cardio)) { setError(cardio ? 'Indiquez un temps ou une distance, par exemple 10 min ou 500 m.' : `Indiquez une charge valide (0 kg sans charge ajoutée) et ${timed ? 'un nombre de secondes' : 'un nombre de répétitions'} supérieur à zéro.`); return; }
    const confirmed = [...new Set([...draft.confirmed, currentKey])];
    let nextIndex = steps.findIndex((step, index) => index > draft.cursor && !confirmed.includes(stepKey(step)));
    if (nextIndex < 0) nextIndex = steps.findIndex(step => !confirmed.includes(stepKey(step)));
    const rest = nextIndex === draft.cursor + 1 ? restAfter(day, steps, draft.cursor) : 0;
    const nextValues = { ...draft.values };
    if (nextIndex >= 0 && steps[nextIndex].exercise === current.exercise) {
      const key = stepKey(steps[nextIndex]);
      nextValues[key] = { ...(nextValues[key] || emptySet()), weight: nextValues[key]?.weight || values.weight };
    }
    commit({ ...draft, values: nextValues, confirmed, cursor: nextIndex < 0 ? draft.cursor : nextIndex, restUntil: rest ? Date.now() + rest * 1000 : null });
    setNow(Date.now()); setError(''); heading.current?.focus({ preventScroll: true });
    body.current?.scrollTo({ top: 0, behavior: 'instant' });
  };
  const finish = async () => {
    if (savingRef.current || changed || (!allDone && draft.status !== 'pending')) return;
    const payload = completionPayload(live.current, member, state.exercises);
    const pending: WorkoutDraft = { ...live.current, status: 'pending', payload, restUntil: null };
    commit(pending); setError(''); savingRef.current = true; setSaving(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await apiFetch('/api/workouts/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !result.log) {
        // These responses explicitly reject the transaction. Keep the measurements editable;
        // uncertain network/5xx failures retain the frozen request for idempotent retry.
        if ([400, 403, 409, 422].includes(response.status)) commit({ ...pending, status: 'active', payload: undefined });
        throw new Error(result.error || 'La confirmation de la séance est indisponible.');
      }
      const receipt = { log: result.log as SessionLog, performances: (result.performances || []) as Performance[], alreadyCompleted: Boolean(result.alreadyCompleted) };
      commit({ ...pending, status: 'saved', receipt });
      setState(previous => ({ ...previous,
        logs: [receipt.log, ...previous.logs.filter(log => log.id !== receipt.log.id)],
        performances: [...receipt.performances, ...previous.performances.filter(perf => !receipt.performances.some(saved => saved.id === perf.id))],
      }));
    } catch (failure) {
      setError(failure instanceof Error && !/fetch|network|abort|load failed/i.test(failure.message) ? failure.message : 'Aucune confirmation reçue. Vos saisies restent sur cet appareil. Réessayez quand la connexion est disponible.');
    } finally { clearTimeout(timeout); savingRef.current = false; setSaving(false); }
  };
  const goToProgress = () => {
    if (!draft.receipt) return;
    clearDraft(); setState(previous => ({ ...previous, page: 'performances' }));
    onComplete(draft.receipt.log, draft.receipt.performances);
  };
  const savedLog = draft.receipt?.log;
  const videoUrl = exercise?.videoUrl && /^https?:\/\//i.test(exercise.videoUrl) ? exercise.videoUrl : null;

  return createPortal(
    <dialog ref={dialog} className="va-workout" aria-labelledby="workout-heading" onCancel={event => { event.preventDefault(); close(); }}>
      <header className="va-workout-header">
        <div><p>{draft.status === 'saved' ? 'Votre carnet d’entraînement' : draft.program.name}</p><h1 id="workout-heading">{day.name}</h1></div>
        <button type="button" onClick={close} disabled={saving} className="va-workout-secondary">{draft.status === 'saved' ? 'Fermer' : 'Pause'}</button>
      </header>
      <div ref={body} className="va-workout-body">
        {!storageOk && <p role="alert" className="va-workout-error">La copie locale ne fonctionne pas sur cet appareil. Gardez cet écran ouvert jusqu’à la confirmation d’enregistrement.</p>}
        {!online && draft.status !== 'saved' && <p role="status" className="va-workout-notice">Hors connexion · vos saisies restent locales. La séance devra être confirmée en ligne.</p>}
        {draft.status === 'saved' && savedLog ? (
          <section className="va-workout-finish" aria-labelledby="workout-finished">
            <span className="va-workout-success" aria-hidden="true">✓</span><h2 id="workout-finished">Séance terminée</h2>
            <p>Votre séance est enregistrée dans votre historique.</p>
            <dl className="va-workout-summary"><div><dt>Durée écoulée</dt><dd>{timeLabel(Math.round(savedLog.duration || 0))}</dd></div><div><dt>Exercices</dt><dd>{savedLog.exercises?.length || 0}</dd></div><div><dt>Séries réalisées</dt><dd>{savedLog.exercises?.reduce((total, ex) => total + ex.sets.length, 0) || 0}</dd></div></dl>
            <p>{state.logs.filter(log => log.clubId === member.clubId && Number(log.memberId) === Number(member.id)).length} séance(s) dans votre carnet. Chaque série compte, y compris au poids du corps.</p>
            <div className="va-workout-records">{savedLog.exercises?.map((ex, index) => {
              const prior = latestExerciseLog(state.logs.filter(log => log.id !== savedLog.id), member, ex.exId)?.exercises?.find(item => item.exId === ex.exId);
              const oldMax = prior ? Math.max(...prior.sets.map(set => Number(set.weight) || 0)) : null;
              const newMax = Math.max(...ex.sets.map(set => Number(set.weight) || 0));
              return <div key={`${ex.exId}-${index}`}><strong>{ex.name}</strong><p>{ex.sets.map(set => formatSet(set)).join(' · ')}</p>{oldMax !== null && newMax > oldMax && <p className="va-workout-positive">+{Number((newMax - oldMax).toFixed(2))} kg de charge maximale par rapport à la séance de référence.</p>}</div>;
            })}</div>
          </section>
        ) : (
          <>
            <div className="va-workout-progress"><span>{confirmedCount} / {steps.length} séries validées</span><span>{timeLabel(Math.max(0, Math.floor((now - draft.startedAt) / 1000)))}</span><progress max={Math.max(1, steps.length)} value={confirmedCount} aria-label="Séries réalisées" /></div>
            {changed && <div role="alert" className="va-workout-error"><strong>Votre programme a changé.</strong><p>Vos saisies sont conservées ci-dessous. Contactez votre coach avant de reprendre ; elles ne seront pas envoyées avec un autre programme.</p><button type="button" className="va-workout-secondary" onClick={() => { if (window.confirm('Abandonner uniquement ce brouillon local ? Les séances déjà enregistrées restent dans votre historique.')) { clearDraft(); onClose(); } }}>Abandonner ce brouillon</button></div>}
            {draft.status === 'pending' && <p role="status" className="va-workout-notice">{saving ? 'Enregistrement en cours…' : 'Enregistrement à confirmer. Réessayez avec les mêmes données pour éviter un doublon.'}</p>}
            {draft.restUntil && draft.status === 'active' && !changed && <section className="va-workout-rest" aria-label="Repos recommandé"><div><p>{restLeft > 0 ? 'Repos recommandé' : 'Repos terminé'}</p><strong role="timer" aria-label={`${restLeft} secondes de repos restantes`}>{timeLabel(restLeft)}</strong></div><p>Ensuite : {exercise?.name || `exercice ${current.exercise + 1}`} · série {current.set + 1}</p><button type="button" className="va-workout-secondary" onClick={() => commit({ ...draft, restUntil: null })}>{restLeft > 0 ? 'Passer le repos' : 'Reprendre la série'}</button></section>}
            {allDone ? <section className="va-workout-ready"><h2>Toutes vos séries sont prêtes</h2><p>Terminez la séance pour enregistrer votre progression auprès de votre coach.</p></section> : entry && <section className="va-workout-exercise" aria-labelledby="exercise-heading">
              <p className="va-workout-eyebrow">Exercice {current.exercise + 1} / {day.exercises.length}{entry.setGroup ? ` · ${entry.setType || 'Circuit'}` : ''}</p>
              <h2 ref={heading} tabIndex={-1} id="exercise-heading">{exercise?.name || 'Exercice du programme'}</h2>
              <p className="va-workout-target">Objectif du coach : {setCount(entry)} séries · {cardio ? entry.duration || 'durée à adapter' : `${entry.reps || 'selon consignes'} ${timed ? (/s|sec/i.test(entry.reps) ? '' : 'secondes') : 'répétitions'}`}{entry.rest ? ` · repos ${entry.rest}` : ''}{entry.tempo ? ` · tempo ${entry.tempo}` : ''}</p>
              {entry.notes && <div className="va-workout-note"><strong>Consigne du coach</strong><p>{entry.notes}</p></div>}
              {videoUrl && <a className="va-workout-link" href={videoUrl} target="_blank" rel="noopener noreferrer">Voir la vidéo de l’exercice ↗</a>}
              <div className="va-workout-memory"><strong>{lastLog ? `Référence du ${new Date(lastLog.date).toLocaleDateString('fr-FR')}` : 'Votre première référence'}</strong><p>{lastSet ? `Série ${current.set + 1} : ${formatSet(lastSet)}` : 'Les valeurs réalisées aujourd’hui serviront de repère à la prochaine séance.'}</p>{lastExercise && lastExercise.sets.length > 1 && <details><summary>Toutes les séries de cette séance</summary><ol>{lastExercise.sets.map((set, index) => <li key={index}>Série {index + 1} · {formatSet(set)}</li>)}</ol></details>}</div>
              <div className="va-workout-series"><h3>Aujourd’hui · Série {current.set + 1} / {setCount(entry)}</h3><div className="va-workout-dots" aria-label="Séries de cet exercice">{Array.from({ length: setCount(entry) }, (_, set) => <button key={set} type="button" disabled={saving || draft.status !== 'active'} aria-label={`Ouvrir la série ${set + 1}`} aria-current={set === current.set ? 'step' : undefined} onClick={() => { commit({ ...draft, cursor: steps.findIndex(step => step.exercise === current.exercise && step.set === set), restUntil: null }); setError(''); }}>{draft.confirmed.includes(`${current.exercise}:${set}`) ? '✓' : set + 1}</button>)}</div></div>
              <fieldset disabled={saving || changed || draft.status !== 'active'} className="va-workout-inputs"><legend className="sr-only">Performance réalisée</legend>
                {cardio ? <label>Temps ou distance<input aria-label="Temps ou distance réalisés" type="text" inputMode="text" maxLength={30} value={values.duration} onChange={event => changeValue('duration', event.target.value)} placeholder="Ex. 10 min ou 500 m" /></label> : <>
                  <label>Charge ajoutée · kg<div className="va-workout-stepper"><button type="button" aria-label="Réduire la charge de 2,5 kg" onClick={() => increment('weight', -2.5)}>−</button><input aria-label="Charge ajoutée en kg" type="text" inputMode="decimal" maxLength={12} value={values.weight} placeholder="0" onChange={event => changeValue('weight', event.target.value)} /><button type="button" aria-label="Augmenter la charge de 2,5 kg" onClick={() => increment('weight', 2.5)}>+</button></div></label>
                  <label>{timed ? 'Temps réalisé · secondes' : 'Répétitions réalisées'}<div className="va-workout-stepper"><button type="button" aria-label={timed ? 'Retirer une seconde' : 'Retirer une répétition'} onClick={() => increment('reps', -1)}>−</button><input aria-label={timed ? 'Secondes réalisées' : 'Répétitions réalisées'} type="text" inputMode="numeric" maxLength={5} value={values.reps} placeholder="—" onChange={event => changeValue('reps', event.target.value)} /><button type="button" aria-label={timed ? 'Ajouter une seconde' : 'Ajouter une répétition'} onClick={() => increment('reps', 1)}>+</button></div></label>
                  <p className="va-workout-help">Sans charge ajoutée, indiquez 0 kg. Confirmez ce que vous avez réellement effectué.</p>
                </>}
              </fieldset>
            </section>}
            <details className="va-workout-overview"><summary>Voir ou corriger mes séries</summary>{steps.map((step, index) => <button key={stepKey(step)} type="button" disabled={draft.status !== 'active' || saving} onClick={() => { const key = stepKey(step); commit({ ...draft, cursor: index, confirmed: draft.confirmed.filter(item => item !== key), restUntil: null }); setError(''); }}><span>{draft.confirmed.includes(stepKey(step)) ? '✓' : '○'} {state.exercises.find(ex => ex.id === day.exercises[step.exercise].exId)?.name || 'Exercice'} · série {step.set + 1}</span><strong>{formatSet(draft.values[stepKey(step)] || emptySet())}</strong></button>)}</details>
            <p className="va-workout-local">{storageOk ? 'Brouillon sur cet appareil · la séance sera synchronisée lorsque vous la terminerez.' : 'Copie locale indisponible.'}</p>
          </>
        )}
      </div>
      <footer className="va-workout-footer">
        {error && <p role="alert" className="va-workout-error">{error}</p>}
        {draft.status === 'saved' ? <Button fullWidth onClick={goToProgress}>Voir ma progression</Button> : draft.status === 'pending' || allDone ? <Button fullWidth disabled={saving || changed} onClick={finish}>{saving ? 'Enregistrement en cours…' : draft.status === 'pending' ? 'Réessayer l’enregistrement' : 'Terminer ma séance'}</Button> : <Button fullWidth disabled={saving || changed || restLeft > 0} onClick={confirmSet}>{restLeft > 0 ? `Repos · ${timeLabel(restLeft)}` : 'Valider la série'}</Button>}
      </footer>
    </dialog>, document.body,
  );
};
