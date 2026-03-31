import React from 'react';
import { AppState } from '../types';
import { Card, Badge } from '../components/UI';
import { GiftIcon, CheckIcon } from '../components/Icons';
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

export const MemberLoyaltyPage: React.FC<{ state: AppState }> = ({ state }) => {
  const user = state.user!;
  const xp = user.xp || 0;
  const clubTiers = state.currentClub?.settings?.loyalty?.tiers || [];

  const rewards = clubTiers.length > 0 ? clubTiers.map(t => ({
    title: t.reward,
    cost: t.points,
    desc: `Atteignez ${t.points} XP pour débloquer cette récompense`
  })) : [
    { title: "Gourde du Club", cost: 5000, desc: "Gourde isotherme 1L" },
    { title: "T-shirt Technique", cost: 15000, desc: "T-shirt respirant avec logo" },
    { title: "Séance Coaching", cost: 30000, desc: "1h de coaching privé" },
    { title: "Mois Offert", cost: 50000, desc: "1 mois d'abonnement gratuit" },
  ];

  // Sort rewards by cost
  rewards.sort((a, b) => a.cost - b.cost);

  return (
    <div className="space-y-8 page-transition pb-20 p-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <div className="inline-block p-4 bg-velatra-warning/10 rounded-full shadow-inner mb-2">
           <GiftIcon size={48} className="text-velatra-warning" />
        </div>
        <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Fidélité</h1>
        <p className="text-zinc-900 text-[10px] uppercase font-bold tracking-[3px]">Gagnez de l'XP à chaque séance</p>
      </div>

      <Card className="bg-velatra-bgCard  text-center py-8">
        <div className="text-sm text-zinc-500 uppercase tracking-widest font-bold mb-2">Votre Expérience</div>
        <div className="text-6xl font-black text-velatra-warning italic">{xp}</div>
        <div className="text-xs text-zinc-500 mt-2">XP cumulés</div>
      </Card>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        <h2 className="text-xl font-bold text-zinc-900 mb-4">Récompenses & Paliers</h2>
        {rewards.map((r, i) => {
          const unlocked = xp >= r.cost;
          return (
            <motion.div key={i} variants={itemVariants}>
              <Card className={`flex items-center gap-4 bg-white/60 backdrop-blur-xl  hover:shadow-lg transition-all duration-300 ${!unlocked ? 'opacity-50 grayscale' : 'border-velatra-warning/50'}`}>
                <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold ${unlocked ? 'bg-velatra-warning text-velatra-bg' : 'bg-zinc-50 border  text-zinc-900'}`}>
                  {unlocked ? <CheckIcon size={24} /> : <span className="text-lg">{r.cost}</span>}
                  {!unlocked && <span className="text-[8px] uppercase">XP</span>}
                </div>
                <div className="flex-1">
                  <div className="font-bold flex items-center gap-2 text-zinc-900 text-lg">
                     {r.title} 
                     {unlocked && <Badge variant="orange">Débloqué</Badge>}
                  </div>
                  <div className="text-sm text-zinc-500">{r.desc}</div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
