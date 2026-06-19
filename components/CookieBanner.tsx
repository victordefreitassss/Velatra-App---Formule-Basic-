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
          className="fixed bottom-6 left-6 right-6 md:left-8 md:right-auto md:max-w-md z-50 bg-zinc-950/90 border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-2xl p-5 backdrop-blur-md"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <h4 className="text-sm font-bold text-zinc-50 font-display">Gestion des cookies</h4>
              <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed font-normal">
                Velatra utilise des cookies pour analyser les performances du site et améliorer votre expérience d’utilisation. Aucun cookie publicitaire n'est déposé.
              </p>
              <div className="mt-4 flex items-center gap-2.5">
                <button
                  onClick={acceptAll}
                  className="flex-grow h-10 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-350 hover:to-emerald-450 text-neutral-950 text-xs font-bold py-2 px-3 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                >
                  Accepter
                </button>
                <button
                  onClick={declineAll}
                  className="flex-grow h-10 bg-[#121216]/80 hover:bg-[#15151c] border border-zinc-800 text-zinc-350 text-xs font-semibold py-2 px-3 rounded-xl transition-colors active:scale-[0.98]"
                >
                  Refuser
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
