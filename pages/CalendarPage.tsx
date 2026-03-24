
import React from 'react';
import { AppState } from '../types';
import { Card, Button, Badge } from '../components/UI';
import { PlayIcon, CalendarIcon } from '../components/Icons';
import { motion } from 'framer-motion';

export const CalendarPage: React.FC<{ state: AppState, setState: any }> = ({ state, setState }) => {
  const user = state.user!;
  const program = state.programs.find(p => p.memberId === Number(user.id));

  if (!program) {
    return (
      <div className="py-20 text-center opacity-50">
         Aucun programme actif. Contactez votre coach.
      </div>
    );
  }

  const startSession = (dayIdx: number) => {
    // Calculate the actual absolute index based on the current week
    const currentWeek = Math.floor(program.currentDayIndex / program.nbDays);
    const absoluteDayIndex = (currentWeek * program.nbDays) + dayIdx;
    
    setState((s: AppState) => ({ 
      ...s, 
      workout: { ...program, currentDayIndex: absoluteDayIndex },
      workoutMember: user
    }));
  };

  const currentDayInWeek = program.currentDayIndex % program.nbDays;
  const currentWeek = Math.floor(program.currentDayIndex / program.nbDays) + 1;
  const totalWeeks = program.durationWeeks || 1;
  const progressPercent = Math.min(100, Math.round((program.currentDayIndex / (program.nbDays * totalWeeks)) * 100));

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

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-20"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Mon Programme</h1>
          <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-[3px] mt-2">{program.name}</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-zinc-200/50 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Progression Globale</div>
            <div className="text-2xl font-black italic text-zinc-900">{progressPercent}%</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Semaine</div>
            <div className="text-sm font-black italic text-velatra-accent">{currentWeek} / {totalWeeks}</div>
          </div>
        </div>
        <div className="w-full bg-zinc-100/50 rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="bg-velatra-accent h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
          />
        </div>
      </motion.div>

      <motion.div variants={containerVariants} className="space-y-4">
        {program.days.map((day, idx) => {
          const isCompleted = idx < currentDayInWeek;
          const isCurrent = idx === currentDayInWeek;
          const isLocked = idx > currentDayInWeek;

          return (
            <motion.div variants={itemVariants} key={idx}>
              <Card className={`flex items-center justify-between group !p-4 md:!p-6 border-zinc-200/50 transition-all shadow-sm ${isCompleted ? 'bg-white/40 backdrop-blur-md opacity-60' : 'bg-white/60 backdrop-blur-xl hover:border-velatra-accent/30 hover:shadow-md'}`}>
                <div className="flex items-center gap-4 md:gap-6">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border flex items-center justify-center font-bold text-lg md:text-xl transition-all shadow-inner shrink-0 ${isCompleted ? 'bg-velatra-accent text-zinc-900 border-velatra-accent' : isCurrent ? 'bg-velatra-accent/10 text-velatra-accent border-velatra-accent/50' : 'bg-white/50 border-zinc-200/50 text-zinc-900 group-hover:text-velatra-accent group-hover:border-velatra-accent/50 group-hover:bg-velatra-accent/10'}`}>
                    {isCompleted ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> : idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-base md:text-lg text-zinc-900 mb-1 line-clamp-1">{day.name}</div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                      {day.exercises.length} Exos
                    </div>
                  </div>
                </div>
                {isCompleted ? (
                  <Badge variant="success" className="uppercase !text-[10px] shrink-0 ml-2 shadow-sm">Terminé</Badge>
                ) : (
                  <motion.div whileHover={!isLocked ? { scale: 1.05 } : {}} whileTap={!isLocked ? { scale: 0.95 } : {}}>
                    <Button variant={isCurrent ? "primary" : "secondary"} className={`!p-3 md:!p-4 !rounded-2xl shadow-lg shrink-0 ml-2 ${isCurrent ? 'shadow-velatra-accent/20' : 'bg-white/60 hover:bg-white'}`} onClick={() => startSession(idx)} disabled={isLocked}>
                       <PlayIcon size={20} className={isCurrent ? "ml-1" : "ml-1 opacity-50"} />
                    </Button>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
