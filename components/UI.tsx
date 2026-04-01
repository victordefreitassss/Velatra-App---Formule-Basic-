
import React from 'react';

import { LockIcon } from './Icons';

export const Card: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`glass-card rounded-3xl p-6 transition-all duration-500 ${className} ${onClick ? 'cursor-pointer hover:border-emerald-500/40 hover:shadow-[0_0_40px_-15px_rgba(16,185,129,0.3)] hover:-translate-y-1 active:scale-[0.98]' : ''}`}
  >
    {children}
  </div>
);

export const StatBox: React.FC<{ label: string, value: string | number, className?: string, icon?: React.ReactNode, onClick?: () => void, locked?: boolean }> = ({ label, value, className = "", icon, onClick, locked }) => (
  <div 
    onClick={onClick}
    className={`bg-white border border-zinc-200 rounded-3xl p-5 flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden ${onClick ? 'cursor-pointer hover:bg-zinc-50 hover:border-emerald-500/40 hover:-translate-y-1' : ''} ${className}`}
  >
    {locked && (
      <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex items-center justify-center">
        <LockIcon size={20} className="text-emerald-500 opacity-80" />
      </div>
    )}
    {icon && <div className="text-emerald-500 mb-3 opacity-90">{icon}</div>}
    <span className="text-[10px] uppercase tracking-[3px] font-bold text-zinc-500 mb-1">{label}</span>
    <span className={`text-3xl font-display font-bold text-zinc-900 tracking-tight ${locked ? 'opacity-20 blur-[2px]' : ''}`}>{value}</span>
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'blue' | 'glass',
  fullWidth?: boolean
}> = ({ children, variant = 'primary', className = "", fullWidth, ...props }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-900 shadow-md hover:shadow-lg border border-transparent',
    secondary: 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40',
    success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40',
    blue: 'bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40',
    glass: 'glass text-zinc-900 border-zinc-200 hover:bg-zinc-50',
    ghost: 'bg-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
  };

  return (
    <button 
      {...props}
      className={`
        px-3 sm:px-6 py-3 sm:py-4 rounded-2xl font-semibold text-[10px] sm:text-[13px] tracking-wider sm:tracking-widest uppercase
        flex items-center justify-center text-center transition-all duration-300 ease-out
        disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]
        ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}
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
      w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl 
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
      w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl 
      text-zinc-900 text-[15px] placeholder:text-zinc-500
      focus:outline-none focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 resize-none
      ${props.className || ''}
    `}
  />
);

export const Badge: React.FC<{ children: React.ReactNode, variant?: 'accent' | 'blue' | 'orange' | 'success' | 'dark', className?: string }> = ({ children, variant = 'accent', className = "" }) => {
  const colors = {
    accent: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dark: 'bg-zinc-100 text-zinc-600 border-zinc-200'
  };
  return (
    <span className={`inline-block px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[2px] border backdrop-blur-md ${colors[variant]} ${className}`}>
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
