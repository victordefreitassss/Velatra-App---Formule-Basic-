
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Program, User, Exercise, AppState, SessionLog, Performance, ExerciseEntry } from '../types';
import { Button, Input, Badge, Card } from './UI';
import { XIcon, CheckIcon, DumbbellIcon, InfoIcon, RefreshCwIcon, SparklesIcon, TrophyIcon, LinkIcon } from './Icons';
import { db, doc, setDoc, updateDoc, deleteDoc } from '../firebase';
import { PROGRAM_DURATION_WEEKS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const getTargetRepsForSet = (repsString: string | number | undefined, setIndex: number): string => {
  if (typeof repsString === 'number') return String(repsString);
  if (!repsString) return '';
  const parts = repsString.split(',').map(s => s.trim());
  if (parts.length === 0) return '';
  if (setIndex < parts.length) return parts[setIndex];
  return parts[parts.length - 1];
};

interface WorkoutViewProps {
  program: Program;
  member: User;
  onClose: () => void;
  onComplete: (log: SessionLog, perfs: Performance[]) => void;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (m: string, t?: any) => void;
  isCoachView?: boolean;
}

export const WorkoutView: React.FC<WorkoutViewProps> = ({ program, member, onClose, onComplete, state, setState, showToast, isCoachView }) => {
  const currentDay = program.days[program.currentDayIndex % program.nbDays];
  const [sessionData, setSessionData] = useState<Record<string, string>>(() => {
    const initialData: Record<string, string> = {};
    
    // Find the last session log for this specific day to pre-fill data
    const lastLog = state.logs
      ?.filter(l => l.memberId === Number(member.id) && l.dayName === currentDay.name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    currentDay.exercises.forEach((exEntry, exIndex) => {
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
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  const [sessionXP, setSessionXP] = useState(0);

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  const handleInputChange = (exIndex: number, setIndex: number, field: string, value: string) => {
    const key = `${exIndex}-${setIndex}-${field}`;
    const newData = { ...sessionData, [key]: value };
    if (setIndex === 0) {
      const exEntry = currentDay.exercises[exIndex];
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

  const isExerciseComplete = (exIndex: number) => {
    const exEntry = currentDay.exercises[exIndex];
    const baseEx = state.exercises.find(e => e.id === exEntry.exId);
    const numSets = typeof exEntry.sets === 'number' ? exEntry.sets : parseInt(exEntry.sets) || 1;
    for (let i = 0; i < numSets; i++) {
      if (baseEx?.cat === 'Cardio') {
        if (!sessionData[`${exIndex}-${i}-duration`]) return false;
      } else {
        if (!sessionData[`${exIndex}-${i}-weight`] || !sessionData[`${exIndex}-${i}-reps`]) return false;
      }
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
    const sessionExercisesList = currentDay.exercises.map((exEntry, exIndex) => {
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
      clubId: member.clubId,
      memberId: Number(member.id),
      date: new Date().toISOString().split('T')[0],
      week: Math.ceil((program.currentDayIndex + 1) / program.nbDays),
      isCoaching: isCoachView || currentDay.isCoaching,
      dayName: currentDay.name,
      exerciseData: sessionData,
      exercises: sessionExercisesList
    };

    const perfs: Performance[] = [];
    currentDay.exercises.forEach((exEntry, exIndex) => {
      const baseEx = state.exercises.find(e => e.id === exEntry.exId);
      if (baseEx?.perfId) {
        let maxWeight = 0, associatedReps = 0, duration = "";
        const numSets = typeof exEntry.sets === 'number' ? exEntry.sets : parseInt(exEntry.sets) || 1;
        for (let i = 0; i < numSets; i++) {
          if (baseEx.cat === 'Cardio') {
            duration = sessionData[`${exIndex}-${i}-duration`] || "";
          } else {
            const w = parseFloat(sessionData[`${exIndex}-${i}-weight`]), r = parseInt(sessionData[`${exIndex}-${i}-reps`], 10);
            if (w > maxWeight) { maxWeight = w; associatedReps = r; }
          }
        }
        if (maxWeight > 0 || duration) perfs.push({ 
          id: Date.now() + exIndex, 
          clubId: member.clubId,
          memberId: Number(member.id), 
          date: log.date, 
          exId: baseEx.perfId, 
          weight: maxWeight, 
          reps: associatedReps, 
          duration: duration,
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

    // Resolve any "Relance" tasks for this member
    const relanceTasks = state.tasks?.filter(t => t.relatedMemberId === member.id && t.status === 'todo' && t.title.includes('Relance')) || [];
    for (const t of relanceTasks) {
      try {
        await updateDoc(doc(db, "tasks", t.id.toString()), { status: 'done' });
      } catch (err) {
        console.error("Error updating task:", err);
      }
    }

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

  return createPortal(
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 bg-zinc-50 z-[100] flex flex-col page-transition"
    >
      <header className="glass border-b border-zinc-200 px-4 py-4 md:px-8 md:py-6 flex flex-col sticky top-0 z-20">
        <div className="flex items-center justify-between w-full">
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
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose} 
            className="p-3 bg-zinc-50 rounded-full text-zinc-500 hover:text-zinc-900 transition-all hover:bg-red-500 shrink-0"
          >
            <XIcon size={20} />
          </motion.button>
        </div>
        <div className="w-full h-1.5 bg-zinc-200 rounded-full mt-4 overflow-hidden">
          <motion.div 
            className="h-full bg-velatra-accent"
            initial={{ width: 0 }}
            animate={{ width: `${(completedExercises.length / currentDay.exercises.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </header>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto px-4 py-6 md:px-16 space-y-8 no-scrollbar"
      >
        <motion.div variants={itemVariants} className="flex justify-between items-center bg-zinc-50 p-6 rounded-[32px] border border-zinc-200">
           <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[4px] text-zinc-900">Progression Cycle</span>
              <div className="text-sm font-black text-zinc-900 italic">
                SEMAINE {Math.floor(program.currentDayIndex / program.nbDays) + 1} {program.durationWeeks ? `/ ${program.durationWeeks}` : ''} • JOUR {(program.currentDayIndex % program.nbDays) + 1}
              </div>
           </div>
           <div className="w-14 h-14 bg-velatra-accent/10 rounded-2xl flex items-center justify-center text-velatra-accent shadow-inner">
              <TrophyIcon size={28} />
           </div>
        </motion.div>
        {groupedExercises.map((group, gIndex) => {
          const getGroupDescription = (type: string) => {
            switch (type.toLowerCase()) {
              case 'superset': return "Enchaînez ces exercices sans temps de repos entre eux.";
              case 'biset': return "Enchaînez ces 2 exercices ciblant le même muscle sans repos.";
              case 'triset': return "Enchaînez ces 3 exercices sans temps de repos.";
              case 'giantset': return "Enchaînez ces 4 exercices ou plus sans temps de repos.";
              case 'dropset': return "Allez jusqu'à l'échec, baissez le poids de 20% et repartez sans repos.";
              default: return "Enchaînez ces exercices selon les indications.";
            }
          };

          return (
            <motion.div 
              variants={itemVariants} 
              key={gIndex} 
              className={group.isGroup ? "relative pl-6 md:pl-10 space-y-8 mt-16" : "space-y-8"}
              transition={{ duration: 0.3 }}
            >
              {group.isGroup && (
                <>
                  {/* Ligne verticale de liaison */}
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute left-0 top-0 w-2 bg-gradient-to-b from-velatra-accent to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                  />
                  
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="absolute -top-8 left-0 bg-velatra-accent text-zinc-900 px-4 py-2 rounded-r-2xl rounded-tl-2xl shadow-lg z-10 flex flex-col gap-1"
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <LinkIcon size={12} /> {group.groupName || 'SUPERSET'}
                    </div>
                    <div className="text-[9px] font-bold opacity-80 leading-tight max-w-[200px]">
                      {getGroupDescription(group.groupName || 'superset')}
                    </div>
                  </motion.div>
                </>
              )}
              {group.exercises.map(({ entry: exEntry, index: exIndex }, i) => {
                const baseEx = state.exercises.find(e => e.id === exEntry.exId);
                const isValidated = completedExercises.includes(exIndex);
                const pr = baseEx?.perfId ? state.performances.filter(p => p.memberId === Number(member.id) && p.exId === baseEx.perfId).sort((a, b) => b.weight - a.weight)[0] : null;
                const isLastInGroup = i === group.exercises.length - 1;
                
                return (
                  <div key={exIndex} className="relative">
                    <div id={`exercise-${exIndex}`} className={`transition-all duration-500 ${isValidated ? 'opacity-30 grayscale scale-[0.98] pointer-events-none' : ''}`}>
                      <Card className={`!p-6 md:!p-8 bg-white shadow-xl relative border-none ring-1 ring-zinc-200 ${group.isGroup ? 'hover:ring-velatra-accent/50 transition-all' : ''}`}>
                        {group.isGroup && (
                          <div className="absolute -left-6 md:-left-10 top-1/2 -translate-y-1/2 w-6 md:w-10 h-1 bg-velatra-accent/30" />
                        )}
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
                                <TrophyIcon size={12} className="text-yellow-500" /> PR: {baseEx?.cat === 'Cardio' ? (pr.duration || 'N/A') : (baseEx?.name.toLowerCase().includes('gainage') || baseEx?.name.toLowerCase().includes('planche') || baseEx?.name.toLowerCase().includes('chaise')) ? `${pr.weight}kg x ${pr.reps}s` : `${pr.weight}kg x ${pr.reps}`}
                              </div>
                            )}
                            {exEntry.notes && (
                              <div className="mt-3 p-3 bg-velatra-accent/5 border border-velatra-accent/20 rounded-xl text-xs text-zinc-700 font-medium leading-relaxed">
                                <span className="text-[9px] font-black text-velatra-accent uppercase tracking-widest block mb-1">Notes du coach</span>
                                {exEntry.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-8 md:mb-10">
                          {Array.from({ length: (typeof exEntry.sets === 'number' ? exEntry.sets : parseInt(exEntry.sets) || 1) }).map((_, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-3 md:gap-6 group animate-in slide-in-from-left">
                               <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-xs font-black text-zinc-900 group-focus-within:border-velatra-accent transition-all shrink-0">{sIdx+1}</div>
                               <div className="flex-1 grid grid-cols-2 gap-2 md:gap-4">
                                  {baseEx?.cat === 'Cardio' ? (
                                    <div className="relative flex items-center col-span-2">
                                      <Input 
                                        placeholder={exEntry.duration || "DURÉE (ex: 15 min)"} 
                                        className="!bg-white !py-3 md:!py-4 text-center text-lg md:text-xl font-black italic border-zinc-200 px-4" 
                                        value={sessionData[`${exIndex}-${sIdx}-duration`] || ""} 
                                        onChange={e => handleInputChange(exIndex, sIdx, 'duration', e.target.value)} 
                                      />
                                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 md:px-2 text-[7px] font-black text-zinc-900 uppercase">Temps / Distance</span>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="relative flex items-center">
                                         <button 
                                           onClick={() => handleInputChange(exIndex, sIdx, 'weight', String(Math.max(0, (parseFloat(sessionData[`${exIndex}-${sIdx}-weight`] || "0") - 1))))}
                                           className="absolute left-1 md:left-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 hover:bg-zinc-200 z-10"
                                         >-</button>
                                         <Input type="number" inputMode="decimal" placeholder={(baseEx?.name.toLowerCase().includes('gainage') || baseEx?.name.toLowerCase().includes('planche') || baseEx?.name.toLowerCase().includes('chaise')) ? "LEST" : "KG"} className="!bg-white !py-3 md:!py-4 text-center text-lg md:text-xl font-black italic border-zinc-200 px-8 md:px-12" value={sessionData[`${exIndex}-${sIdx}-weight`] || ""} onChange={e => handleInputChange(exIndex, sIdx, 'weight', e.target.value)} />
                                         <button 
                                           onClick={() => handleInputChange(exIndex, sIdx, 'weight', String((parseFloat(sessionData[`${exIndex}-${sIdx}-weight`] || "0") + 1)))}
                                           className="absolute right-1 md:right-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 hover:bg-zinc-200 z-10"
                                         >+</button>
                                         <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 md:px-2 text-[7px] font-black text-zinc-900 uppercase">{(baseEx?.name.toLowerCase().includes('gainage') || baseEx?.name.toLowerCase().includes('planche') || baseEx?.name.toLowerCase().includes('chaise')) ? 'Lest' : 'Charge'}</span>
                                      </div>
                                      <div className="relative flex items-center">
                                         <button 
                                           onClick={() => handleInputChange(exIndex, sIdx, 'reps', String(Math.max(0, (parseInt(sessionData[`${exIndex}-${sIdx}-reps`] || getTargetRepsForSet(exEntry.reps, sIdx) || "0") - 1))))}
                                           className="absolute left-1 md:left-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 hover:bg-zinc-200 z-10"
                                         >-</button>
                                         <Input type="text" inputMode="numeric" placeholder={getTargetRepsForSet(exEntry.reps, sIdx) || ((baseEx?.name.toLowerCase().includes('gainage') || baseEx?.name.toLowerCase().includes('planche') || baseEx?.name.toLowerCase().includes('chaise') || String(exEntry.reps).toLowerCase().includes('s')) ? "SEC" : "REPS")} className="!bg-white !py-3 md:!py-4 text-center text-lg md:text-xl font-black italic border-zinc-200 px-8 md:px-12" value={sessionData[`${exIndex}-${sIdx}-reps`] || ""} onChange={e => handleInputChange(exIndex, sIdx, 'reps', e.target.value)} />
                                         <button 
                                           onClick={() => handleInputChange(exIndex, sIdx, 'reps', String((parseInt(sessionData[`${exIndex}-${sIdx}-reps`] || getTargetRepsForSet(exEntry.reps, sIdx) || "0") + 1)))}
                                           className="absolute right-1 md:right-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 hover:bg-zinc-200 z-10"
                                         >+</button>
                                         <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 md:px-2 text-[7px] font-black text-zinc-900 uppercase whitespace-nowrap">{(baseEx?.name.toLowerCase().includes('gainage') || baseEx?.name.toLowerCase().includes('planche') || baseEx?.name.toLowerCase().includes('chaise') || getTargetRepsForSet(exEntry.reps, sIdx).toLowerCase().includes('s')) ? 'Temps (sec)' : 'Répétitions'} {exEntry.reps ? `(Cible: ${getTargetRepsForSet(exEntry.reps, sIdx)})` : ''}</span>
                                      </div>
                                    </>
                                  )}
                               </div>
                            </div>
                          ))}
                        </div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button 
                            variant={isValidated ? "success" : "primary"} 
                            fullWidth 
                            className={`!py-5 !rounded-[24px] font-black italic tracking-widest text-base shadow-xl transition-colors duration-300 ${isValidated ? 'shadow-emerald-500/20 bg-emerald-500 text-white' : 'shadow-velatra-accent/20'}`} 
                            onClick={() => toggleExerciseValidation(exIndex)}
                          >
                             <AnimatePresence mode="wait">
                               {isValidated ? (
                                 <motion.div 
                                   key="validated"
                                   initial={{ scale: 0, opacity: 0 }} 
                                   animate={{ scale: 1, opacity: 1 }} 
                                   exit={{ scale: 0, opacity: 0 }}
                                   className="flex items-center justify-center gap-2"
                                 >
                                   <CheckIcon size={20} /> FAIT
                                 </motion.div>
                               ) : (
                                 <motion.div 
                                   key="validate"
                                   initial={{ opacity: 0 }} 
                                   animate={{ opacity: 1 }} 
                                   exit={{ opacity: 0 }}
                                 >
                                   VALIDER MOUVEMENT
                                 </motion.div>
                               )}
                             </AnimatePresence>
                          </Button>
                        </motion.div>
                      </Card>
                    </div>
                    {group.isGroup && !isLastInGroup && (
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center justify-center">
                        <motion.div 
                          animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="w-8 h-8 rounded-full bg-velatra-accent/10 text-velatra-accent flex items-center justify-center backdrop-blur-sm border border-velatra-accent/30"
                        >
                          <LinkIcon size={14} />
                        </motion.div>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          );
        })}
        <div className="h-32" />
      </motion.div>
      <motion.footer 
        variants={itemVariants}
        className="glass border-t border-zinc-200 p-8 backdrop-blur-3xl flex flex-col gap-4"
      >
        <div className="flex justify-between items-center px-4">
           <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Récompense de séance</div>
           <div className="text-sm font-black text-velatra-accent italic">+{loyaltyPoints} XP</div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button variant="success" fullWidth onClick={finishSession} className="!py-6 !rounded-[32px] font-black text-xl italic shadow-2xl shadow-emerald-500/20" disabled={completedExercises.length < currentDay.exercises.length}>
            TERMINER MA SÉANCE
          </Button>
        </motion.div>
      </motion.footer>
    </motion.div>,
    document.body
  );
};
