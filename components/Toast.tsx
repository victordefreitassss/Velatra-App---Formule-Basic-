
import React from 'react';
import { CheckIcon, XIcon, InfoIcon } from './Icons';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const styles = {
    success: 'bg-velatra-success text-zinc-900 shadow-lg shadow-velatra-success/20',
    error: 'bg-velatra-coaching text-zinc-900 shadow-lg shadow-velatra-coaching/20',
    info: 'bg-velatra-blue text-zinc-900 shadow-lg shadow-velatra-blue/20'
  };

  const icons = {
    success: <CheckIcon size={18} />,
    error: <XIcon size={18} />,
    info: <InfoIcon size={18} />
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] px-6 py-3 rounded-xl flex items-center gap-3 font-bold animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`${styles[type]} flex items-center gap-3 px-5 py-3 rounded-full border border-zinc-200`}>
        {icons[type]}
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
};
