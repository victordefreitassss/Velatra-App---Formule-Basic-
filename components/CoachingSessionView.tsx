import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Program, User, AppState, SessionLog, Performance } from '../types';
import { Button, Input, Badge } from './UI';
import { XIcon, CheckIcon, DumbbellIcon, InfoIcon, RefreshCwIcon, SparklesIcon, TrophyIcon, VideoIcon, MessageCircleIcon, PlayCircleIcon, PlusIcon, SaveIcon, ArrowRightIcon, ArrowLeftIcon, ClockIcon, Trash2Icon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

import { db, doc, updateDoc } from '../firebase';

const getTargetRepsForSet = (repsString: string | number | undefined, setIndex: number): string => {
  if (typeof repsString === 'number') return String(repsString);
  if (!repsString) return '';
  const parts = repsString.split(',').map(s => s.trim());
  if (parts.length === 0) return '';
  if (setIndex < parts.length) return parts[setIndex];
  return parts[parts.length - 1];
};

interface CoachingSessionViewProps {
  program: Program;
  member: User;
  onClose: () => void;
  onComplete: (log: SessionLog, perfs: Performance[]) => void;
  state: AppState;
  showToast: (m: string, t?: any) => void;
  isProgramSession?: boolean;
}

export const CoachingSessionView: React.FC<CoachingSessionViewProps> = ({ program, member, onClose, onComplete, state, showToast, isProgramSession }) => {
  const currentDay = program.days[program.currentDayIndex % program.nbDays];
  const [sessionExercises, setSessionExercises] = useState(currentDay.exercises);
  
  // State for session data (weight, reps per set)
  const [sessionData, setSessionData] = useState<Record<string, string>>(() => {
    const initialData: Record<string, string> = {};
    
    // Find the last session log for this specific day to pre-fill data
    const lastLog = state.logs
      ?.filter(l => l.memberId === Number(member.id) && l.dayName === currentDay.name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    sessionExercises.forEach((exEntry, exIndex) => {
      const numSets = typeof exEntry.sets === 'number' ? exEntry.sets : parseInt(exEntry.sets) || 1;
      const baseEx = state.exercises.find(e => e.id === exEntry.exId);
      const lastPerf = baseEx?.perfId ? state.performances.filter(p => p.memberId === Number(member.id) && p.exId === baseEx.perfId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

      // Find if this exercise was in the last log
      const lastLogEx = lastLog?.exercises?.find(e => e.exId === exEntry.exId);

      for (let i = 0; i < numSets; i++) {
        // Pre-fill reps
        const targetReps = getTargetRepsForSet(exEntry.reps, i);
        if (lastLogEx && lastLogEx.sets[i] && lastLogEx.sets[i].reps) {
          initialData[`${exIndex}-${i}-reps`] = lastLogEx.sets[i].reps;
        } else if (targetReps) {
          initialData[`${exIndex}-${i}-reps`] = targetReps;
        }

        // Pre-fill weight
        if (lastLogEx && lastLogEx.sets[i] && lastLogEx.sets[i].weight) {
          initialData[`${exIndex}-${i}-weight`] = lastLogEx.sets[i].weight;
        } else if (lastPerf && lastPerf.weight) {
          initialData[`${exIndex}-${i}-weight`] = String(lastPerf.weight);
        }

        // Pre-fill duration
        if (lastLogEx && lastLogEx.sets[i] && lastLogEx.sets[i].duration) {
          initialData[`${exIndex}-${i}-duration`] = lastLogEx.sets[i].duration;
        }
      }
    });
    return initialData;
  });

  // State for completed sets
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  
  // State for notes and tags per exercise
  const [exerciseNotes, setExerciseNotes] = useState<Record<number, string>>({});
  const [exerciseTags, setExerciseTags] = useState<Record<number, string[]>>({});
  
  // RPE and global session notes
  const [rpe, setRpe] = useState<number>(7);
  const [sessionNote, setSessionNote] = useState("");
  
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');

  // Navigation
  const [currentExIndex, setCurrentExIndex] = useState(0);
  
  // Timer
  const [sessionTime, setSessionTime] = useState(0);
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setSessionTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let restTimer: any;
    if (isResting && restTime > 0) {
      restTimer = setInterval(() => setRestTime(t => t - 1), 1000);
    } else if (restTime === 0 && isResting) {
      setIsResting(false);
      showToast("Temps de repos terminé !", "info");
    }
    return () => clearInterval(restTimer);
  }, [isResting, restTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (exIndex: number, setIndex: number, field: string, value: string) => {
    const key = `${exIndex}-${setIndex}-${field}`;
    const newData = { ...sessionData, [key]: value };
    
    // Auto-fill subsequent sets if changing the first set
    if (setIndex === 0) {
      const exEntry = sessionExercises[exIndex];
      const numSets = typeof exEntry.sets === 'number' ? exEntry.sets : parseInt(exEntry.sets) || 1;
      const hasCommaReps = typeof exEntry.reps === 'string' && exEntry.reps.includes(',');
      
      for (let i = 1; i < numSets; i++) {
        const targetKey = `${exIndex}-${i}-${field}`;
        if (!newData[targetKey]) {
          if (field === 'reps' && hasCommaReps) {
            newData[targetKey] = getTargetRepsForSet(exEntry.reps, i);
          } else {
            newData[targetKey] = value;
          }
        }
      }
    }
    setSessionData(newData);
  };

  const toggleSetComplete = (exIndex: number, setIndex: number) => {
    const key = `${exIndex}-${setIndex}`;
    const isNowComplete = !completedSets[key];
    setCompletedSets(prev => ({ ...prev, [key]: isNowComplete }));
    
    if (isNowComplete) {
      // Start rest timer
      const exEntry = sessionExercises[exIndex];
      const restSeconds = parseInt(exEntry.rest || "90");
      setRestTime(restSeconds);
      setIsResting(true);
    }
  };

  const toggleTag = (exIndex: number, tag: string) => {
    setExerciseTags(prev => {
      const currentTags = prev[exIndex] || [];
      if (currentTags.includes(tag)) {
        return { ...prev, [exIndex]: currentTags.filter(t => t !== tag) };
      } else {
        return { ...prev, [exIndex]: [...currentTags, tag] };
      }
    });
  };

  const calculateVolume = () => {
    let vol = 0;
    Object.keys(completedSets).forEach(key => {
      if (completedSets[key]) {
        const weight = parseFloat(sessionData[`${key}-weight`] || "0");
        const reps = parseInt(sessionData[`${key}-reps`] || "0");
        vol += weight * reps;
      }
    });
    return vol;
  };

  const calculateScore = () => {
    const volume = calculateVolume();
    const baseScore = Math.min(100, (volume / 1000) * 10);
    const rpeModifier = (10 - rpe) * 2;
    return Math.min(100, Math.max(0, Math.round(baseScore + rpeModifier)));
  };

  const finishSession = async () => {
    const totalVolume = calculateVolume();
    const score = calculateScore();
    const sessionExercisesList = sessionExercises.map((exEntry, exIndex) => {
      const baseEx = state.exercises.find(e => e.id === exEntry.exId);
      const numSets = typeof exEntry.sets === 'number' ? exEntry.sets : parseInt(exEntry.sets) || 1;
      const sets = [];
      for (let i = 0; i < numSets; i++) {
        sets.push({
          weight: sessionData[`${exIndex}-${i}-weight`] || "",
          reps: sessionData[`${exIndex}-${i}-reps`] || "",
          duration: sessionData[`${exIndex}-${i}-duration`] || ""
        });
      }
      return {
        exId: exEntry.exId,
        name: baseEx?.name || String(exEntry.exId),
        sets
      };
    });

    const log: SessionLog = {
      id: Date.now(),
      clubId: state.user?.clubId || "global",
      memberId: Number(member.id),
      date: new Date().toISOString(),
      week: Math.floor(program.currentDayIndex / program.nbDays) + 1,
      isCoaching: true,
      dayName: currentDay.name,
      exerciseData: sessionData,
      exercises: sessionExercisesList,
      totalVolume,
      notes: sessionNote,
      score,
      rpe,
      duration: sessionTime,
      coachId: state.user?.id
    };

    const perfs: Performance[] = [];
    let hasNewPR = false;
    sessionExercises.forEach((exEntry, exIndex) => {
      const baseEx = state.exercises.find(e => e.id === exEntry.exId);
      if (!baseEx?.perfId) return;

      const numSets = typeof exEntry.sets === 'number' ? exEntry.sets : parseInt(exEntry.sets) || 1;
      let maxWeight = 0;
      let bestReps = 0;
      let duration = "";

      for (let i = 0; i < numSets; i++) {
        if (completedSets[`${exIndex}-${i}`]) {
          if (baseEx.cat === 'Cardio') {
            duration = sessionData[`${exIndex}-${i}-duration`] || "";
          } else {
            const w = parseFloat(sessionData[`${exIndex}-${i}-weight`] || "0");
            const r = parseInt(sessionData[`${exIndex}-${i}-reps`] || "0");
            if (w > maxWeight || (w === maxWeight && r > bestReps)) {
              maxWeight = w;
              bestReps = r;
            }
          }
        }
      }

      // Check for PR
      const previousPerfs = state.performances.filter(p => p.memberId === Number(member.id) && p.exId === baseEx.perfId);
      const previousMaxWeight = previousPerfs.length > 0 ? Math.max(...previousPerfs.map(p => p.weight)) : 0;
      
      if (maxWeight > previousMaxWeight && previousMaxWeight > 0) {
        hasNewPR = true;
      }

      if (maxWeight > 0 || duration) {
        perfs.push({
          id: Date.now() + exIndex,
          clubId: state.user?.clubId || "global",
          memberId: Number(member.id),
          date: new Date().toISOString(),
          exId: baseEx.perfId,
          weight: maxWeight,
          reps: bestReps,
          duration,
          fromCoaching: true
        });
      }
    });

    if (hasNewPR) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#10b981', '#3b82f6']
      });
      showToast("NOUVEAU RECORD PERSONNEL ! 🎉", "success");
    }

    if (isProgramSession) {
      const nextDayIndex = program.currentDayIndex + 1;
      try {
        await updateDoc(doc(db, "programs", program.id.toString()), { currentDayIndex: nextDayIndex });
      } catch (err) {
        console.error("Error updating program index:", err);
      }
    }

    if (member.firebaseUid) {
      try {
        const userRef = doc(db, "users", member.firebaseUid);
        await updateDoc(userRef, { lastWorkoutDate: log.date });
      } catch (err) {
        console.error("Error updating user lastWorkoutDate:", err);
      }
    }

    const relanceTasks = state.tasks?.filter(t => t.relatedMemberId === member.id && t.status === 'todo' && t.title.includes('Relance')) || [];
    for (const t of relanceTasks) {
      try {
        await updateDoc(doc(db, "tasks", t.id.toString()), { status: 'done' });
      } catch (err) {
        console.error("Error updating task:", err);
      }
    }

    onComplete(log, perfs);
  };

  const activeEx = sessionExercises[currentExIndex];
  const baseEx = state.exercises.find(e => e.id === activeEx?.exId);
  const numSets = activeEx ? (typeof activeEx.sets === 'number' ? activeEx.sets : parseInt(activeEx.sets) || 1) : 0;
  const lastPerf = baseEx?.perfId ? state.performances.filter(p => p.memberId === Number(member.id) && p.exId === baseEx.perfId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

  const AVAILABLE_TAGS = ["Technique parfaite", "Fatigue", "Douleur", "Léger", "Lourd", "Échec"];

  return createPortal(
    <div className="fixed inset-0 z-50 bg-white text-zinc-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b  bg-zinc-50/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
            <XIcon size={24} />
          </button>
          <div>
            <h2 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">Coaching Live</h2>
            <p className="text-lg font-black leading-none">{member.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isResting && (
            <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-500 px-3 py-1.5 rounded-full animate-pulse">
              <ClockIcon size={16} />
              <span className="font-mono font-bold">{formatTime(restTime)}</span>
            </div>
          )}
          <div className="text-right">
            <div className="text-2xl font-mono font-black">{formatTime(sessionTime)}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Durée</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="p-4 flex gap-2 overflow-x-auto custom-scrollbar snap-x relative">
          {sessionExercises.map((ex, idx) => {
            const bEx = state.exercises.find(e => e.id === ex.exId);
            const isCompleted = Array.from({length: typeof ex.sets === 'number' ? ex.sets : parseInt(ex.sets) || 1}).every((_, i) => completedSets[`${idx}-${i}`]);
            return (
              <div key={idx} className="snap-center shrink-0 w-64 relative group">
                <button 
                  onClick={() => setCurrentExIndex(idx)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${currentExIndex === idx ? 'bg-white border-emerald-500' : 'bg-zinc-50  opacity-50'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ex {idx + 1}/{sessionExercises.length}</span>
                    {isCompleted && <CheckIcon size={14} className="text-emerald-500" />}
                  </div>
                  <h3 className="font-bold truncate pr-6">{bEx?.name || 'Exercice'}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{ex.sets} x {ex.reps}</p>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSessionExercises(prev => prev.filter((_, i) => i !== idx));
                    if (currentExIndex >= idx && currentExIndex > 0) {
                      setCurrentExIndex(currentExIndex - 1);
                    }
                  }}
                  className="absolute top-10 right-2 p-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2Icon size={16} />
                </button>
              </div>
            );
          })}
          
          <button 
            onClick={() => setShowAddExerciseModal(true)}
            className="snap-center shrink-0 w-64 p-4 rounded-2xl border border-dashed  bg-zinc-50/50 hover:bg-zinc-50 hover:border-emerald-500 transition-all flex flex-col items-center justify-center text-zinc-500 hover:text-emerald-500"
          >
            <PlusIcon size={24} className="mb-2" />
            <span className="text-xs font-bold uppercase tracking-widest">Ajouter un exercice</span>
          </button>
        </div>

        {activeEx && baseEx && (
          <motion.div 
            key={currentExIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="px-4 space-y-6"
          >
            {/* Exercise Header */}
            <div className="flex gap-4 items-start">
              <div className="w-24 h-24 rounded-2xl bg-white overflow-hidden shrink-0 border ">
                {baseEx.photo ? (
                  <img src={baseEx.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <DumbbellIcon size={32} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black leading-tight mb-2">{baseEx.name}</h2>
                {lastPerf && (
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-xl text-xs font-bold">
                    <TrophyIcon size={14} />
                    Dernière perf: {baseEx?.cat === 'Cardio' ? (lastPerf.duration || 'N/A') : (baseEx?.name.toLowerCase().includes('gainage') || baseEx?.name.toLowerCase().includes('planche') || baseEx?.name.toLowerCase().includes('chaise')) ? `${lastPerf.weight}kg x ${lastPerf.reps}s` : `${lastPerf.weight}kg x ${lastPerf.reps}`}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={() => setShowVideoModal(true)}
                    className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 bg-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <VideoIcon size={14} /> Filmer
                  </button>
                  <button className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 bg-zinc-50 px-3 py-1.5 rounded-lg transition-colors">
                    <InfoIcon size={14} /> Consignes
                  </button>
                </div>
              </div>
            </div>

            {/* Sets Tracker */}
            <div className="bg-zinc-50 rounded-3xl p-4 border ">
              <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 mb-4 px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <div>Série</div>
                {baseEx?.cat === 'Cardio' ? (
                  <div className="col-span-2 text-center">Temps / Distance</div>
                ) : (
                  <>
                    <div className="text-center">{(baseEx?.name.toLowerCase().includes('gainage') || baseEx?.name.toLowerCase().includes('planche') || baseEx?.name.toLowerCase().includes('chaise')) ? 'Lest (kg)' : 'Charge (kg)'}</div>
                    <div className="text-center">{(baseEx?.name.toLowerCase().includes('gainage') || baseEx?.name.toLowerCase().includes('planche') || baseEx?.name.toLowerCase().includes('chaise') || String(activeEx?.reps).toLowerCase().includes('s')) ? 'Temps (sec)' : 'Reps'}</div>
                  </>
                )}
                <div>Action</div>
              </div>
              
              <div className="space-y-3">
                {Array.from({ length: numSets }).map((_, setIdx) => {
                  const isDone = completedSets[`${currentExIndex}-${setIdx}`];
                  return (
                    <div key={setIdx} className={`grid grid-cols-[auto_1fr_1fr_auto] gap-4 items-center p-2 rounded-2xl transition-colors ${isDone ? 'bg-emerald-500/10' : 'bg-zinc-50/50'}`}>
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-sm">
                        {setIdx + 1}
                      </div>
                      
                      {baseEx?.cat === 'Cardio' ? (
                        <div className="relative col-span-2">
                          <input 
                            type="text"
                            placeholder="ex: 15 min / 5 km"
                            value={sessionData[`${currentExIndex}-${setIdx}-duration`] || ""}
                            onChange={e => handleInputChange(currentExIndex, setIdx, 'duration', e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-center font-bold text-lg focus:outline-none focus:border-emerald-500"
                            disabled={isDone}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <input 
                              type="number"
                              inputMode="decimal"
                              placeholder={(baseEx?.name.toLowerCase().includes('gainage') || baseEx?.name.toLowerCase().includes('planche') || baseEx?.name.toLowerCase().includes('chaise')) ? "Lest" : "Charge"}
                              value={sessionData[`${currentExIndex}-${setIdx}-weight`] || ""}
                              onChange={e => handleInputChange(currentExIndex, setIdx, 'weight', e.target.value)}
                              className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-center font-bold text-lg focus:outline-none focus:border-emerald-500 placeholder:text-zinc-500"
                              disabled={isDone}
                            />
                          </div>
                          
                          <div className="relative">
                            <input 
                              type="text"
                              inputMode="numeric"
                              placeholder={getTargetRepsForSet(activeEx?.reps, setIdx) || ((baseEx?.name.toLowerCase().includes('gainage') || baseEx?.name.toLowerCase().includes('planche') || baseEx?.name.toLowerCase().includes('chaise') || String(activeEx?.reps).toLowerCase().includes('s')) ? "Sec" : "Reps")}
                              value={sessionData[`${currentExIndex}-${setIdx}-reps`] || ""}
                              onChange={e => handleInputChange(currentExIndex, setIdx, 'reps', e.target.value)}
                              className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-center font-bold text-lg focus:outline-none focus:border-emerald-500 placeholder:text-zinc-500"
                              disabled={isDone}
                            />
                          </div>
                        </>
                      )}
                      
                      <button 
                        onClick={() => toggleSetComplete(currentExIndex, setIdx)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500 text-zinc-900 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-zinc-50 text-zinc-500 hover:bg-emerald-500 hover:text-zinc-900'}`}
                      >
                        <CheckIcon size={20} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coach Notes & Tags */}
            <div className="bg-zinc-50 rounded-3xl p-4 border ">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Notes du Coach (Exercice)</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {AVAILABLE_TAGS.map(tag => {
                  const isActive = (exerciseTags[currentExIndex] || []).includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(currentExIndex, tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isActive ? 'bg-emerald-500 text-zinc-900' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <textarea 
                placeholder="Observations techniques, ajustements..."
                value={exerciseNotes[currentExIndex] || ""}
                onChange={e => setExerciseNotes(prev => ({ ...prev, [currentExIndex]: e.target.value }))}
                className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 min-h-[80px] resize-none"
              />
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                variant="secondary" 
                className="flex-1 !bg-zinc-50 \!text-zinc-900 \!border-zinc-200 hover:!bg-zinc-100"
                onClick={() => setCurrentExIndex(i => Math.max(0, i - 1))}
                disabled={currentExIndex === 0}
              >
                <ArrowLeftIcon size={18} className="mr-2" /> Précédent
              </Button>
              <Button 
                variant="primary" 
                className="flex-1"
                onClick={() => setCurrentExIndex(i => Math.min(currentDay.exercises.length - 1, i + 1))}
                disabled={currentExIndex === currentDay.exercises.length - 1}
              >
                Suivant <ArrowRightIcon size={18} className="ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Bar - Global Session Info & Finish */}
      <div className="absolute bottom-0 left-0 right-0 bg-zinc-50 border-t  p-4 z-20">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">RPE (Ressenti) : {rpe}/10</label>
              <input 
                type="range" 
                min="1" max="10" 
                value={rpe} 
                onChange={e => setRpe(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Volume</div>
              <div className="text-xl font-black text-emerald-400">{calculateVolume()} kg</div>
            </div>
          </div>
          <Button variant="primary" fullWidth onClick={() => setShowSummaryModal(true)} className="!py-4 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            BILAN DE SÉANCE <CheckIcon size={20} className="ml-2" />
          </Button>
        </div>
      </div>

      {/* Summary Modal */}
      <AnimatePresence>
        {showSummaryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black">Bilan de Séance</h2>
                <button onClick={() => setShowSummaryModal(false)} className="text-zinc-500 hover:text-zinc-900">
                  <XIcon size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Volume Total</div>
                  <div className="text-2xl font-black text-emerald-400">{calculateVolume()} kg</div>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Score Séance</div>
                  <div className="text-2xl font-black text-emerald-500">{calculateScore()}/100</div>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Durée</div>
                  <div className="text-2xl font-black">{formatTime(sessionTime)}</div>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">RPE</div>
                  <div className="text-2xl font-black text-amber-400">{rpe}/10</div>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">Note Globale (Coach)</label>
                <textarea 
                  placeholder="Bilan général, état de forme, points à revoir..."
                  value={sessionNote}
                  onChange={e => setSessionNote(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 min-h-[100px] resize-none"
                />
              </div>

              <Button variant="primary" fullWidth onClick={() => {
                setShowSummaryModal(false);
                finishSession();
              }} className="!py-4">
                ENREGISTRER DÉFINITIVEMENT
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Modal Placeholder */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          >
            <div className="w-full max-w-md flex justify-end mb-4">
              <button onClick={() => setShowVideoModal(false)} className="text-zinc-900 hover:text-zinc-500 bg-zinc-50 rounded-full p-2">
                <XIcon size={24} />
              </button>
            </div>
            <div className="w-full max-w-md aspect-[9/16] bg-zinc-50 border border-zinc-200 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <VideoIcon size={120} />
              </div>
              <div className="relative z-10 text-center p-6">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                  <VideoIcon size={24} className="text-zinc-900" />
                </div>
                <h3 className="text-xl font-black mb-2">Analyse Vidéo Premium</h3>
                <p className="text-sm text-zinc-500 mb-6">Enregistrez la série pour une analyse biomécanique détaillée et une comparaison avec les séances précédentes.</p>
                <Button variant="primary" onClick={() => setShowVideoModal(false)}>
                  Démarrer l'enregistrement
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Add Exercise Modal */}
      <AnimatePresence>
        {showAddExerciseModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 w-full max-w-md max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase tracking-tight">Ajouter un exercice</h2>
                <button onClick={() => setShowAddExerciseModal(false)} className="text-zinc-500 hover:text-zinc-900 transition-colors bg-zinc-50 rounded-full p-2">
                  <XIcon size={20} />
                </button>
              </div>

              <div className="mb-4">
                <Input 
                  placeholder="Rechercher un exercice..." 
                  value={exerciseSearchTerm}
                  onChange={e => setExerciseSearchTerm(e.target.value)}
                  className="\!bg-white \!border-zinc-200 !text-zinc-900"
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {state.exercises
                  .filter(e => e.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()))
                  .map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => {
                        const newEx: any = { exId: ex.id, sets: 3, reps: "10", rest: "60", tempo: "", duration: "", notes: "", setGroup: 0, order: sessionExercises.length, setType: "normal", setName: "" };
                        setSessionExercises(prev => [...prev, newEx]);
                        
                        const exIndex = sessionExercises.length;
                        const lastPerf = ex.perfId ? state.performances.filter(p => p.memberId === Number(member.id) && p.exId === ex.perfId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
                        
                        setSessionData(prev => {
                          const newData = { ...prev };
                          for (let i = 0; i < 3; i++) {
                            newData[`${exIndex}-${i}-reps`] = "10";
                            if (lastPerf && lastPerf.weight) newData[`${exIndex}-${i}-weight`] = String(lastPerf.weight);
                          }
                          return newData;
                        });
                        
                        setShowAddExerciseModal(false);
                        setCurrentExIndex(exIndex);
                        setExerciseSearchTerm('');
                      }}
                      className="w-full text-left p-4 rounded-xl bg-white border border-zinc-200 hover:border-emerald-500 transition-colors flex items-center justify-between"
                    >
                      <span className="font-bold">{ex.name}</span>
                      <PlusIcon size={16} className="text-emerald-500" />
                    </button>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>,
    document.body
  );
};
