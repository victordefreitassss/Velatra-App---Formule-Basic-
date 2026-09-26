
import React, { useState, useEffect } from 'react';
import { AppState, Message, FeedItem } from '../types';
import { Card, StatBox, Button, Badge, Input } from './UI';
import { getLevel, formatDate } from '../utils';
import { CalendarIcon, RefreshCwIcon, TargetIcon, BarChartIcon, TrophyIcon, FlameIcon, SparklesIcon, MessageCircleIcon, ShoppingCartIcon, GiftIcon, MegaphoneIcon, BotIcon, SendIcon } from './Icons';
import { BodyHeatmap } from './BodyHeatmap';
import { apiFetch, db, doc, updateDoc, setDoc } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '../services/aiService';
import confetti from 'canvas-confetti';

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
  const myLogs = state.logs.filter(l => Number(l.memberId) === Number(user.id));
  const level = getLevel(user.xp); 
  const program = state.programs.find(p => Number(p.memberId) === Number(user.id) && !p.isPlannedSession);
  const lastArchive = state.archivedPrograms
    .filter(p => Number(p.memberId) === Number(user.id))
    .sort((a, b) => new Date((b as any).endDate || 0).getTime() - new Date((a as any).endDate || 0).getTime())[0];
  
  // Compute muscle fatigue based on recent logs (last 7 days)
  const muscleData: Record<string, 'fatigued' | 'recovering' | 'fresh'> = {};
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentLogs = myLogs.filter(l => new Date(l.date) >= sevenDaysAgo);
  recentLogs.forEach(log => {
    log.exercises?.forEach(logEx => {
      const ex = state.exercises.find(e => e.id === logEx.exId);
      if (ex) {
        const daysAgo = (new Date().getTime() - new Date(log.date).getTime()) / (1000 * 3600 * 24);
        let status: 'fatigued' | 'recovering' | 'fresh' = 'fresh';
        if (daysAgo <= 2) status = 'fatigued';
        else if (daysAgo <= 4) status = 'recovering';
        
        let muscle = '';
        if (ex.cat === 'Poitrine') muscle = 'chest';
        else if (ex.cat === 'Dos') muscle = 'back'; // Will map to shoulders/arms in SVG if needed
        else if (ex.cat === 'Jambes') muscle = 'legs';
        else if (ex.cat === 'Épaules') muscle = 'shoulders';
        else if (ex.cat === 'Bras') muscle = 'arms';
        else if (ex.cat === 'Abdos') muscle = 'core';
        
        if (muscle) {
          // Only override if more fatigued
          if (!muscleData[muscle] || status === 'fatigued' || (status === 'recovering' && muscleData[muscle] === 'fresh')) {
            muscleData[muscle] = status;
          }
        }
      }
    });
  });

  const [remark, setRemark] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [isSavingRemark, setIsSavingRemark] = useState(false);

  // Daily Habits check-in states
  const [water, setWater] = useState(1.5);
  const [sleep, setSleep] = useState(7.5);
  const [proteinOk, setProteinOk] = useState(false);
  const [mood, setMood] = useState(4);
  const [savedCheckInDate, setSavedCheckInDate] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState<number | null>(null);

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
      const prevXp = Number(user.xp) || 0;
      const newLvl = Math.floor(newXp / 1000) + 1;
      const didLevelUp = !result.alreadyCompleted && newLvl > Math.floor(prevXp / 1000) + 1;
      setSavedCheckInDate(todayStr);

      if (!result.alreadyCompleted) {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      }

      // Send to Feed
      if (!result.alreadyCompleted) {
        try {
          const feedId = `checkin_${user.id}_${Date.now()}`;
          const newFeedItem: FeedItem = {
            id: Date.now(),
            clubId: user.clubId,
            userId: user.id,
            userName: user.name,
            type: 'session',
            title: `🔥 Rituel quotidien validé ! (Série de ${newStreak} jours)`,
            date: new Date().toISOString()
          };
          await setDoc(doc(db, "feed", feedId), newFeedItem);
        } catch (feedError) {
          console.warn('Check-in saved; feed announcement was skipped.', feedError);
        }
      }

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

      showToast(result.alreadyCompleted ? "Ton rituel du jour est déjà enregistré." : "Rituel du jour complété ! +50 XP 🔥", "success");

      if (didLevelUp) {
        setShowLevelUpModal(newLvl);
        setTimeout(() => {
          confetti({
            particleCount: 180,
            spread: 90,
            origin: { y: 0.5 }
          });
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur d'enregistrement", "error");
    } finally {
      setIsCheckingIn(false);
    }
  };

  useEffect(() => {
    if (program?.memberRemarks) {
      setRemark(program.memberRemarks);
    }
  }, [program?.id, program?.memberRemarks]);

  const getAiAdvice = async () => {
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: 'PROXY' });
      const recentPerfs = state.performances
        .filter(p => Number(p.memberId) === Number(user.id))
        .slice(-5)
        .map(p => `${p.exId}: ${p.weight}kg x ${p.reps}`)
        .join(', ');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `En tant que coach expert VELATRA, donne un conseil ultra-court et motivant (max 15 mots) pour cet athlète dont les dernières perfs sont : ${recentPerfs}. Son objectif est : ${(user.objectifs || []).join(', ')}.`
      });
      
      setState(prev => ({ ...prev, aiSuggestion: response.text }));
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const saveRemark = async () => {
    if (!program) {
      showToast("Aucun programme actif pour envoyer une remarque.", "error");
      return;
    }
    setIsSavingRemark(true);
    try {
      const response = await apiFetch('/api/member/assigned-coach');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible de charger votre coach.");
      if (!result.coach) throw new Error("Aucun coach n'est affecté à votre compte. Contactez le responsable du club.");

      // Keep the remark private in the assigned coach's conversation. Members
      // cannot write to the coach-owned program document under the Firestore rules.
      const messageId = Date.now().toString();
      const newMessage: Message = {
        id: Date.now(),
        clubId: user.clubId,
        assignedCoachUid: result.coach.firebaseUid,
        from: user.id,
        to: Number(result.coach.id),
        text: `[REMARQUE PROGRAMME] : ${remark}`,
        date: new Date().toISOString(),
        read: false,
        file: null
      };
      await setDoc(doc(db, "messages", messageId), newMessage);
      setRemark("");
      showToast("Remarque transmise au coach !");
    } catch (err) {
      console.error("Error saving remark:", err);
      showToast(err instanceof Error ? err.message : "Erreur d'envoi. Réessayez.", "error");
    } finally {
      setIsSavingRemark(false);
    }
  };

  const requestPlan = async () => {
    try {
      const userRef = doc(db, "users", (user as any).firebaseUid);
      await updateDoc(userRef, { planRequested: true });
      
      // Alerte Coach
      const feedId = Date.now().toString();
      const newFeedItem: FeedItem = {
        id: Date.now(),
        clubId: user.clubId,
        userId: user.id,
        userName: user.name,
        type: 'session',
        title: `Demande de Plan : ${user.name} attend son nouveau cycle !`,
        date: new Date().toISOString()
      };
      await setDoc(doc(db, "feed", feedId), newFeedItem);

      showToast("Demande envoyée au coach ! 🔥");
    } catch (err) {
      showToast("Erreur", "error");
    }
  };

  useEffect(() => {
    if (!state.aiSuggestion) getAiAdvice();
  }, []);

  const myOrders = state.supplementOrders.filter(o => Number(o.adherentId) === Number(user.id));
  const totalSpent = myOrders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + curr.total, 0);
  const latestNewsletter = state.newsletters?.[0];
  const nextBooking = state.bookings
    .filter(booking => booking.memberId === Number(user.id) && booking.status === 'confirmed' && new Date(booking.startTime).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  const nextBookingCoach = nextBooking ? state.users.find(person => person.firebaseUid === nextBooking.coachId || String(person.id) === nextBooking.coachId) : undefined;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="va-member-dashboard space-y-6 page-transition pb-24"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex items-center justify-between px-2 pt-2">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight leading-none mb-1 text-zinc-900">Salut, {user.name.split(' ')[0]}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <span className="text-zinc-600">{formatDate(new Date().toISOString())}</span>
            <div className="flex items-center gap-1.5 text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-900/10">
               <FlameIcon size={13} /> {user.streak || 0} jours de suite
            </div>
          </div>
        </div>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative" 
          onClick={() => setState(s => ({ ...s, page: 'profile' }))}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-800 flex items-center justify-center font-semibold text-lg text-white ring-2 ring-zinc-200 cursor-pointer overflow-hidden">
            {user.avatar?.startsWith('http') ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.avatar || user.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-zinc-900 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full ring-2 ring-white">
            LVL {Math.floor(user.xp / 1000) + 1}
          </div>
        </motion.div>
      </motion.div>

      {nextBooking && (
        <motion.section variants={itemVariants} className="px-2">
          <button type="button" onClick={() => setState(prev => ({ ...prev, page: 'planning' }))} className="flex w-full items-center gap-4 rounded-2xl border border-emerald-900/10 bg-white p-4 text-left shadow-sm transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 sm:p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900"><CalendarIcon size={22} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-zinc-900">Prochaine séance</span>
              <span className="mt-0.5 block truncate text-sm text-zinc-700">{new Date(nextBooking.startTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {new Date(nextBooking.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{nextBookingCoach?.name ? ` · ${nextBookingCoach.name}` : ''}</span>
            </span>
            <span className="shrink-0 text-sm font-medium text-emerald-900">Voir <span aria-hidden="true">→</span></span>
          </button>
        </motion.section>
      )}

      {/* Main Action: Today's Session */}
      <motion.section variants={itemVariants} className="px-2">
        {program ? (
          <motion.button
            type="button"
            aria-label={`Ouvrir le programme ${program.name}`}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setState(prev => ({ ...prev, page: 'calendar' }))}
            className="w-full text-left bg-zinc-50 rounded-2xl p-5 sm:p-7 relative overflow-hidden shadow-sm cursor-pointer transition-colors border border-zinc-200 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 to-transparent" />

            <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-900/5 rounded-full" />

            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 pr-4">
                  <Badge className="bg-zinc-100 text-zinc-900 border-zinc-300 backdrop-blur-md mb-4 font-bold tracking-widest text-[11px]">
                    S{Math.floor((program.currentDayIndex || 0) / (program.nbDays || 1)) + 1} {program.durationWeeks ? `/ ${program.durationWeeks}` : ''} • J{((program.currentDayIndex || 0) % (program.nbDays || 1)) + 1}
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-zinc-900 leading-tight mb-2">
                    {program.days[program.currentDayIndex % program.nbDays]?.name || 'Séance du jour'}
                  </h2>
                  <p className="text-zinc-500 text-sm font-medium">
                    {program.name} • Objectif: {user.objectifs?.[0] || 'Général'}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-zinc-900 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform duration-500">
                  <TargetIcon size={24} />
                </div>
              </div>

              <div className="flex items-center justify-between bg-white backdrop-blur-md rounded-2xl p-4 border border-zinc-200 group-hover:bg-zinc-100 transition-colors">
                <span className="font-black text-zinc-900 tracking-widest text-sm uppercase">Démarrer l'entraînement</span>
                <motion.div
                  className="w-10 h-10 rounded-full bg-emerald-500 text-zinc-900 flex items-center justify-center shadow-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </motion.div>
              </div>
            </div>
          </motion.button>
        ) : (
          <div className="space-y-3">
            {lastArchive && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <TrophyIcon size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Cycle Terminé</div>
                  <div className="text-xs font-bold text-zinc-900">Bravo pour "{lastArchive.name}" !</div>
                </div>
              </motion.div>
            )}
            <motion.div 
              whileHover={!user.planRequested ? { scale: 1.02 } : {}}
              whileTap={!user.planRequested ? { scale: 0.98 } : {}}
              onClick={!user.planRequested ? requestPlan : undefined}
              className={`rounded-3xl p-6 text-center border-2 border-dashed transition-all ${user.planRequested ? 'bg-zinc-50 border-zinc-200 cursor-default' : 'bg-emerald-500/5 border-emerald-500/30 cursor-pointer'}`}
            >
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${user.planRequested ? 'bg-white text-zinc-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                <CalendarIcon size={24} />
              </div>
              <h3 className="text-lg font-black text-zinc-900 italic mb-1">Nouveau Cycle</h3>
              <p className="text-xs text-zinc-500 font-bold mb-4">Prêt pour la suite de ton évolution ?</p>
              <Button variant={user.planRequested ? "glass" : "primary"} disabled={user.planRequested} className="w-full !py-4 !rounded-xl">
                {user.planRequested ? "DEMANDE EN COURS..." : "DEMANDER MON PROGRAMME"}
              </Button>
            </motion.div>
          </div>
        )}
      </motion.section>

      {/* Daily Ritual Habit Check-In Widget */}
      <motion.section variants={itemVariants} className="px-2">
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
              <SparklesIcon size={16} className="text-emerald-800" /> Suivi du jour
            </h3>
            <Badge className={isCheckedInToday ? "bg-emerald-100 text-emerald-900 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-200"}>
              {isCheckedInToday ? "Enregistré" : "À compléter · +50 XP"}
            </Badge>
          </div>

          {isCheckedInToday ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 text-center shadow-inner"
            >
              <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-500 border border-emerald-500/20 shadow-inner">
                <FlameIcon size={32} fill="currentColor" />
              </div>
              <h4 className="text-base font-black text-zinc-900 mb-1">Rituel du Jour Enregistré !</h4>
              <p className="text-xs text-zinc-500 font-bold leading-normal max-w-xs mx-auto">
                Bravo ! Ta série de <span className="text-emerald-500 font-black">{user.streak || 0}</span> jours consécutifs est préservée. Ton corps te remerciera. À demain pour un nouveau rituel !
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {/* Mood Slider */}
              <div className="bg-white rounded-2xl p-4 border border-zinc-100">
                <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider block mb-2">Humeur & Énergie</span>
                <div className="flex justify-between gap-1">
                  {[
                    { val: 1, label: "😭" },
                    { val: 2, label: "🙁" },
                    { val: 3, label: "😐" },
                    { val: 4, label: "🙂" },
                    { val: 5, label: "🔥" }
                  ].map(m => (
                    <button
                      key={m.val}
                      onClick={() => setMood(m.val)}
                      type="button"
                      className={`flex-1 py-1.5 text-xl rounded-xl transition-all ${
                        mood === m.val 
                          ? 'bg-zinc-100 border border-zinc-250 scale-105 shadow-sm' 
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
                    <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Hydratation (L)</span>
                    <span className="text-lg font-black text-sky-500">{water} L</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => setWater(prev => Math.max(0.5, Number((prev - 0.5).toFixed(1))))}
                      type="button"
                      className="w-8 h-8 rounded-xl bg-zinc-50 hover:bg-zinc-100 font-black text-zinc-700 flex items-center justify-center border border-zinc-200"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setWater(prev => Math.min(4.0, Number((prev + 0.5).toFixed(1))))}
                      type="button"
                      className="w-8 h-8 rounded-xl bg-zinc-50 hover:bg-zinc-100 font-black text-zinc-700 flex items-center justify-center border border-zinc-200"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Sleep */}
                <div className="bg-white rounded-2xl p-4 border border-zinc-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Sommeil (H)</span>
                    <span className="text-lg font-black text-indigo-500">{sleep} H</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => setSleep(prev => Math.max(4, Number((prev - 0.5).toFixed(1))))}
                      type="button"
                      className="w-8 h-8 rounded-xl bg-zinc-50 hover:bg-zinc-100 font-black text-zinc-700 flex items-center justify-center border border-zinc-200"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setSleep(prev => Math.min(12, Number((prev + 0.5).toFixed(1))))}
                      type="button"
                      className="w-8 h-8 rounded-xl bg-zinc-50 hover:bg-zinc-100 font-black text-zinc-700 flex items-center justify-center border border-zinc-200"
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
                    <TrophyIcon size={16} />
                  </div>
                  <div className="text-left">
                    <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider block">Objectif Nutrition</span>
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
                className="w-full !py-4 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] font-black text-xs uppercase tracking-wider !rounded-2xl transition-all"
              >
                {isCheckingIn ? "ENREGISTREMENT..." : "VALIDER MON RITUEL DU JOUR (+50 XP)"}
              </Button>
            </div>
          )}
        </div>
      </motion.section>

      {/* Leveling & Gamification Center */}
      <motion.div variants={itemVariants} className="px-2">
        <div className="bg-zinc-50 border border-zinc-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <TrophyIcon size={18} className="text-amber-700" />
              <span className="text-xs font-black text-zinc-900 uppercase tracking-widest">Aventure Fitness : Niveau {Math.floor(user.xp / 1000) + 1}</span>
            </div>
            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">{user.xp % 1000}/1000 XP</span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-3 bg-zinc-200 rounded-full overflow-hidden relative shadow-inner mb-4">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(user.xp % 1000) / 10}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-emerald-800 rounded-full relative"
            >
            </motion.div>
          </div>

          <p className="text-[11px] text-zinc-500 font-bold leading-tight mb-4">
            Astuce : Rentre ton rituel quotidien et valide tes séances pour gagner {1000 - (user.xp % 1000)} XP et passer au niveau {Math.floor(user.xp / 1000) + 2} !
          </p>

          {/* Week overview */}
          <div className="border-t border-zinc-200 pt-4">
            <span className="text-[11px] font-black uppercase text-zinc-500 tracking-wider block mb-2 text-center">Série Hebdomadaire</span>
            <div className="grid grid-cols-7 gap-1">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, idx) => {
                const currentDayOfWeek = (new Date().getDay() + 6) % 7;
                const isToday = idx === currentDayOfWeek;
                const isPast = idx < currentDayOfWeek;
                const isChecked = isPast || (isToday && isCheckedInToday);

                return (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-bold text-zinc-400">{day}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isChecked
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : isToday
                          ? 'bg-amber-50 border border-amber-700 text-amber-900'
                          : 'bg-zinc-100 text-zinc-400 border border-transparent'
                    }`}>
                      {isChecked ? (
                        <FlameIcon size={14} fill="currentColor" className="text-zinc-950" />
                      ) : (
                        <span className="text-[11px] font-black">{idx + 1}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Coach Quick Access */}
      <motion.section variants={itemVariants} className="px-2">
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setState(s => ({ ...s, page: 'ai_coach' }))}
          className="bg-zinc-50 border border-zinc-200 rounded-[2rem] p-6 cursor-pointer transition-all relative overflow-hidden shadow-sm hover:shadow-md group"
        >
          <div className="absolute -right-4 -top-4 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors duration-500">
            <MessageCircleIcon size={120} />
          </div>
          <div className="relative z-10 flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <MessageCircleIcon size={28} />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Discussions</h3>
              </div>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                Échange avec ton coach ou le Coach IA.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Quick Stats Grid */}
      <motion.section variants={itemVariants} className="px-2 grid grid-cols-2 gap-4">
        <motion.div 
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setState(s => ({ ...s, page: 'history' }))}
          className="bg-zinc-50 border border-zinc-200 rounded-[2rem] p-6 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md group"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-500"><CalendarIcon size={24} /></div>
          <div>
            <div className="text-3xl font-display font-bold text-zinc-900 leading-none mb-1">{myLogs.length}</div>
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Sessions</div>
          </div>
        </motion.div>
        <motion.div 
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setState(s => ({ ...s, page: 'performances' }))}
          className="bg-zinc-50 border border-zinc-200 rounded-[2rem] p-6 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md group"
        >
          <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-500"><TrophyIcon size={24} /></div>
          <div>
            <div className="text-3xl font-display font-bold text-zinc-900 leading-none mb-1">{state.performances.filter(p => Number(p.memberId) === Number(user.id)).length}</div>
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Records</div>
          </div>
        </motion.div>
      </motion.section>

      {/* Newsletter / Announcements (Swipeable or compact) */}
      {latestNewsletter && (
        <motion.section variants={itemVariants} className="px-2">
          <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <MegaphoneIcon size={16} className="text-emerald-500" />
              <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Annonce du Club</span>
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">{latestNewsletter.title}</h3>
            <p className="text-xs text-zinc-500 line-clamp-2">{latestNewsletter.content.replace(/[*_#]/g, '')}</p>
          </div>
        </motion.section>
      )}

      {/* Body Heatmap Section */}
      <motion.section variants={itemVariants} className="px-2">
        <div className="bg-zinc-50 border border-zinc-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
              <FlameIcon size={16} className="text-orange-500" /> État Musculaire
            </h3>
            <div className="flex gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div>Fatigué</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div>En récup</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div>Frais</div>
            </div>
          </div>
          <div className="py-2">
            <BodyHeatmap muscleData={muscleData} />
          </div>
        </div>
      </motion.section>

      {/* Coach Feedback */}
      {program && (
        <motion.section variants={itemVariants} className="px-2">
          <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-5">
            <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-3">
              <MessageCircleIcon size={14} className="text-zinc-500" /> Mot au coach
            </h3>
            <div className="flex gap-2">
              <Input 
                placeholder="Une douleur ? Trop facile ?" 
                className="!py-3 !text-xs flex-1 !bg-white !border-none !text-zinc-900 placeholder:text-zinc-500"
                value={remark}
                onChange={e => setRemark(e.target.value)}
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isSavingRemark || !remark || remark === (program?.memberRemarks || "")}
                onClick={saveRemark}
                className="w-12 h-12 rounded-xl bg-emerald-500 text-zinc-900 flex items-center justify-center disabled:opacity-30 transition-all"
              >
                {isSavingRemark ? <RefreshCwIcon size={16} className="animate-spin" /> : <SendIcon size={16} />}
              </motion.button>
            </div>
          </div>
        </motion.section>
      )}

      {/* Celebratory Level Up Overlay Modal */}
      <AnimatePresence>
        {showLevelUpModal !== null && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-white border border-zinc-200 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              {/* Decorative radial gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-yellow-300/10 via-transparent to-transparent pointer-events-none" />
              
              {/* Particle animation placeholder */}
              <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-400/20 shadow-xl relative animate-pulse">
                <TrophyIcon size={40} className="text-yellow-500" />
                <motion.div 
                  className="absolute inset-0 rounded-full border-2 border-yellow-400"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>

              <h3 className="text-2xl font-display font-black text-zinc-900 leading-tight mb-2">
                NIVEAU SUPÉRIEUR ! 🎉
              </h3>
              
              <div className="inline-block bg-zinc-900 text-yellow-400 font-extrabold text-xs px-4 py-1.5 rounded-full mb-6 tracking-widest uppercase">
                TU ES NIVEAU {showLevelUpModal}
              </div>

              <p className="text-sm text-zinc-500 font-medium leading-relaxed mb-6">
                Chaque effort paye. Ton coach a été prévenu de ta progression héroïque. Continue de valider tes séances et tes rituels quotidiens pour atteindre les sommets !
              </p>

              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-150 mb-6 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                  <span className="text-emerald-500">✔</span> Avatar de profil amélioré
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                  <span className="text-emerald-500">✔</span> Statut actif sur le fil du club
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                  <span className="text-emerald-500">✔</span> Respect éternel de ton coach
                </div>
              </div>

              <button
                onClick={() => setShowLevelUpModal(null)}
                type="button"
                className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white text-xs font-bold tracking-widest uppercase rounded-2xl shadow-lg shadow-zinc-900/10 transition-all font-sans"
              >
                Continuer l'aventure
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
