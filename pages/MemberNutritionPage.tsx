import React from 'react';
import { AppState } from '../types';
import { MemberNutritionView } from '../components/MemberNutritionView';
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

export const MemberNutritionPage: React.FC<{ state: AppState, showToast: (msg: string, type?: 'success' | 'error') => void, setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, showToast, setState }) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <MemberNutritionView state={state} showToast={showToast} />
      {!state.nutritionPlans.some(plan => Number(plan.memberId) === Number(state.user?.id)) && <div className="mt-5 space-y-3 rounded-2xl border border-zinc-200 bg-white p-5"><p className="text-sm leading-6 text-zinc-700">Parlez de vos habitudes à votre coach pour préparer un accompagnement adapté. Le suivi de l’hydratation reste accessible depuis l’accueil.</p><button type="button" className="min-h-11 rounded-xl bg-emerald-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => setState(previous => ({ ...previous, page: 'messages' }))}>Écrire à mon coach</button></div>}
    </motion.div>
  );
};
