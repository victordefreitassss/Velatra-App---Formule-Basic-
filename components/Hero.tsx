import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play, CheckCircle2, ShieldAlert } from 'lucide-react';

export const Hero = () => {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoUrl = "https://baiecbhcbxtamz6h.private.blob.vercel-storage.com/Velatra.mp4?vercel-blob-delegation=eyJzdG9yZUlkIjoic3RvcmVfYmFpRUNCSENCeHRBTXo2SCIsIm93bmVySWQiOiJ0ZWFtX010UmVwVmNuM2djaGJzVUhPd3hITnhUaiIsInBhdGhuYW1lIjoiKiIsIm9wZXJhdGlvbnMiOlsiZ2V0IiwiaGVhZCJdLCJ2YWxpZFVudGlsIjoxNzgxNjkxNjgxNjU1LCJpYXQiOjE3ODE2NDg0ODE3NzB9.YIhGm3iZLFlYU9RfETY1Ny3y-2mEDYZOlU0TAoAnTIA&vercel-blob-signature=Q9KXkfYU144Lw0IaXKmmJ1o5FlGz-afwc0TuF_7VA_4";

  return (
    <section className="pt-32 pb-20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/5 dark:bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            L'innovation Fitness 2026
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-4xl sm:text-6xl font-display font-black tracking-tight leading-none text-zinc-950 dark:text-white"
        >
          Gagnez jusqu'à <span className="text-emerald-500 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">15h par semaine</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-6 text-base sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          Velatra est l'écosystème digital complet pour les professionnels du fitness. 
          Gérez vos membres, planifiez vos séances et suivez les performances en un clic.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="/register"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, "", "/register");
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
          >
            Commencer gratuitement <ArrowRight className="w-5 h-5" />
          </a>
          <button
            onClick={() => setIsPlayingVideo(true)}
            className="w-full sm:w-auto bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white font-bold py-4 px-8 rounded-2xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
          >
            <Play className="w-4 h-4 fill-current text-emerald-500" /> Voir la vidéo démo
          </button>
        </motion.div>

        {/* Value badges below CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500"
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sans engagement
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Essai gratuit pendant 14 jours
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Support ultra réactif 7j/7
          </div>
        </motion.div>

        {/* Video Player Modal */}
        <AnimatePresence>
          {isPlayingVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-zinc-800"
              >
                <button
                  onClick={() => setIsPlayingVideo(false)}
                  className="absolute top-4 right-4 z-[120] bg-zinc-900/85 hover:bg-zinc-800 text-white rounded-full p-2 border border-zinc-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
