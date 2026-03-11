
import React from 'react';

import { LockIcon } from './Icons';

export const Card: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`glass-card rounded-3xl p-6 transition-all duration-500 ${className} ${onClick ? 'cursor-pointer hover:border-velatra-accent/40 hover:shadow-[0_0_40px_-15px_rgba(99,102,241,0.3)] hover:-translate-y-1 active:scale-[0.98]' : ''}`}
  >
    {children}
  </div>
);

export const StatBox: React.FC<{ label: string, value: string | number, className?: string, icon?: React.ReactNode, onClick?: () => void, locked?: boolean }> = ({ label, value, className = "", icon, onClick, locked }) => (
  <div 
    onClick={onClick}
    className={`bg-white/[0.02] border border-white/[0.05] rounded-3xl p-5 flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden ${onClick ? 'cursor-pointer hover:bg-white/[0.04] hover:border-velatra-accent/40 hover:-translate-y-1' : ''} ${className}`}
  >
    {locked && (
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
        <LockIcon size={20} className="text-velatra-accent opacity-80" />
      </div>
    )}
    {icon && <div className="text-velatra-accent mb-3 opacity-90">{icon}</div>}
    <span className="text-[10px] uppercase tracking-[3px] font-bold text-velatra-textDark mb-1">{label}</span>
    <span className={`text-3xl font-display font-bold text-white tracking-tight ${locked ? 'opacity-20 blur-[2px]' : ''}`}>{value}</span>
  </div>
);

export const Button: React.FC<{ 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'blue' | 'glass',
  className?: string, 
  onClick?: () => void,
  disabled?: boolean,
  fullWidth?: boolean,
  type?: "button" | "submit" | "reset"
}> = ({ children, variant = 'primary', className = "", onClick, disabled, fullWidth, type = "button" }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-velatra-accent to-velatra-accentDark text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] border border-white/10',
    secondary: 'bg-white/[0.03] text-white border border-white/10 hover:bg-white/[0.08] hover:border-white/20',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40',
    success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40',
    blue: 'bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40',
    glass: 'glass text-white border-white/10 hover:bg-white/10',
    ghost: 'bg-transparent text-velatra-textMuted hover:text-white hover:bg-white/5'
  };

  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        px-6 py-4 rounded-2xl font-semibold text-[13px] tracking-widest uppercase
        flex items-center justify-center transition-all duration-300
        disabled:opacity-40 disabled:cursor-not-allowed
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
      w-full p-4 bg-white/[0.02] border border-white/10 rounded-2xl 
      text-white text-[15px] placeholder:text-white/30
      focus:outline-none focus:border-velatra-accent/50 focus:bg-white/[0.04] focus:ring-4 focus:ring-velatra-accent/10 transition-all duration-300
      ${props.className || ''}
    `}
  />
);

export const Badge: React.FC<{ children: React.ReactNode, variant?: 'accent' | 'blue' | 'orange' | 'success' | 'dark', className?: string }> = ({ children, variant = 'accent', className = "" }) => {
  const colors = {
    accent: 'bg-velatra-accent/10 text-velatra-accent border-velatra-accent/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dark: 'bg-white/5 text-velatra-textMuted border-white/10'
  };
  return (
    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[2px] border backdrop-blur-md ${colors[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const SessionDot: React.FC<{ isCoaching: boolean, size?: number }> = ({ isCoaching, size = 10 }) => (
  <div 
    className="rounded-full flex-shrink-0 animate-pulse" 
    style={{ 
      width: size, 
      height: size, 
      backgroundColor: isCoaching ? '#6366f1' : '#3b82f6',
      boxShadow: `0 0 15px ${isCoaching ? 'rgba(99, 102, 241, 0.6)' : 'rgba(59, 130, 246, 0.6)'}`
    }} 
  />
);
