
import React from 'react';

import { LockIcon } from './Icons';

export const Card: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`va-card border rounded-2xl p-5 transition-all duration-200 ${className} ${onClick ? 'cursor-pointer hover:border-emerald-500/40 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]' : ''}`}
  >
    {children}
  </div>
);

export const StatBox: React.FC<{ label: string, value: string | number, className?: string, icon?: React.ReactNode, onClick?: () => void, locked?: boolean }> = ({ label, value, className = "", icon, onClick, locked }) => (
  <div 
    onClick={onClick}
    className={`va-stat bg-white border border-zinc-200 rounded-3xl p-5 flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden ${onClick ? 'cursor-pointer hover:bg-zinc-50 hover:border-emerald-500/40 hover:-translate-y-1' : ''} ${className}`}
  >
    {locked && (
       <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex items-center justify-center">
        <LockIcon size={20} className="text-emerald-500 opacity-80" />
      </div>
    )}
    {icon && <div className="text-emerald-500 mb-3 opacity-90">{icon}</div>}
    <span className="text-xs tracking-normal font-medium text-zinc-500 mb-1">{label}</span>
    <span className={`text-3xl font-display font-semibold text-zinc-900 tracking-tight ${locked ? 'opacity-20 blur-[2px]' : ''}`}>{value}</span>
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'blue' | 'glass',
  fullWidth?: boolean
}> = ({ children, variant = 'primary', className = "", fullWidth, ...props }) => {
  // Legacy names remain accepted so existing callers share four visual families.
  const family = ({ primary: 'primary', secondary: 'secondary', danger: 'danger', ghost: 'ghost', success: 'secondary', blue: 'secondary', glass: 'secondary' } as const)[variant];
  const variants = {
    primary: 'va-button--primary bg-emerald-900 hover:bg-emerald-950 text-white border border-transparent',
    secondary: 'va-button--secondary bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300',
    danger: 'va-button--danger bg-red-50 text-red-800 border border-red-200 hover:bg-red-100',
    ghost: 'va-button--ghost bg-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
  };

  return (
    <button 
      {...props}
      className={`
        va-button px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm tracking-normal
        flex items-center justify-center text-center transition-all duration-200 ease-out
        disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]
        ${variants[family]} ${fullWidth ? 'w-full' : ''} ${className}
      `}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props}
    className={`
      va-input w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl
      text-zinc-900 text-[15px] placeholder:text-zinc-500
      focus:outline-none focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300
      ${props.className || ''}
    `}
  />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea 
    {...props}
    className={`
      va-input w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl
      text-zinc-900 text-[15px] placeholder:text-zinc-500
      focus:outline-none focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 resize-none
      ${props.className || ''}
    `}
  />
);

export const Badge: React.FC<{ children: React.ReactNode, variant?: 'accent' | 'blue' | 'orange' | 'success' | 'dark', className?: string }> = ({ children, variant = 'accent', className = "" }) => {
  const colors = {
    accent: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    blue: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    orange: 'bg-amber-50 text-amber-800 border-amber-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dark: 'bg-zinc-100 text-zinc-600 border-zinc-200'
  };
  return (
    <span className={`va-badge inline-block px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-normal border ${colors[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const SessionDot: React.FC<{ size?: number }> = ({ size = 10 }) => (
  <div 
    className="rounded-full flex-shrink-0 animate-pulse" 
    style={{ 
      width: size, 
      height: size, 
      backgroundColor: '#3b82f6',
      boxShadow: `0 0 15px rgba(59, 130, 246, 0.6)`
    }} 
  />
);
