import React from 'react';
import { LockIcon } from './Icons';
import { Card } from './UI';

interface FeatureLockedMessageProps {
  title: string;
}

export const FeatureLockedMessage: React.FC<FeatureLockedMessageProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 page-transition">
      <Card className="max-w-md w-full bg-zinc-50 border-zinc-200 p-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-velatra-textMuted/10 rounded-full flex items-center justify-center mb-6">
          <LockIcon size={32} className="text-zinc-500" />
        </div>
        
        <h1 className="text-3xl font-display font-bold text-zinc-900 mb-4 tracking-tight">
          {title}
        </h1>
        
        <p className="text-base text-zinc-500">
          Cette fonctionnalité n'est pas encore activée par votre club.
        </p>
      </Card>
    </div>
  );
};
