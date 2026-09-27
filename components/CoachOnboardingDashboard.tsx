import { localDateKey, createNumericId } from './dataHelpers';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, Program, User } from '../types';
import { Button } from './UI';
import { VelatraMascot } from './VelatraMascot';
import { CalendarIcon, CheckCircleIcon, UserIcon } from './Icons';
import { db, doc, updateDoc } from '../firebase';
import {
  getCoachDashboardStage,
  getNextIncompleteCoachStep,
  getOnboardingProgress,
  hasAssignedProgram,
  hasPlannedCoachSession,
  isClubProfileComplete,
  type CoachOnboardingChecklist,
} from './coachOnboardingHelpers';
import { requestClubInviteDialog, trackProductEventOnce } from './productEvents';

interface CoachOnboardingDashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (message: string, type?: any) => void;
}

const stepCopy = {
  spaceComplete: { title: 'Compléter mon espace', action: 'Compléter mon espace', page: 'about', pendingUiAction: 'edit-space' },
  firstMemberAdded: { title: 'Ajouter mon premier adhérent', action: 'Ajouter un adhérent', page: 'users' },
  firstProgramAssigned: { title: 'Créer son premier programme', action: 'Créer le programme', page: 'program' },
  firstSessionPlanned: { title: 'Planifier une première séance', action: 'Ouvrir le planning', page: 'calendar' },
  clientFollowUpViewed: { title: 'Découvrir le suivi client', action: 'Voir la fiche de mon adhérent', page: 'member' },
} as const;

const newProgramFor = (member: User): Program => ({
  id: createNumericId(),
  clubId: member.clubId,
  memberId: Number(member.id),
  name: `Plan - ${member.name.split(' ')[0] || 'Adhérent'}`,
  presetId: null,
  nbDays: 1,
  startDate: localDateKey(),
  completedWeeks: [],
  currentDayIndex: 0,
  days: [{ name: 'Jour 1', isCoaching: false, exercises: [] }],
});

export const CoachOnboardingDashboard: React.FC<CoachOnboardingDashboardProps> = ({ state, setState, showToast }) => {
  const coach = state.user!;
  const members = (state.users || []).filter(user => user.role === 'member' && user.clubId === coach.clubId);
  const memberIds = new Set(members.map(member => Number(member.id)));
  const assignedPrograms = (state.programs || []).filter(program =>
    program.clubId === coach.clubId && !program.isPlannedSession && memberIds.has(Number(program.memberId))
  );
  const memberWithProgram = members.find(member => hasAssignedProgram([member], assignedPrograms));
  const firstValueReached = Boolean(memberWithProgram && hasAssignedProgram([memberWithProgram], assignedPrograms));
  const planningEnabled = state.currentClub?.settings?.booking?.enabled !== false;
  const coachKey = String(coach.firebaseUid || coach.id);
  const followUpStorageKey = `velatra:coach-follow-up-viewed:${coachKey}`;
  const dismissedStorageKey = `velatra:coach-onboarding-dismissed:${coachKey}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem(dismissedStorageKey) === '1'; } catch { return false; }
  });
  const [followUpViewed, setFollowUpViewed] = useState(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem(followUpStorageKey) === '1'; } catch { return false; }
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const completionAttempted = useRef(false);
  const stage = getCoachDashboardStage({
    role: coach.role,
    memberCount: members.length,
    onboardingCompleted: coach.onboardingCompleted,
    firstValueReached,
  });

  const checklist: CoachOnboardingChecklist = useMemo(() => ({
    spaceComplete: isClubProfileComplete(state.currentClub, state.aboutInfo),
    firstMemberAdded: members.length > 0,
    firstProgramAssigned: firstValueReached,
    firstSessionPlanned: Boolean(state.currentClub?.id && hasPlannedCoachSession(state.bookings || [], state.currentClub.id)),
    clientFollowUpViewed: followUpViewed,
  }), [state.currentClub, state.aboutInfo, members.length, firstValueReached, state.bookings, followUpViewed]);
  const progress = getOnboardingProgress(checklist, planningEnabled);
  const nextStep = getNextIncompleteCoachStep(checklist, planningEnabled);

  useEffect(() => {
    trackProductEventOnce('coach_first_login', coachKey, { role: coach.role });
    if (!coach.onboardingCompleted) trackProductEventOnce('coach_onboarding_started', coachKey, { memberCount: members.length });
  }, [coachKey, coach.role, coach.onboardingCompleted, members.length]);

  useEffect(() => {
    if (!firstValueReached || coach.onboardingCompleted || completionAttempted.current) return;
    if (!coach.firebaseUid) return;
    completionAttempted.current = true;
    updateDoc(doc(db, 'users', coach.firebaseUid), { onboardingCompleted: true })
      .then(() => {
        trackProductEventOnce('coach_onboarding_completed', coachKey);
        setState(previous => previous.user
          ? { ...previous, user: { ...previous.user, onboardingCompleted: true } }
          : previous);
      })
      .catch(error => {
        console.error('Unable to persist coach onboarding completion:', error);
        completionAttempted.current = false;
        showToast('Votre adhérent et son programme sont prêts, mais la progression ne peut pas être enregistrée pour le moment.', 'error');
      });
  }, [firstValueReached, coach.onboardingCompleted, coach.firebaseUid, coachKey, setState, showToast]);

  useEffect(() => {
    if (firstValueReached && !coach.onboardingCompleted) setShowSuccess(true);
  }, [firstValueReached, coach.onboardingCompleted]);

  useEffect(() => {
    if (!firstValueReached) return;
    setDismissed(false);
    try { window.localStorage.removeItem(dismissedStorageKey); } catch { /* keep in-memory state */ }
  }, [firstValueReached, dismissedStorageKey]);

  const openStep = (step: keyof CoachOnboardingChecklist) => {
    if (step === 'spaceComplete') setState(previous => ({ ...previous, page: 'about', pendingUiAction: 'edit-space' }));
    if (step === 'firstMemberAdded') setState(previous => ({ ...previous, page: 'users', pendingUiAction: 'add-member' }));
    if (step === 'firstProgramAssigned') {
      const target = members.find(member => !hasAssignedProgram([member], assignedPrograms)) || members[0];
      if (!target) {
        setState(previous => ({ ...previous, page: 'users', pendingUiAction: 'add-member' }));
        return;
      }
      const unfinishedProgram = assignedPrograms.find(program => Number(program.memberId) === Number(target.id));
      setState(previous => ({ ...previous, editingProg: unfinishedProgram || newProgramFor(target) }));
    }
    if (step === 'firstSessionPlanned') setState(previous => ({ ...previous, page: 'calendar' }));
    if (step === 'clientFollowUpViewed') {
      const member = memberWithProgram || members[0];
      if (!member) return;
      setFollowUpViewed(true);
      try { window.localStorage.setItem(followUpStorageKey, '1'); } catch { /* optional device-level resume marker */ }
      setState(previous => ({ ...previous, page: 'users', selectedMember: member }));
    }
  };

  const resume = () => {
    setDismissed(false);
    try { window.localStorage.removeItem(dismissedStorageKey); } catch { /* keep in-memory state */ }
  };

  const markSuccessSeen = () => setShowSuccess(false);
  const displayName = coach.name?.trim().split(/\s+/)[0] || '';

  if (stage === 'not-coach') return null;

  if (showSuccess && firstValueReached && memberWithProgram) {
    return (
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-8" aria-live="polite">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <VelatraMascot state="success" size={84} interactive={false} autoWave={false} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-800">Première étape franchie</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-zinc-900">{memberWithProgram.name} est prêt à commencer.</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">Un programme lui est associé. Vous pouvez maintenant démarrer son suivi dans Velatra.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => { markSuccessSeen(); openStep('clientFollowUpViewed'); }} className="min-h-11">Voir l’adhérent</Button>
              <Button variant="secondary" onClick={() => { markSuccessSeen(); setState(previous => ({ ...previous, page: 'home' })); }} className="min-h-11">Retour à l’accueil</Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (dismissed) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="coach-onboarding-resume">
        <div>
          <h1 id="coach-onboarding-resume" className="font-display text-xl font-semibold text-zinc-900">{stage === 'onboarding' ? `Votre espace vous attend${displayName ? `, ${displayName}` : ''}.` : 'Votre activité démarre.'}</h1>
          <p className="mt-1 text-sm text-zinc-600">{stage === 'onboarding' ? 'Reprenez la configuration pour préparer votre premier adhérent.' : `${members.length} adhérent${members.length > 1 ? 's' : ''} · ${assignedPrograms.length} programme${assignedPrograms.length > 1 ? 's' : ''} associé${assignedPrograms.length > 1 ? 's' : ''}.`}</p>
        </div>
        <Button onClick={resume} className="min-h-11 shrink-0">{stage === 'onboarding' ? 'Reprendre ma configuration' : 'Voir les prochaines actions'}</Button>
      </section>
    );
  }

  const activeStep = nextStep;
  const activeCopy = activeStep ? stepCopy[activeStep] : { title: 'Votre espace est prêt', action: 'Ouvrir mes adhérents', page: 'users' as const };
  const stepAction = () => activeStep ? openStep(activeStep) : setState(previous => ({ ...previous, page: 'users' }));
  const openProgramMethods = () => {
    const target = members.find(member => !hasAssignedProgram([member], assignedPrograms)) || members[0];
    if (target) setState(previous => ({ ...previous, page: 'users', selectedMember: target }));
  };
  const steps = (Object.keys(stepCopy) as Array<keyof CoachOnboardingChecklist>).filter(step => planningEnabled || step !== 'firstSessionPlanned');

  return (
    <div className="va-coach-start mx-auto w-full max-w-5xl space-y-5 pb-6">
      <section className="va-coach-start-panel rounded-3xl border border-zinc-200 bg-white p-5 sm:p-7" aria-labelledby="coach-onboarding-title">
        <div className="va-coach-start-intro grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-800">Espace coach · Premiers pas</p>
            <h1 id="coach-onboarding-title" className="mt-1 font-display text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Bienvenue dans Velatra{displayName ? `, ${displayName}` : ''}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Configurez votre espace et préparez votre premier adhérent.</p>
            <div className="mt-5 flex items-center gap-3" aria-label={`${progress.completed} étapes terminées sur ${progress.total}`}>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed}>
                <div className="h-full rounded-full bg-emerald-700 transition-[width]" style={{ width: `${Math.round(progress.completed / progress.total * 100)}%` }} />
              </div>
              <span className="shrink-0 text-sm font-semibold text-zinc-700">{progress.completed} / {progress.total}</span>
            </div>
          </div>
          <div className="hidden md:block" aria-hidden="true"><VelatraMascot state="idle" size={82} interactive={false} autoWave={false} /></div>
        </div>

        <div className="va-coach-start-action mt-6 rounded-2xl bg-[#f3f7f1] p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Votre prochaine action</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">{activeCopy.title}</h2>
          {activeStep === 'spaceComplete' && <p className="mt-2 text-sm text-zinc-700">Vérifiez votre email et ajoutez votre téléphone pour que vos adhérents puissent vous joindre.</p>}
          <Button onClick={stepAction} className="mt-4 min-h-11 w-full sm:w-auto">{activeCopy.action}</Button>
          {activeStep === 'firstMemberAdded' && members.length === 0 && (
            <button type="button" onClick={requestClubInviteDialog} className="mt-3 min-h-11 w-full rounded-xl px-4 text-sm font-semibold text-emerald-900 underline-offset-4 hover:bg-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:ml-2 sm:mt-0 sm:w-auto">
              Inviter avec mon code
            </button>
          )}
          {activeStep === 'firstProgramAssigned' && members.length > 0 && (
            <p className="mt-3 text-sm text-zinc-600">
              Vous préférez un modèle ou Velatra AI ?{' '}
              <button type="button" onClick={openProgramMethods} className="min-h-11 rounded-lg px-1 font-semibold text-emerald-900 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
                Choisir une autre méthode
              </button>
              <span className="block text-xs text-zinc-500">Les deux options existent dans la fiche de l’adhérent; l’IA prépare une proposition que vous vérifiez.</span>
            </p>
          )}
          {activeStep === 'firstSessionPlanned' && !planningEnabled && <p className="mt-2 text-sm text-zinc-600">Le planning est désactivé; cette étape ne bloque pas votre démarrage.</p>}
        </div>

        <div className="va-coach-start-checklist mt-6">
          <h2 className="text-sm font-semibold text-zinc-900">Votre parcours</h2>
          <ol className="mt-3 grid gap-2">
            {steps.map((step, index) => {
              const done = checklist[step] || (step === 'firstSessionPlanned' && !planningEnabled);
              const active = step === activeStep && !done;
              return (
                <li key={step} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 ${done ? 'border-emerald-200 bg-emerald-50' : active ? 'border-emerald-700 bg-white' : 'border-zinc-200 bg-zinc-50'}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? 'bg-emerald-700 text-white' : active ? 'bg-emerald-100 text-emerald-900' : 'bg-zinc-200 text-zinc-700'}`} aria-hidden="true">
                    {done ? <CheckCircleIcon size={16} /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800">{stepCopy[step].title}{step === 'firstSessionPlanned' && !planningEnabled ? ' · optionnel' : ''}</span>
                  {done && <span className="sr-only">Terminé</span>}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {stage === 'early' && (
        <section className="grid gap-3 sm:grid-cols-3" aria-label="Résumé de votre démarrage">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4"><UserIcon size={19} className="text-emerald-800" /><span className="text-sm text-zinc-700">{members.length} adhérent{members.length > 1 ? 's' : ''}</span></div>
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4"><CheckCircleIcon size={19} className="text-emerald-800" /><span className="text-sm text-zinc-700">{assignedPrograms.length} programme{assignedPrograms.length > 1 ? 's' : ''} associé{assignedPrograms.length > 1 ? 's' : ''}</span></div>
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4"><CalendarIcon size={19} className="text-emerald-800" /><span className="text-sm text-zinc-700">{(state.bookings || []).filter(booking => booking.clubId === coach.clubId && booking.status === 'confirmed').length} séance(s) planifiée(s)</span></div>
        </section>
      )}

      {stage === 'onboarding' && <div className="flex justify-end">
        <button type="button" onClick={() => { setDismissed(true); try { window.localStorage.setItem(dismissedStorageKey, '1'); } catch { /* keep in-memory state */ } }} className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
          Masquer pour l’instant
        </button>
      </div>}
      <div className="sr-only" aria-live="polite">Progression : {progress.completed} étapes terminées sur {progress.total}.</div>
    </div>
  );
};
