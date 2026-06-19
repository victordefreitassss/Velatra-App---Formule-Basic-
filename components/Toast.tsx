import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'success', 
  duration = 4000 
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, message]);

  const config = {
    success: {
      bg: 'bg-zinc-950 border-emerald-500/30 text-zinc-100',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    error: {
      bg: 'bg-zinc-950 border-rose-500/30 text-zinc-100',
      icon: <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />,
    },
    info: {
      bg: 'bg-zinc-950 border-blue-500/30 text-zinc-100',
      icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
    }
  };

  const current = config[type] || config.success;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
        >
          <div className={`p-4 rounded-xl border shadow-2xl flex items-center justify-between gap-3 ${current.bg} backdrop-blur-xl`}>
            <div className="flex items-center gap-3">
              {current.icon}
              <p className="text-xs sm:text-sm font-semibold pr-2 leading-relaxed">{message}</p>
            </div>
            <button 
              onClick={() => setVisible(false)}
              className="text-zinc-500 hover:text-zinc-350 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
