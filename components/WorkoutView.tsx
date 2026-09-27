import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AppState, Performance, Program, SessionLog, User } from '../types';
import { apiFetch } from '../firebase';
import { Button } from './UI';
import {
  completionPayload, createWorkoutDraft, DRAFT_EVENT, draftKey, emptySet, executionSteps,
  formatSet, isTimedExercise, latestExerciseLog, matchesCurrentProgram, readWorkoutDraft,
  restAfter, setCount, stepKey, validSet, workoutDay, writeWorkoutDraft,
  isBodyweightExercise, prepareFollowingSet, updateSetValue, comparableLoadGain, displayNumber, remainingRest, extendRest,
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
  const [baseline] = useState(() => createWorkoutDraft(draft.program, member, state.logs, state.exercises, draft.startedAt, draft.requestId).values);
  const [addingLoad, setAddingLoad] = useState<number | null>(null);
  const [reviewingSet, setReviewingSet] = useState(false);
  const [correctionKey, setCorrectionKey] = useState('');
  const [exerciseTransition, setExerciseTransition] = useState(false);
  const repsInput = useRef<HTMLInputElement>(null);
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
  const bodyweight = isBodyweightExercise(exercise);
  const rawValues = draft.values[currentKey] || emptySet();
  const values = bodyweight && rawValues.weight === '' ? { ...rawValues, weight: '0' } : rawValues;
  const showLoad = !bodyweight || addingLoad === current?.exercise || Number(values.weight.replace(',', '.')) > 0;
  const cardio = exercise?.cat === 'Cardio';
  const timed = entry ? isTimedExercise(exercise, entry) : false;
  const confirmedCount = steps.filter(step => draft.confirmed.includes(stepKey(step))).length;
  const allDone = steps.length > 0 && confirmedCount === steps.length;
  const changed = draft.status === 'active' && !matchesCurrentProgram(draft, state.programs);
  const restLeft = remainingRest(draft.restUntil, now);
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
    const flush = () => { setStorageOk(writeWorkoutDraft(live.current)); setNow(Date.now()); };
    const viewport = window.visualViewport;
    const resize = () => {
      if (viewport && dialog.current) {
        dialog.current.style.setProperty('--workout-height', `${viewport.height}px`);
        dialog.current.style.setProperty('--workout-top', `${viewport.offsetTop}px`);
      }
      if (document.activeElement instanceof HTMLInputElement && dialog.current?.contains(document.activeElement)) {
        document.activeElement.scrollIntoView({ block: 'nearest' });
      }
    };
    resize(); viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize); window.addEventListener('focus', flush);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('online', connection); window.addEventListener('offline', connection);
    window.addEventListener('pagehide', flush);
    return () => {
      clearInterval(clock); window.removeEventListener('online', connection); window.removeEventListener('offline', connection);
      window.removeEventListener('pagehide', flush); window.removeEventListener('focus', flush);
      document.removeEventListener('visibilitychange', flush); window.removeEventListener('resize', resize);
      viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize);
      document.body.style.overflow = overflow;
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
    const next = updateSetValue(live.current, currentKey, field, value);
    if (next === live.current) return;
    if (live.current.confirmed.includes(currentKey)) setCorrectionKey(currentKey);
    commit(next);
  };
  const increment = (field: 'weight' | 'reps', amount: number) => {
    const currentValue = Number(values[field].replace(',', '.')) || 0;
    changeValue(field, String(Math.max(0, Math.round((currentValue + amount) * 100) / 100)));
  };
  const confirmSet = () => {
    if (!entry || draft.status !== 'active' || changed || restLeft > 0 || savingRef.current) return;
    if (!validSet(values, cardio)) { setError(cardio ? 'Indiquez un temps ou une distance, par exemple 10 min ou 500 m.' : `Vérifiez ${bodyweight ? 'le lest et ' : 'la charge et '}${timed ? 'le nombre de secondes' : 'les répétitions'} réalisés.`); return; }
    const confirmed = [...new Set([...draft.confirmed, currentKey])];
    let nextIndex = steps.findIndex((step, index) => index > draft.cursor && !confirmed.includes(stepKey(step)));
    if (nextIndex < 0) nextIndex = steps.findIndex(step => !confirmed.includes(stepKey(step)));
    const wasConfirmed = draft.confirmed.includes(currentKey);
    const rest = !wasConfirmed && correctionKey !== currentKey && nextIndex === draft.cursor + 1 ? restAfter(day, steps, draft.cursor) : 0;
    const withActual = { ...draft, values: { ...draft.values, [currentKey]: values } };
    const nextValues = wasConfirmed || correctionKey === currentKey ? withActual.values : prepareFollowingSet(withActual, baseline);
    setExerciseTransition(nextIndex >= 0 && steps[nextIndex].exercise !== current.exercise);
    setReviewingSet(false); setCorrectionKey(''); setAddingLoad(null);
    (document.activeElement as HTMLElement | null)?.blur();
    commit({ ...draft, values: nextValues, confirmed, cursor: nextIndex < 0 ? draft.cursor : nextIndex, restUntil: rest ? Date.now() + rest * 1000 : null });
    setNow(Date.now()); setError(''); heading.current?.focus({ preventScroll: true });
    body.current?.scrollTo({ top: 0, behavior: 'instant' });
  };
  const selectValue = (event: React.FocusEvent<HTMLInputElement>) => event.currentTarget.select();
  const editSet = (index: number) => {
    setReviewingSet(true); setExerciseTransition(false); setError('');
    commit({ ...draft, cursor: index, restUntil: null });
    body.current?.scrollTo({ top: 0, behavior: 'instant' });
  };
  const confirmWithKeyboard = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); confirmSet(); }
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
      setError(failure instanceof Error && !/fetch|network|abort|load failed/i.test(failure.message) ? failure.message : 'Nous n’avons pas encore reçu la confirmation. Vos saisies sont conservées sur cet appareil. Réessayez quand la connexion revient.');
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
            <details className="va-workout-details"><summary>Revoir mes séries</summary><div className="va-workout-records">{savedLog.exercises?.map((ex, index) => {
              const prior = latestExerciseLog(state.logs.filter(log => log.id !== savedLog.id), member, ex.exId)?.exercises?.find(item => item.exId === ex.exId);
              const definition = state.exercises.find(item => item.id === ex.exId);
              const isTimed = isTimedExercise(definition, day.exercises[index]);
              const gain = comparableLoadGain(ex.sets, prior?.sets, isTimed, definition?.cat === 'Cardio');
              return <div key={`${ex.exId}-${index}`}><strong>{ex.name}</strong><p>{ex.sets.map(set => formatSet(set, isBodyweightExercise(definition), isTimed)).join(' · ')}</p>{gain !== null && <p className="va-workout-positive">+{displayNumber(gain!)} kg à répétitions égales par rapport à la séance de référence.</p>}</div>;
            })}</div></details>
          </section>
        ) : (
          <>
            <div className="va-workout-progress"><span>{confirmedCount} / {steps.length} séries validées</span><span>{timeLabel(Math.max(0, Math.floor((now - draft.startedAt) / 1000)))}</span><progress max={Math.max(1, steps.length)} value={confirmedCount} aria-label="Séries réalisées" /></div>
            {changed && <div role="alert" className="va-workout-error"><strong>Votre coach a modifié ce programme pendant votre séance.</strong><p>Vos saisies sont toujours disponibles ci-dessous. Contactez votre coach avant de reprendre ; elles ne seront pas envoyées avec un autre programme.</p><button type="button" className="va-workout-secondary" onClick={() => { if (window.confirm('Abandonner uniquement ce brouillon local ? Les séances déjà enregistrées restent dans votre historique.')) { clearDraft(); onClose(); } }}>Abandonner ce brouillon</button></div>}
            {draft.status === 'pending' && <p role="status" className="va-workout-notice">{saving ? 'Enregistrement en cours…' : 'Nous n’avons pas encore reçu la confirmation. Vos saisies sont conservées ; vous pouvez réessayer.'}</p>}
            {draft.restUntil && draft.status === 'active' && !changed && <section className="va-workout-rest" aria-label="Repos recommandé"><div><p>{restLeft > 0 ? 'Repos' : 'Repos terminé'}</p><strong role="timer" aria-label={`${restLeft} secondes de repos restantes`}>{timeLabel(restLeft)}</strong></div><p>Prochaine série : {exercise?.name || `exercice ${current.exercise + 1}`} · série {current.set + 1}</p><div className="va-workout-rest-actions"><button type="button" className="va-workout-secondary" onClick={() => { commit({ ...draft, restUntil: null }); body.current?.scrollTo({ top: 0, behavior: 'instant' }); }}>{restLeft > 0 ? 'Passer le repos' : 'Reprendre la série'}</button><button type="button" className="va-workout-secondary" onClick={() => { commit({ ...draft, restUntil: extendRest(draft.restUntil, Date.now()) }); setNow(Date.now()); }}>+30 sec</button></div></section>}
            {allDone && !reviewingSet ? <section className="va-workout-ready"><h2>Toutes vos séries sont prêtes</h2><p>Terminez la séance pour enregistrer votre progression auprès de votre coach.</p></section> : entry && <section key={current.exercise} className="va-workout-exercise" aria-labelledby="exercise-heading">
              <p className="va-workout-eyebrow" aria-live="polite">{exerciseTransition ? 'Exercice suivant · ' : ''}Exercice {current.exercise + 1} / {day.exercises.length}{entry.setType && entry.setType !== 'normal' ? ` · ${entry.setType === 'dropset' ? 'Dropset sans repos' : entry.setType}` : ''}</p>
              <h2 ref={heading} tabIndex={-1} id="exercise-heading">{exercise?.name || 'Exercice du programme'}</h2>
              <div className="va-workout-context">
                <div><strong>Objectif du coach</strong><p>{cardio ? entry.duration || 'Selon consignes' : `${entry.reps || 'Selon consignes'} ${timed ? (/s|sec/i.test(entry.reps) ? '' : 'secondes') : 'reps'}`}</p></div>
                <div><strong>Dernière fois · série {current.set + 1}</strong><p>{lastSet ? formatSet(lastSet, bodyweight, timed) : 'Première référence'}</p></div>
              </div>
              <div className="va-workout-series"><h3>Aujourd’hui<br /><span>Série {current.set + 1} / {setCount(entry)}</span></h3><div className="va-workout-dots" aria-label="Séries de cet exercice">{Array.from({ length: setCount(entry) }, (_, set) => <button key={set} type="button" disabled={saving || changed || draft.status !== 'active'} aria-label={`Ouvrir la série ${set + 1}${draft.confirmed.includes(`${current.exercise}:${set}`) ? ', validée' : ''}`} aria-current={set === current.set ? 'step' : undefined} onClick={() => editSet(steps.findIndex(step => step.exercise === current.exercise && step.set === set))}>{draft.confirmed.includes(`${current.exercise}:${set}`) ? '✓' : set + 1}</button>)}</div></div>
              {correctionKey === currentKey && <p role="status" className="va-workout-correction">Série modifiée · validez la correction.</p>}
              {draft.confirmed.includes(currentKey) && <p className="va-workout-correction">Série validée. Une modification demandera une nouvelle validation.</p>}
              <fieldset disabled={saving || changed || draft.status !== 'active'} className="va-workout-inputs"><legend className="sr-only">Performance réalisée</legend>
                {cardio ? <label>Temps ou distance<input aria-label="Temps ou distance réalisés" type="text" inputMode="text" enterKeyHint="done" onFocus={selectValue} onKeyDown={confirmWithKeyboard} maxLength={30} value={values.duration} onChange={event => changeValue('duration', event.target.value)} placeholder="Ex. 2 min, 00:30 ou 500 m" /></label> : <>
                  {bodyweight && !showLoad ? <div className="va-workout-bodyweight"><strong>Poids du corps</strong><button type="button" className="va-workout-secondary" onClick={() => setAddingLoad(current.exercise)}>Ajouter un lest</button></div> : <label>{bodyweight ? 'Lest ajouté · kg' : 'Charge · kg'}<div className="va-workout-stepper"><button type="button" aria-label="Réduire la charge de 2,5 kg" onClick={() => increment('weight', -2.5)}>−2,5</button><input aria-label="Charge ajoutée en kg" type="text" inputMode="decimal" enterKeyHint="next" onFocus={selectValue} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); repsInput.current?.focus(); } }} maxLength={12} value={displayNumber(values.weight)} placeholder="kg" onChange={event => changeValue('weight', event.target.value)} /><button type="button" aria-label="Augmenter la charge de 2,5 kg" onClick={() => increment('weight', 2.5)}>+2,5</button></div>{bodyweight && <button type="button" className="va-workout-link" onClick={() => { changeValue('weight', '0'); setAddingLoad(null); }}>Revenir sans lest</button>}</label>}
                  <label>{timed ? 'Temps réalisé · secondes' : 'Répétitions réalisées'}<div className="va-workout-stepper"><button type="button" aria-label={timed ? 'Retirer une seconde' : 'Retirer une répétition'} onClick={() => increment('reps', -1)}>−1</button><input ref={repsInput} aria-label={timed ? 'Secondes réalisées' : 'Répétitions réalisées'} type="text" inputMode="numeric" enterKeyHint="done" onFocus={selectValue} onKeyDown={confirmWithKeyboard} maxLength={5} value={values.reps} placeholder="—" onChange={event => changeValue('reps', event.target.value)} /><button type="button" aria-label={timed ? 'Ajouter une seconde' : 'Ajouter une répétition'} onClick={() => increment('reps', 1)}>+1</button></div></label>
                </>}
              </fieldset>
              <p className="va-workout-help">Valeurs proposées · validez uniquement ce que vous avez réalisé.</p>
              <details className="va-workout-details"><summary>Consignes et références</summary><p>{setCount(entry)} séries{entry.rest ? ` · repos ${entry.rest}` : ''}{entry.tempo ? ` · tempo ${entry.tempo}` : ''}</p>{entry.notes && <p><strong>Votre coach :</strong> {entry.notes}</p>}{videoUrl && <a className="va-workout-link" href={videoUrl} target="_blank" rel="noopener noreferrer">Voir la vidéo de l’exercice ↗</a>}{lastExercise && <><p>Dernière séance du {new Date(lastLog!.date).toLocaleDateString('fr-FR')}</p><ol>{lastExercise.sets.map((set, index) => <li key={index}>Série {index + 1} · {formatSet(set, bodyweight, timed)}</li>)}</ol></>}</details>
            </section>}
            <details className="va-workout-overview"><summary>Voir ou corriger mes séries</summary>{steps.map((step, index) => <button key={stepKey(step)} type="button" disabled={draft.status !== 'active' || saving} onClick={() => editSet(index)}><span>{draft.confirmed.includes(stepKey(step)) ? '✓' : '○'} {state.exercises.find(ex => ex.id === day.exercises[step.exercise].exId)?.name || 'Exercice'} · série {step.set + 1}</span><strong>{formatSet(draft.values[stepKey(step)] || emptySet(), isBodyweightExercise(state.exercises.find(ex => ex.id === day.exercises[step.exercise].exId)), isTimedExercise(state.exercises.find(ex => ex.id === day.exercises[step.exercise].exId), day.exercises[step.exercise]))}</strong></button>)}</details>
            <p className="va-workout-local">{storageOk ? 'Brouillon sur cet appareil · la séance sera synchronisée lorsque vous la terminerez.' : 'Copie locale indisponible.'}</p>
          </>
        )}
      </div>
      <footer className="va-workout-footer">
        {error && <p role="alert" className="va-workout-error">{error}</p>}
        {draft.status === 'saved' ? <Button fullWidth onClick={goToProgress}>Voir ma progression</Button> : draft.status === 'pending' || (allDone && !reviewingSet) ? <Button fullWidth disabled={saving || changed} onClick={finish}>{saving ? 'Enregistrement en cours…' : draft.status === 'pending' ? 'Réessayer l’enregistrement' : 'Terminer ma séance'}</Button> : <Button fullWidth disabled={saving || changed || restLeft > 0} onClick={allDone && reviewingSet ? () => setReviewingSet(false) : confirmSet}>{restLeft > 0 ? `Repos · ${timeLabel(restLeft)}` : allDone && reviewingSet ? 'Revenir au bilan' : correctionKey === currentKey ? 'Valider la correction' : draft.confirmed.includes(currentKey) ? 'Continuer la séance' : 'Valider la série'}</Button>}
      </footer>
    </dialog>, document.body,
  );
};
