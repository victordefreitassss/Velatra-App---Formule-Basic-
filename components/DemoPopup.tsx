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
            className="w-full max-w-md bg-zinc-950/95 border border-zinc-800/80 rounded-3xl p-6 md:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.73)] relative overflow-hidden backdrop-blur-md text-white"
          >
            {/* Ambient visual background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
            
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-90 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900"
            >
              <X className="w-4 h-4" />
            </button>

            {!submitted ? (
              <div className="space-y-5">
                <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl md:text-2xl font-display font-medium text-white tracking-tight">Réservez votre démo live</h3>
                  <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-normal">
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
                    className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-800 bg-[#0c0c0e] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-white"
                  />
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-350 hover:to-emerald-450 text-neutral-950 font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
                  >
                    Demander une démo <ArrowRight className="w-4 h-4 text-neutral-950 stroke-[3]" />
                  </button>
                </form>

                <p className="text-[10px] text-zinc-500 text-center font-medium">
                  Gratuit & sans engagement • Session personnalisée
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-4"
              >
                <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">Demande reçue !</h3>
                <p className="text-xs md:text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed font-normal">
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
