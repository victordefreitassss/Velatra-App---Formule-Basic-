
import React, { useState, useEffect } from 'react';
import { Program, User, Exercise, AppState, SessionLog, Performance, ExerciseEntry } from '../types';
import { Button, Input, Badge, Card } from './UI';
import { XIcon, CheckIcon, DumbbellIcon, InfoIcon, RefreshCwIcon, SparklesIcon, TrophyIcon } from './Icons';
import { db, doc, setDoc, updateDoc, deleteDoc } from '../firebase';
import { PROGRAM_DURATION_WEEKS } from '../constants';

interface WorkoutViewProps {
  program: Program;
  member: User;
  onClose: () => void;
  onComplete: (log: SessionLog, perfs: Performance[]) => void;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (m: string, t?: any) => void;
}

export const WorkoutView: React.FC<WorkoutViewProps> = ({ program, member, onClose, onComplete, state, setState, showToast }) => {
  const currentDay = program.days[program.currentDayIndex % program.nbDays];
  const [sessionData, setSessionData] = useState<Record<string, string>>({});
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  const [sessionXP, setSessionXP] = useState(0);

  const handleInputChange = (exIndex: number, setIndex: number, field: string, value: string) => {
    const key = `${exIndex}-${setIndex}-${field}`;
    const newData = { ...sessionData, [key]: value };
    if (setIndex === 0) {
      const exEntry = currentDay.exercises[exIndex];
      const numSets = typeof exEntry.sets === 'number' ? exEntry.sets : parseInt(exEntry.sets) || 1;
      for (let i = 1; i < numSets; i++) {
        const targetKey = `${exIndex}-${i}-${field}`;
        if (!newData[targetKey]) newData[targetKey] = value;
      }
    }
    setSessionData(newData);
  };

  const isExerciseComplete = (exIndex: number) => {
    const exEntry = currentDay.exercises[exIndex];
    const numSets = typeof exEntry.sets === 'number' ? exEntry.sets : parseInt(exEntry.sets) || 1;
    for (let i = 0; i < numSets; i++) {
      if (!sessionData[`${exIndex}-${i}-weight`] || !sessionData[`${exIndex}-${i}-reps`]) return false;
    }
    return true;
  };

  const toggleExerciseValidation = (exIndex: number) => {
    if (completedExercises.includes(exIndex)) {
      setCompletedExercises(completedExercises.filter(i => i !== exIndex));
      setSessionXP(prev => prev - 25);
    } else {
      if (isExerciseComplete(exIndex)) {
        setCompletedExercises([...completedExercises, exIndex]);
        // Gamification: Bonus XP for completing exercises
        const bonus = 25 + (completedExercises.length * 5); 
        setSessionXP(prev => prev + bonus);
        showToast(`+${bonus} XP ! COMBO x${completedExercises.length + 1}`, "success");
        
        setTimeout(() => {
          const nextEl = document.getElementById(`exercise-${exIndex + 1}`);
          if (nextEl) {
            nextEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        showToast("Remplissez tous les champs !", "error");
      }
    }
  };

  const loyaltyPoints = state.currentClub?.settings?.loyalty?.pointsPerWorkout || 100;

  const groupedExercises: { isGroup: boolean; groupName?: string; exercises: { entry: ExerciseEntry; index: number }[] }[] = [];
  
  let currentGroup: number | null = null;
  let currentGroupType: string | null = null;
  let currentGroupItems: { entry: ExerciseEntry; index: number }[] = [];

  currentDay.exercises.forEach((exEntry, exIndex) => {
    if (exEntry.setGroup && exEntry.setGroup > 0) {
      if (currentGroup === exEntry.setGroup) {
        currentGroupItems.push({ entry: exEntry, index: exIndex });
      } else {
        if (currentGroupItems.length > 0) {
          groupedExercises.push({ isGroup: currentGroup !== null, groupName: currentGroupType || '', exercises: currentGroupItems });
        }
        currentGroup = exEntry.setGroup;
        currentGroupType = exEntry.setType;
        currentGroupItems = [{ entry: exEntry, index: exIndex }];
      }
    } else {
      if (currentGroupItems.length > 0) {
        groupedExercises.push({ isGroup: currentGroup !== null, groupName: currentGroupType || '', exercises: currentGroupItems });
        currentGroupItems = [];
        currentGroup = null;
        currentGroupType = null;
      }
      groupedExercises.push({ isGroup: false, exercises: [{ entry: exEntry, index: exIndex }] });
    }
  });
  if (currentGroupItems.length > 0) {
    groupedExercises.push({ isGroup: currentGroup !== null, groupName: currentGroupType || '', exercises: currentGroupItems });
  }

  const finishSession = async () => {
    const log: SessionLog = {
      id: Date.now(),
      clubId: member.clubId,
      memberId: Number(member.id),
      date: new Date().toISOString().split('T')[0],
      week: Math.ceil((program.currentDayIndex + 1) / program.nbDays),
      isCoaching: currentDay.isCoaching,
      dayName: currentDay.name,
      exerciseData: sessionData
    };

    const perfs: Performance[] = [];
    currentDay.exercises.forEach((exEntry, exIndex) => {
      const baseEx = state.exercises.find(e => e.id === exEntry.exId);
      if (baseEx?.perfId) {
        let maxWeight = 0, associatedReps = 0;
        const numSets = typeof exEntry.sets === 'number' ? exEntry.sets : parseInt(exEntry.sets) || 1;
        for (let i = 0; i < numSets; i++) {
          const w = parseFloat(sessionData[`${exIndex}-${i}-weight`]), r = parseInt(sessionData[`${exIndex}-${i}-reps`], 10);
          if (w > maxWeight) { maxWeight = w; associatedReps = r; }
        }
        if (maxWeight > 0) perfs.push({ 
          id: Date.now() + exIndex, 
          clubId: member.clubId,
          memberId: Number(member.id), 
          date: log.date, 
          exId: baseEx.perfId, 
          weight: maxWeight, 
          reps: associatedReps, 
          fromCoaching: log.isCoaching 
        });
      }
    });

    const userRef = doc(db, "users", (member as any).firebaseUid);
    const newStreak = (member.lastWorkoutDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]) ? (member.streak || 0) + 1 : 1;
    const totalXP = (member.xp || 0) + sessionXP + loyaltyPoints;
    const oldLevel = Math.floor((member.xp || 0) / 1000) + 1;
    const newLevel = Math.floor(totalXP / 1000) + 1;

    await updateDoc(userRef, { xp: totalXP, streak: newStreak, lastWorkoutDate: log.date });

    if (newLevel > oldLevel) {
      showToast(`NOUVEAU NIVEAU ATTEINT : ${newLevel} ! 🏆`, "success");
    }

    // Vérification fin de programme
    const durationWeeks = program.durationWeeks;
    const nextDayIndex = program.currentDayIndex + 1;

    if (durationWeeks) {
      const totalSessionsInCycle = program.nbDays * durationWeeks;
      if (nextDayIndex >= totalSessionsInCycle) {
        // ARCHIVAGE AUTOMATIQUE
        const archiveRef = doc(db, "archivedPrograms", program.id.toString());
        await setDoc(archiveRef, { ...program, clubId: member.clubId, endDate: log.date, memberName: member.name, status: "completed" });
        await deleteDoc(doc(db, "programs", program.id.toString()));
        alert(`FÉLICITATIONS ! Vous avez terminé votre cycle de ${durationWeeks} semaines. Le programme est désormais archivé.`);
      } else {
        await updateDoc(doc(db, "programs", program.id.toString()), { currentDayIndex: nextDayIndex });
      }
    } else {
      await updateDoc(doc(db, "programs", program.id.toString()), { currentDayIndex: nextDayIndex });
    }

    onComplete(log, perfs);
  };

  return (
    <div className="fixed inset-0 bg-zinc-50 z-[100] flex flex-col page-transition">
      <header className="glass border-b border-zinc-200 px-4 py-4 md:px-8 md:py-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
             {currentDay.duration && (
               <Badge variant="dark" className="!text-[8px] !px-1.5 !py-0.5 italic">
                 ~{currentDay.duration} MIN
               </Badge>
             )}
             <div className="flex items-center gap-1 text-velatra-accent font-bold text-[10px] animate-pulse">
                <SparklesIcon size={12}/> {sessionXP} XP
             </div>
          </div>
          <div className="font-display font-bold text-2xl md:text-3xl tracking-tight text-zinc-900 leading-none truncate pr-4">{currentDay.name}</div>
        </div>
        <button onClick={onClose} className="p-3 bg-zinc-50 rounded-full text-zinc-500 hover:text-zinc-900 transition-all hover:bg-red-500 shrink-0"><XIcon size={20} /></button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-16 space-y-8 no-scrollbar">
        <div className="flex justify-between items-center bg-zinc-50 p-6 rounded-[32px] border border-zinc-200">
           <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[4px] text-zinc-900">Progression Cycle</span>
              <div className="text-sm font-black text-zinc-900 italic">
                SEMAINE {Math.floor(program.currentDayIndex / program.nbDays) + 1} {program.durationWeeks ? `/ ${program.durationWeeks}` : ''} • JOUR {(program.currentDayIndex % program.nbDays) + 1}
              </div>
           </div>
           <div className="w-14 h-14 bg-velatra-accent/10 rounded-2xl flex items-center justify-center text-velatra-accent shadow-inner">
              <TrophyIcon size={28} />
           </div>
        </div>
        {groupedExercises.map((group, gIndex) => {
          return (
            <div key={gIndex} className={group.isGroup ? "p-6 rounded-[32px] border-2 border-velatra-accent/30 bg-velatra-accent/5 space-y-6 relative" : "space-y-6"}>
              {group.isGroup && (
                <div className="absolute -top-3 left-6 bg-velatra-accent text-zinc-900 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                  {group.groupName || 'SUPERSET'}
                </div>
              )}
              {group.exercises.map(({ entry: exEntry, index: exIndex }) => {
                const baseEx = state.exercises.find(e => e.id === exEntry.exId);
                const isValidated = completedExercises.includes(exIndex);
                const pr = baseEx?.perfId ? state.performances.filter(p => p.memberId === Number(member.id) && p.exId === baseEx.perfId).sort((a, b) => b.weight - a.weight)[0] : null;
                
                return (
                  <div key={exIndex} id={`exercise-${exIndex}`} className={`transition-all duration-500 ${isValidated ? 'opacity-20 grayscale scale-95 pointer-events-none' : ''}`}>
                    <Card className="!p-8 border-none ring-1 ring-zinc-200 bg-white shadow-2xl relative">
                      <div className="flex gap-4 md:gap-8 items-center mb-6 md:mb-10">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white border border-zinc-200 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                          {baseEx?.photo ? (
                            <img src={baseEx.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-velatra-accent">
                              <DumbbellIcon size={40} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] text-velatra-accent font-black uppercase tracking-[3px] mb-1 md:mb-2">{baseEx?.cat}</div>
                          <div className="font-black text-2xl md:text-3xl tracking-tighter leading-none text-zinc-900 italic uppercase mb-2 md:mb-3">{baseEx?.name}</div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {exEntry.setType && exEntry.setType !== 'normal' && !group.isGroup && (
                              <Badge variant="orange" className="uppercase">{exEntry.setType}</Badge>
                            )}
                            {exEntry.tempo && (
                              <Badge variant="dark" className="uppercase">Tempo: {exEntry.tempo}</Badge>
                            )}
                            {exEntry.rest && (
                              <Badge variant="dark" className="uppercase">Repos: {exEntry.rest}s</Badge>
                            )}
                          </div>
                          {pr && (
                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                              <TrophyIcon size={12} className="text-yellow-500" /> PR: {pr.weight}kg x {pr.reps}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:gap-6 mb-8 md:mb-10">
                        {Array.from({ length: (typeof exEntry.sets === 'number' ? exEntry.sets : parseInt(exEntry.sets) || 1) }).map((_, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-3 md:gap-6 group animate-in slide-in-from-left">
                             <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-xs font-black text-zinc-900 group-focus-within:border-velatra-accent transition-all shrink-0">{sIdx+1}</div>
                             <div className="flex-1 grid grid-cols-2 gap-2 md:gap-4">
                                <div className="relative flex items-center">
                                   <button 
                                     onClick={() => handleInputChange(exIndex, sIdx, 'weight', String(Math.max(0, (parseFloat(sessionData[`${exIndex}-${sIdx}-weight`] || "0") - 1))))}
                                     className="absolute left-1 md:left-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 hover:bg-zinc-200 z-10"
                                   >-</button>
                                   <Input type="number" inputMode="decimal" placeholder="KG" className="!bg-white !py-3 md:!py-4 text-center text-lg md:text-xl font-black italic border-zinc-200 px-8 md:px-12" value={sessionData[`${exIndex}-${sIdx}-weight`] || ""} onChange={e => handleInputChange(exIndex, sIdx, 'weight', e.target.value)} />
                                   <button 
                                     onClick={() => handleInputChange(exIndex, sIdx, 'weight', String((parseFloat(sessionData[`${exIndex}-${sIdx}-weight`] || "0") + 1)))}
                                     className="absolute right-1 md:right-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 hover:bg-zinc-200 z-10"
                                   >+</button>
                                   <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 md:px-2 text-[7px] font-black text-zinc-900 uppercase">Charge</span>
                                </div>
                                <div className="relative flex items-center">
                                   <button 
                                     onClick={() => handleInputChange(exIndex, sIdx, 'reps', String(Math.max(0, (parseInt(sessionData[`${exIndex}-${sIdx}-reps`] || "0") - 1))))}
                                     className="absolute left-1 md:left-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 hover:bg-zinc-200 z-10"
                                   >-</button>
                                   <Input type="number" inputMode="numeric" placeholder="REPS" className="!bg-white !py-3 md:!py-4 text-center text-lg md:text-xl font-black italic border-zinc-200 px-8 md:px-12" value={sessionData[`${exIndex}-${sIdx}-reps`] || ""} onChange={e => handleInputChange(exIndex, sIdx, 'reps', e.target.value)} />
                                   <button 
                                     onClick={() => handleInputChange(exIndex, sIdx, 'reps', String((parseInt(sessionData[`${exIndex}-${sIdx}-reps`] || "0") + 1)))}
                                     className="absolute right-1 md:right-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 hover:bg-zinc-200 z-10"
                                   >+</button>
                                   <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 md:px-2 text-[7px] font-black text-zinc-900 uppercase">Répétitions</span>
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                      <Button variant="primary" fullWidth className="!py-5 !rounded-[24px] font-black italic tracking-widest text-base shadow-xl shadow-velatra-accent/20" onClick={() => toggleExerciseValidation(exIndex)}>
                         VALIDER MOUVEMENT
                      </Button>
                    </Card>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="h-32" />
      </div>
      <footer className="glass border-t border-zinc-200 p-8 backdrop-blur-3xl flex flex-col gap-4">
        <div className="flex justify-between items-center px-4">
           <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Récompense de séance</div>
           <div className="text-sm font-black text-velatra-accent italic">+{loyaltyPoints} XP</div>
        </div>
        <Button variant="success" fullWidth onClick={finishSession} className="!py-6 !rounded-[32px] font-black text-xl italic shadow-2xl shadow-emerald-500/20" disabled={completedExercises.length < currentDay.exercises.length}>
          TERMINER MA SÉANCE
        </Button>
      </footer>
    </div>
  );
};
