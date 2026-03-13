import React from 'react';
import { LockIcon, ArrowRightIcon, CheckCircleIcon } from './Icons';

interface PremiumCTAProps {
  title: string;
  description: string;
  features: string[];
  paymentLink?: string;
}

export const PremiumCTA: React.FC<PremiumCTAProps> = ({ title, description, features, paymentLink }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="w-20 h-20 bg-velatra-accent/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
        <LockIcon size={32} className="text-velatra-accent" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-display font-bold text-zinc-900 mb-4 tracking-tight">
        Débloquez <span className="text-velatra-accent">{title}</span>
      </h1>
      
      <p className="text-lg text-zinc-500 max-w-2xl mb-12">
        {description}
      </p>

      <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-8 max-w-md w-full backdrop-blur-xl text-left mb-10">
        <h3 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <span className="w-2 h-6 bg-velatra-accent rounded-full"></span>
          Inclus dans l'abonnement Supérieur
        </h3>
        
        <ul className="space-y-4">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <CheckCircleIcon size={20} className="text-velatra-accent shrink-0 mt-0.5" />
              <span className="text-zinc-500">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <button 
        onClick={() => paymentLink && window.open(paymentLink, '_blank')}
        className="bg-velatra-accent hover:bg-velatra-accentDark text-zinc-900 px-8 py-4 rounded-2xl font-bold tracking-wide transition-all duration-300 flex items-center gap-3 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-105"
      >
        Mettre à niveau mon abonnement
        <ArrowRightIcon size={20} />
      </button>
    </div>
  );
};
