import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export const Hero = () => (
  <section className="pt-32 pb-20 relative overflow-hidden">
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/5 dark:bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

    <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Coachs et adhérents, réunis
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="text-4xl sm:text-6xl font-display font-black tracking-tight leading-none text-zinc-950 dark:text-white"
      >
        Le coaching de vos adhérents, <span className="text-emerald-500 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">au même endroit</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mt-6 text-base sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed"
      >
        Préparez les programmes, organisez les séances et accompagnez chaque adhérent avec son espace de suivi et l’assistant IA Gemini.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <a
          href="/register"
          onClick={(event) => {
            event.preventDefault();
            window.history.pushState({}, '', '/register');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
        >
          Découvrir Velatra <ArrowRight className="w-5 h-5" />
        </a>
        <a
          href="#fonctionnalites"
          className="w-full sm:w-auto bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white font-bold py-4 px-8 rounded-2xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
        >
          Voir les fonctionnalités
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 0.4 }}
        className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500"
      >
        <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Programmes sportifs et alimentaires</div>
        <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Suivi coach et adhérent</div>
        <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Suggestions IA à valider</div>
      </motion.div>
    </div>
  </section>
);
