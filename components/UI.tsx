import React from 'react';

// ============================================================================
// CARD COMPONENT
// ============================================================================
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div 
      className={`bg-zinc-950/80 backdrop-blur-md border border-zinc-900 rounded-2xl p-6 shadow-xl text-white ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// ============================================================================
// BADGE COMPONENT
// ============================================================================
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'blue' | 'dark' | 'amber' | 'danger' | 'indigo' | 'secondary' | 'error' | 'gray' | 'orange' | 'accent' | string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'gray', 
  children, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-all";
  
  const variants: Record<string, string> = {
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    dark: "bg-zinc-800 text-zinc-200 border border-zinc-700/50",
    amber: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    orange: "bg-amber-600/15 text-amber-400 border border-amber-650/20",
    accent: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    danger: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    error: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    indigo: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    gray: "bg-zinc-850 text-zinc-400 border border-zinc-800/80",
    secondary: "bg-zinc-900 text-zinc-300 border border-zinc-800",
  };

  return (
    <span 
      className={`${baseStyles} ${variants[variant] || variants.gray} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// ============================================================================
// BUTTON COMPONENT
// ============================================================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'indigo' | 'emerald' | 'success' | 'orange' | 'glass' | string;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  fullWidth = false, 
  children, 
  className = '', 
  disabled,
  type = 'button',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-xl text-xs sm:text-sm transition-all duration-200 active:scale-[0.98] select-none h-11 px-5 whitespace-nowrap cursor-pointer";
  
  const widths = fullWidth ? "w-full flex" : "";
  
  const variants: Record<string, string> = {
    primary: "bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-350 hover:to-emerald-450 text-neutral-950 font-bold shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/15 disabled:bg-none disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed",
    success: "bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-350 hover:to-emerald-450 text-neutral-950 font-bold shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/15 disabled:bg-none disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed",
    emerald: "bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-350 hover:to-emerald-450 text-neutral-950 font-bold shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/15 disabled:bg-none disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed",
    secondary: "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 hover:border-zinc-700 disabled:bg-zinc-950 disabled:border-zinc-900 disabled:text-zinc-650",
    danger: "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-350 active:bg-rose-500/35",
    ghost: "bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/50",
    outline: "border border-zinc-800 bg-transparent text-zinc-300 hover:text-white hover:bg-zinc-900 hover:border-zinc-700",
    indigo: "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-555 text-white active:scale-[0.98]",
    orange: "bg-amber-500 text-black hover:bg-amber-450 shadow-lg shadow-amber-500/10",
    glass: "bg-white/5 border border-white/10 text-white hover:bg-white/10",
  };

  return (
    <button 
      type={type}
      disabled={disabled}
      className={`${baseStyles} ${widths} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ============================================================================
// INPUT COMPONENT
// ============================================================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ 
  className = '', 
  disabled,
  ...props 
}) => {
  return (
    <input 
      disabled={disabled}
      className={`w-full h-11 px-4 text-sm rounded-xl border border-zinc-800 bg-zinc-950/50 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 hover:border-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
};

// ============================================================================
// TEXTAREA COMPONENT
// ============================================================================
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea: React.FC<TextareaProps> = ({ 
  className = '', 
  disabled,
  ...props 
}) => {
  return (
    <textarea 
      disabled={disabled}
      className={`w-full px-4 py-3 text-sm rounded-xl border border-zinc-800 bg-zinc-950/50 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 hover:border-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[80px] resize-y ${className}`}
      {...props}
    />
  );
};
