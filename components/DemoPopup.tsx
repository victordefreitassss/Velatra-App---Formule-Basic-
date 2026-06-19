import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calendar, X, ArrowRight } from 'lucide-react';

export const DemoPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const hasSeenDemo = sessionStorage.getItem('velatra_demo_popup_seen');
    if (!hasSeenDemo) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        sessionStorage.setItem('velatra_demo_popup_seen', 'true');
      }, 15000); // Popup after 15s
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 2500);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/30 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Ambient visual background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            {!submitted ? (
              <div className="space-y-5">
                <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl md:text-2xl font-display font-bold text-zinc-900 dark:text-white tracking-tight">Réservez votre démo live</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Découvrez comment Velatra peut vous faire gagner jusqu'à <strong>15h par semaine</strong>. Un expert vous présente l'application en 15 minutes chrono.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="Votre adresse email pro"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    Demander une démo <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <p className="text-[10px] text-zinc-400 text-center">
                  Gratuit & sans engagement • Session personnalisée
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-4"
              >
                <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Demande reçue !</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                  Un membre de notre équipe va vous contacter sous 24h pour fixer le meilleur rendez-vous. Merci & à bientôt !
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
