import React from 'react';

interface BodyHeatmapProps {
  muscleData: Record<string, 'fatigued' | 'recovering' | 'fresh'>;
}

export const BodyHeatmap: React.FC<BodyHeatmapProps> = ({ muscleData }) => {
  const getColor = (status?: 'fatigued' | 'recovering' | 'fresh') => {
    switch (status) {
      case 'fatigued': return '#ef4444'; // red-500
      case 'recovering': return '#f97316'; // orange-500
      case 'fresh': return '#22c55e'; // green-500
      default: return '#e4e4e7'; // zinc-200
    }
  };

  return (
    <div className="relative w-full max-w-[200px] mx-auto aspect-[1/2]">
      <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-md">
        {/* Head */}
        <circle cx="50" cy="20" r="12" fill={getColor(muscleData['neck'])} stroke="#a1a1aa" strokeWidth="1" />
        
        {/* Chest/Pecs */}
        <path d="M 35 40 Q 50 50 65 40 L 60 60 Q 50 65 40 60 Z" fill={getColor(muscleData['chest'])} stroke="#a1a1aa" strokeWidth="1" />
        
        {/* Core/Abs */}
        <path d="M 40 60 Q 50 65 60 60 L 55 90 Q 50 95 45 90 Z" fill={getColor(muscleData['core'])} stroke="#a1a1aa" strokeWidth="1" />
        
        {/* Shoulders */}
        <circle cx="30" cy="40" r="8" fill={getColor(muscleData['shoulders'])} stroke="#a1a1aa" strokeWidth="1" />
        <circle cx="70" cy="40" r="8" fill={getColor(muscleData['shoulders'])} stroke="#a1a1aa" strokeWidth="1" />
        
        {/* Arms */}
        <path d="M 25 45 L 15 80 L 22 82 L 32 50 Z" fill={getColor(muscleData['arms'])} stroke="#a1a1aa" strokeWidth="1" />
        <path d="M 75 45 L 85 80 L 78 82 L 68 50 Z" fill={getColor(muscleData['arms'])} stroke="#a1a1aa" strokeWidth="1" />
        
        {/* Legs / Quads */}
        <path d="M 45 90 L 35 150 L 45 150 L 50 100 Z" fill={getColor(muscleData['legs'])} stroke="#a1a1aa" strokeWidth="1" />
        <path d="M 55 90 L 65 150 L 55 150 L 50 100 Z" fill={getColor(muscleData['legs'])} stroke="#a1a1aa" strokeWidth="1" />
        
        {/* Calves */}
        <path d="M 35 150 L 30 190 L 40 190 L 45 150 Z" fill={getColor(muscleData['calves'])} stroke="#a1a1aa" strokeWidth="1" />
        <path d="M 65 150 L 70 190 L 60 190 L 55 150 Z" fill={getColor(muscleData['calves'])} stroke="#a1a1aa" strokeWidth="1" />
      </svg>
    </div>
  );
};
