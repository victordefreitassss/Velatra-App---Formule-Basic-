import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X } from 'lucide-react';

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('velatra_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('velatra_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const declineAll = () => {
    localStorage.setItem('velatra_cookie_consent', 'declined');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 left-6 right-6 md:left-8 md:right-auto md:max-w-md z-50 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl rounded-2xl p-5 backdrop-blur-md"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-500">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">Gestion des cookies</h4>
              <p className="mt-1.5 text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Velatra utilise des cookies pour analyser les performances du site et améliorer votre expérience d’utilisation. Aucun cookie publicitaire n'est déposé.
              </p>
              <div className="mt-4 flex items-center gap-2.5">
                <button
                  onClick={acceptAll}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg shadow-emerald-500/10 transition-colors"
                >
                  Accepter
                </button>
                <button
                  onClick={declineAll}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 text-xs font-medium py-2 px-3 rounded-xl transition-colors"
                >
                  Refuser
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
