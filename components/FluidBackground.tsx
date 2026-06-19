import React from 'react';
import { motion } from 'framer-motion';

export const FluidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-[#09090b]">
      {/* Soft gradient balls that drift and animate softly with luxurious contrast */}
      <motion.div
        animate={{
          x: [0, 100, -80, 0],
          y: [0, -120, 80, 0],
          scale: [1, 1.25, 0.9, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full bg-emerald-500/12 blur-[140px]"
      />
      <motion.div
        animate={{
          x: [0, -140, 120, 0],
          y: [0, 100, -140, 0],
          scale: [1, 0.85, 1.2, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-[-20%] right-[-15%] w-[700px] h-[700px] rounded-full bg-teal-500/10 blur-[160px]"
      />
      <motion.div
        animate={{
          x: [0, 80, -80, 0],
          y: [0, 80, -80, 0],
          scale: [1, 1.15, 0.85, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[30%] left-[20%] w-[450px] h-[450px] rounded-full bg-emerald-600/5 blur-[120px]"
      />
    </div>
  );
};
