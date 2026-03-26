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

export const MemberNutritionPage: React.FC<{ state: AppState, showToast: (msg: string, type?: 'success' | 'error') => void }> = ({ state, showToast }) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <MemberNutritionView state={state} showToast={showToast} />
    </motion.div>
  );
};
