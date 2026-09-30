
import React, { useState, useEffect } from 'react';
import { AppState } from '../types';
import { Button, Badge } from './UI';
import { SparklesIcon, TargetIcon, CheckIcon, CalendarIcon } from './Icons';
import { apiFetch } from '../firebase';
import { motion } from 'framer-motion';
import { MemberWorkoutEntry } from './MemberWorkoutEntry';
import { MemberTrainingProgress } from './MemberTrainingProgress';
import { MemberFollowup } from './CoachingFollowup';
import { useWorkoutDraft } from './useWorkoutDraft';

interface MemberDashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (m: string, t?: any) => void;
  onToggleTimer: () => void;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } as any }
};

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ state, setState, showToast, onToggleTimer }) => {
  const user = state.user!;
  const draft = useWorkoutDraft(user);
  const hasWorkout = Boolean(draft || state.programs.some(item => item.clubId === user.clubId && Number(item.memberId) === Number(user.id) && !item.isPlannedSession));
  // Daily Habits check-in states
  const [water, setWater] = useState(1.5);
  const [sleep, setSleep] = useState(7.5);
  const [proteinOk, setProteinOk] = useState(false);
  const [mood, setMood] = useState(4);
  const [savedCheckInDate, setSavedCheckInDate] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<{ name: string; objective: string } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const isCheckedInToday = user.lastCheckInDate === todayStr || savedCheckInDate === todayStr;

  useEffect(() => {
    let current = true;
    apiFetch('/api/member/daily-checkin/today')
      .then(async response => {
        if (!response.ok) throw new Error('Impossible de charger le suivi du jour.');
        const result = await response.json();
        if (!current || !result.checkIn) return;
        setWater(Number(result.checkIn.waterLitres) || 0);
        setSleep(Number(result.checkIn.sleepHours) || 0);
        setProteinOk(Boolean(result.checkIn.proteinTargetMet));
        setMood(Number(result.checkIn.mood) || 4);
        setSavedCheckInDate(String(result.checkIn.date || todayStr));
      })
      .catch(error => console.warn('Daily check-in could not be loaded:', error));
    return () => { current = false; };
  }, [user.firebaseUid, todayStr]);

  const handleDailyCheckIn = async () => {
    if (isCheckedInToday || isCheckingIn) return;
    setIsCheckingIn(true);
    try {
      const response = await apiFetch('/api/member/daily-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waterLitres: water,
          sleepHours: sleep,
          proteinTargetMet: proteinOk,
          mood
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible d'enregistrer le suivi du jour.");

      const newXp = Number(result.xp) || 0;
      const newStreak = Number(result.streak) || 0;
      setSavedCheckInDate(todayStr);

      setState(prev => {
        const cachedUser = {
          ...prev.user!,
          xp: newXp,
          streak: newStreak,
          lastCheckInDate: todayStr
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('velatra_cache_user', JSON.stringify(cachedUser));
          } catch (e) {}
        }
        return {
          ...prev,
          user: cachedUser,
          users: prev.users.map(u => u.id === user.id ? cachedUser : u)
        };
      });

      showToast(result.alreadyCompleted ? "Ton suivi du jour est déjà enregistré." : "Suivi du jour enregistré · +50 XP", "success");

    } catch (err) {
      console.error(err);
      showToast("Erreur d'enregistrement", "error");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const nextBooking = state.bookings
    .filter(booking => booking.memberId === Number(user.id) && booking.status === 'confirmed' && new Date(booking.startTime).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  const nextBookingCoach = nextBooking ? state.users.find(person => person.firebaseUid === nextBooking.coachId || String(person.id) === nextBooking.coachId) : undefined;
  const canBook = state.currentClub?.settings?.booking?.enabled !== false;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="va-member-dashboard va-member-page page-transition pb-24"
    >
      <header className="va-today-heading"><p>Aujourd’hui</p><h1>Bonjour {user.name.split(' ')[0]}</h1></header>

      {hasWorkout && <MemberWorkoutEntry state={state} setState={setState} />}
      <div className="va-member-followup"><MemberFollowup showJourney={false} hasPrimaryWorkout={hasWorkout} onPhaseChange={setCurrentPhase} /></div>
      {!hasWorkout && <MemberWorkoutEntry state={state} setState={setState} quietEmpty />}
      {nextBooking && (
        <motion.section variants={itemVariants} className="px-2">
          <button type="button" onClick={() => setState(prev => ({ ...prev, page: 'planning' }))} className="flex w-full items-center gap-4 rounded-2xl border border-emerald-900/10 bg-white p-4 text-left shadow-sm transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 sm:p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900"><CalendarIcon size={22} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-zinc-900">Prochain rendez-vous</span>
              <span className="mt-0.5 block text-sm text-zinc-700">{new Date(nextBooking.startTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {new Date(nextBooking.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{nextBookingCoach?.name ? ` · ${nextBookingCoach.name}` : ''}</span>
            </span>
            <span className="shrink-0 text-sm font-medium text-emerald-900">Voir <span aria-hidden="true">→</span></span>
          </button>
        </motion.section>
      )}
      {!nextBooking && <section className="va-member-coach-row"><div><h2>Prochain rendez-vous</h2><p>{canBook ? 'Aucun créneau réservé.' : 'Les réservations sont momentanément indisponibles.'}</p></div>{canBook && <button type="button" className="va-member-text-link" onClick={() => setState(previous => ({ ...previous, page: 'planning' }))}>Réserver une séance →</button>}</section>}
      <section aria-label="Mon coach et mon objectif" className="va-member-coach-row">
        <div><h2>{currentPhase ? 'Phase et objectif actuels' : 'Mon objectif'}</h2>{currentPhase && <p><strong>{currentPhase.name}</strong>{currentPhase.objective ? ` · ${currentPhase.objective}` : ''}</p>}<p>{user.objectifs?.[0] || 'À définir avec votre coach'}</p></div>
        <button type="button" className="va-member-text-link" onClick={() => setState(previous => ({ ...previous, page: 'messages' }))}>Écrire à mon coach <span aria-hidden="true">→</span></button>
      </section>
      <MemberTrainingProgress state={state} setState={setState} compact />

      <details className="va-member-disclosure"><summary>Suivi quotidien rapide{isCheckedInToday ? " · enregistré" : ""}</summary><p className="text-sm text-zinc-700">Eau, sommeil, protéines et humeur. Ce repère personnel est distinct des bilans de votre coach.</p>
      <motion.section variants={itemVariants} className="px-2">
        <div className="va-daily-checkin">

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <SparklesIcon size={16} className="text-emerald-800" /> Suivi du jour
            </h3>
            <Badge className={isCheckedInToday ? "bg-emerald-100 text-emerald-900 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-200"}>
              {isCheckedInToday ? "Enregistré" : "À compléter"}
            </Badge>
          </div>

          {isCheckedInToday ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 text-center shadow-inner"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-900 border border-emerald-200">
                <CheckIcon size={24} />
              </div>
              <h4 className="text-base font-semibold text-zinc-900 mb-1">Suivi du jour enregistré</h4>
              <p className="text-sm text-zinc-700 leading-normal max-w-xs mx-auto">
                Série en cours : <span className="text-emerald-900 font-semibold">{user.streak || 0} jours</span>.
              </p>
            </motion.div>
          ) : (
            <div className="va-checkin-fields space-y-4">
              {/* Mood Slider */}
              <div className="va-checkin-mood bg-white rounded-2xl p-4 border border-zinc-100">
                <span className="text-xs font-medium text-zinc-700 block mb-2">Humeur et énergie</span>
                <div className="flex justify-between gap-1">
                  {[
                    { val: 1, label: "😭" },
                    { val: 2, label: "🙁" },
                    { val: 3, label: "😐" },
                    { val: 4, label: "🙂" },
                    { val: 5, label: "😊" }
                  ].map(m => (
                    <button
                      key={m.val}
                      onClick={() => setMood(m.val)}
                      type="button"
                      aria-pressed={mood === m.val}
                      aria-label={`Humeur ${m.val} sur 5`}
                      className={`min-h-11 flex-1 py-1.5 text-xl rounded-xl transition-colors ${
                        mood === m.val
                          ? 'bg-zinc-100 border border-zinc-300 shadow-sm'
                          : 'opacity-50 hover:opacity-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Hydration */}
                <div className="bg-white rounded-2xl p-4 border border-zinc-100 flex flex-col justify-between">
                  <div>
                <span className="text-xs font-medium text-zinc-700 block mb-1">Hydratation</span>
                    <span className="text-lg font-semibold text-emerald-900">{water} L</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => setWater(prev => Math.max(0.5, Number((prev - 0.5).toFixed(1))))}
                      type="button"
                      aria-label="Diminuer l’hydratation"
                      className="min-h-11 min-w-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 font-semibold text-zinc-800 flex items-center justify-center border border-zinc-200"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setWater(prev => Math.min(4.0, Number((prev + 0.5).toFixed(1))))}
                      type="button"
                      aria-label="Augmenter l’hydratation"
                      className="min-h-11 min-w-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 font-semibold text-zinc-800 flex items-center justify-center border border-zinc-200"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Sleep */}
                <div className="bg-white rounded-2xl p-4 border border-zinc-100 flex flex-col justify-between">
                  <div>
                <span className="text-xs font-medium text-zinc-700 block mb-1">Sommeil</span>
                    <span className="text-lg font-semibold text-emerald-900">{sleep} h</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => setSleep(prev => Math.max(4, Number((prev - 0.5).toFixed(1))))}
                      type="button"
                      aria-label="Diminuer le sommeil"
                      className="min-h-11 min-w-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 font-semibold text-zinc-800 flex items-center justify-center border border-zinc-200"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setSleep(prev => Math.min(12, Number((prev + 0.5).toFixed(1))))}
                      type="button"
                      aria-label="Augmenter le sommeil"
                      className="min-h-11 min-w-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 font-semibold text-zinc-800 flex items-center justify-center border border-zinc-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Protein Target */}
              <button
                onClick={() => setProteinOk(!proteinOk)}
                type="button"
                className={`w-full rounded-2xl p-4 border flex items-center justify-between transition-all ${
                  proteinOk
                    ? 'bg-zinc-100 border-zinc-300 shadow-sm'
                    : 'bg-white border-zinc-100 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${proteinOk ? 'bg-emerald-500 text-zinc-950 shadow' : 'bg-zinc-100 text-zinc-400'}`}>
                    <TargetIcon size={16} />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-medium text-zinc-700 block">Objectif nutrition</span>
                    <span className="text-xs font-bold text-zinc-900">Protéines quotidiennes atteintes</span>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${proteinOk ? 'bg-emerald-500 border-zinc-300 text-zinc-950' : 'border-zinc-300 bg-white'}`}>
                  {proteinOk && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </button>

              {/* Validation Button */}
              <Button
                onClick={handleDailyCheckIn}
                disabled={isCheckingIn}
                className="w-full !py-3.5 bg-emerald-700 text-white hover:bg-emerald-800 font-semibold text-sm !rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
              >
                {isCheckingIn ? "Enregistrement…" : "Enregistrer mon suivi"}
              </Button>
            </div>
          )}
        </div>
      </motion.section>
      </details>
    </motion.div>
  );
};
