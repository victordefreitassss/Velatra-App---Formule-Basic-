import React from 'react';
import { motion } from 'framer-motion';

export const FluidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-zinc-50 dark:bg-zinc-950 transition-colors duration-500">
      {/* Soft gradient balls that drift and animate softly */}
      <motion.div
        animate={{
          x: [0, 100, -80, 0],
          y: [0, -120, 80, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-400/20 dark:bg-emerald-500/10 blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -120, 100, 0],
          y: [0, 80, -120, 0],
          scale: [1, 0.85, 1.15, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-400/20 dark:bg-teal-500/10 blur-[130px]"
      />
      <motion.div
        animate={{
          x: [0, 60, -60, 0],
          y: [0, 60, -60, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[35%] left-[25%] w-[400px] h-[400px] rounded-full bg-indigo-400/10 dark:bg-indigo-500/5 blur-[100px]"
      />
    </div>
  );
};
