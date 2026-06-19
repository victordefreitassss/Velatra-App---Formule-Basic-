import React from 'react';
import { motion } from 'framer-motion';

interface BodyHeatmapProps {
  muscleData: Record<string, 'fatigued' | 'recovering' | 'fresh'>;
}

export const BodyHeatmap: React.FC<BodyHeatmapProps> = ({ muscleData }) => {
  const getColor = (status?: 'fatigued' | 'recovering' | 'fresh') => {
    switch (status) {
      case 'fatigued': return '#fca5a5'; // red-300
      case 'recovering': return '#fcd34d'; // amber-300
      case 'fresh': return '#86efac'; // emerald-300
      default: return '#f4f4f5'; // zinc-100
    }
  };

  const Muscle = ({ d, status }: { d: string, status?: 'fatigued' | 'recovering' | 'fresh' }) => (
    <motion.path
      d={d}
      fill={getColor(status)}
      stroke="#ffffff"
      strokeWidth="1.5"
      strokeLinejoin="round"
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="transition-colors duration-500"
    />
  );

  return (
    <div className="relative w-full max-w-[180px] mx-auto aspect-[1/2.2] flex items-center justify-center">
      <svg viewBox="0 0 100 230" className="w-full h-full overflow-visible drop-shadow-sm">
        {/* Head */}
        <motion.ellipse 
          cx="50" cy="20" rx="12" ry="15" 
          fill={getColor(muscleData['neck'])} 
          stroke="#ffffff" 
          strokeWidth="1.5" 
          className="transition-colors duration-500" 
        />
        
        {/* Chest */}
        <Muscle d="M 32 42 C 40 38, 60 38, 68 42 C 72 48, 70 58, 64 62 C 55 66, 45 66, 36 62 C 30 58, 28 48, 32 42 Z" status={muscleData['chest']} />
        
        {/* Abs */}
        <Muscle d="M 37 64 C 45 67, 55 67, 63 64 C 61 82, 58 95, 50 95 C 42 95, 39 82, 37 64 Z" status={muscleData['core']} />
        
        {/* Shoulders */}
        <Muscle d="M 30 40 C 20 42, 16 50, 18 60 C 22 58, 28 52, 32 46 C 32 44, 31 42, 30 40 Z" status={muscleData['shoulders']} />
        <Muscle d="M 70 40 C 80 42, 84 50, 82 60 C 78 58, 72 52, 68 46 C 68 44, 69 42, 70 40 Z" status={muscleData['shoulders']} />
        
        {/* Arms */}
        <Muscle d="M 17 62 C 12 72, 10 88, 12 98 C 18 98, 22 88, 24 72 C 25 67, 22 64, 17 62 Z" status={muscleData['arms']} />
        <Muscle d="M 83 62 C 88 72, 90 88, 88 98 C 82 98, 78 88, 76 72 C 75 67, 78 64, 83 62 Z" status={muscleData['arms']} />
        
        {/* Quads */}
        <Muscle d="M 38 98 C 46 98, 48 105, 48 118 L 44 160 C 38 160, 32 155, 30 150 C 28 128, 32 105, 38 98 Z" status={muscleData['legs']} />
        <Muscle d="M 62 98 C 54 98, 52 105, 52 118 L 56 160 C 62 160, 68 155, 70 150 C 72 128, 68 105, 62 98 Z" status={muscleData['legs']} />
        
        {/* Calves */}
        <Muscle d="M 32 165 C 40 165, 42 170, 42 180 L 38 220 C 34 220, 30 215, 28 205 C 26 190, 28 170, 32 165 Z" status={muscleData['calves']} />
        <Muscle d="M 68 165 C 60 165, 58 170, 58 180 L 62 220 C 66 220, 70 215, 72 205 C 74 190, 72 170, 68 165 Z" status={muscleData['calves']} />
      </svg>
    </div>
  );
};
