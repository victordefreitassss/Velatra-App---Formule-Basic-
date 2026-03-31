
import React from 'react';
import { AppState } from '../types';
import { Card, Badge } from '../components/UI';
import { TrophyIcon, CheckIcon } from '../components/Icons';
import { motion } from 'framer-motion';

const containerVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const TrophyPage: React.FC<{ state: AppState, setState: any }> = ({ state }) => {
  const user = state.user!;
  const sessions = state.logs.filter(l => l.memberId === Number(user.id)).length;

  const milestones = [
    { title: "Débutant", target: 1, desc: "Première séance validée" },
    { title: "Régulier", target: 10, desc: "Le sport devient une habitude" },
    { title: "Déterminé", target: 25, desc: "Membre Fidèle du club" },
    { title: "Guerrier", target: 50, desc: "Statut VIP atteint" },
    { title: "Légende", target: 100, desc: "Inspiration pour tout le club" },
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-20 max-w-2xl mx-auto"
    >
      <motion.div variants={itemVariants} className="text-center space-y-4">
        <div className="inline-flex p-6 bg-velatra-accent/10 rounded-3xl shadow-inner mb-2 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-velatra-accent/20 to-transparent opacity-50" />
           <TrophyIcon size={48} className="text-velatra-accent relative z-10" />
        </div>
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Tableau des Trophées</h1>
          <p className="text-zinc-500 text-[10px] uppercase font-black tracking-[3px] mt-2">Validé {sessions} séances à ce jour</p>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} className="space-y-4">
        {milestones.map((m, i) => {
          const unlocked = sessions >= m.target;
          return (
            <motion.div variants={itemVariants} key={i}>
              <Card className={`flex items-center gap-6 !p-6 bg-white/60 backdrop-blur-xl transition-all shadow-sm ${!unlocked ? 'opacity-60 grayscale ' : 'border-velatra-warning/30 ring-1 ring-velatra-warning/20 hover:shadow-md hover:border-velatra-warning/50'}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-sm ${unlocked ? 'bg-gradient-to-br from-velatra-warning to-orange-500 text-zinc-900' : 'bg-white/50 border  text-zinc-400'}`}>
                  {unlocked ? <CheckIcon size={28} /> : m.target}
                </div>
                <div className="flex-1">
                  <div className="font-black text-lg text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                     {m.title} 
                     {unlocked && <Badge variant="orange" className="!bg-velatra-warning/10 !text-velatra-warning !border-velatra-warning/20 shadow-sm">Débloqué</Badge>}
                  </div>
                  <div className="text-xs text-zinc-500 font-medium mt-1">{m.desc}</div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
