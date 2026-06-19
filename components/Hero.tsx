import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Play, Dumbbell, Check, Apple, Users
} from 'lucide-react';

export const Hero = () => {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [activeTab, setActiveTab] = useState<'workouts' | 'nutrition' | 'crm'>('workouts');
  const videoUrl = "https://baiecbhcbxtamz6h.private.blob.vercel-storage.com/Velatra.mp4?vercel-blob-delegation=eyJzdG9yZUlkIjoic3RvcmVfYmFpRUNCSENCeHRBTXo2SCIsIm93bmVySWQiOiJ0ZWFtX010UmVwVmNuM2djaGJzVUhPd3hITnhUaiIsInBhdGhuYW1lIjoiKiIsIm9wZXJhdGlvbnMiOlsiZ2V0IiwiaGVhZCJdLCJ2YWxpZFVudGlsIjoxNzgxNjkxNjgxNjU1LCJpYXQiOjE3ODE2NDg0ODE3NzB9.YIhGm3iZLFlYU9RfETY1Ny3y-2mEDYZOlU0TAoAnTIA&vercel-blob-signature=Q9KXkfYU144Lw0IaXKmmJ1o5FlGz-afwc0TuF_7VA_4";

  // State for Workouts demo inside the phone frame
  const [completedSets, setCompletedSets] = useState<boolean[]>([true, true, false, false]);
  const toggleSet = (idx: number) => {
    const next = [...completedSets];
    next[idx] = !next[idx];
    setCompletedSets(next);
  };
  const workoutProgress = Math.round((completedSets.filter(Boolean).length / completedSets.length) * 100);

  // State for Nutrition demo
  const [calories, setCalories] = useState(2400);
  const proteins = Math.round((calories * 0.3) / 4);
  const carbs = Math.round((calories * 0.45) / 4);
  const fats = Math.round((calories * 0.25) / 9);

  // State for CRM demo
  const [leads, setLeads] = useState([
    { id: 1, name: 'Lucas B.', status: 'Nouveau Plan', contacted: false },
    { id: 2, name: 'Marie L.', status: 'Bilan réservé', contacted: true },
    { id: 3, name: 'Sébastien R.', status: 'Relancé', contacted: false },
  ]);

  const [notif, setNotif] = useState<string | null>(null);

  const triggerRelance = (id: number) => {
    setLeads(leads.map(lead => lead.id === id ? { ...lead, contacted: true, status: 'SMS d’accès envoyé' } : lead));
    const targetName = leads.find(l => l.id === id)?.name || "l'athlète";
    setNotif(`⚡ SMS d'accès PWA programmé pour ${targetName}`);
    setTimeout(() => setNotif(null), 3500);
  };

  return (
    <section className="pt-36 pb-20 relative overflow-hidden bg-transparent text-white border-b border-zinc-900/40">
      
      {/* Intense futuristic backdrop glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Premium athletic/SaaS typography */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900/80 border border-zinc-800/80 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 font-mono">
                PWA Mobile d'élite
              </span>
            </div>

            <h1 className="text-4.5xl sm:text-5xl md:text-5.5xl font-display font-medium tracking-tight leading-[1.08] text-white">
              Votre club.<br />
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent font-bold">Directement dans leur poche.</span>
            </h1>

            <p className="text-sm md:text-base text-zinc-400 max-w-md mx-auto lg:mx-0 leading-relaxed font-normal">
              Velatra unifie séances de sport autonomes, nutrition personnalisée et encaissements Stripe en une seule application web fluide, rapide et esthétique.
            </p>

            {/* Premium CTA Actions */}
            <div className="flex flex-col sm:flex-row items-stretch justify-center lg:justify-start gap-3.5 pt-2">
              <a
                href="/register"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, "", "/register");
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-350 hover:to-emerald-450 text-neutral-950 font-bold rounded-xl text-xs tracking-wider uppercase transition-all duration-200 shadow-[0_4px_24px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.5)] active:scale-[0.98]"
              >
                Essai gratuit <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </a>
              <button
                onClick={() => setIsPlayingVideo(true)}
                className="inline-flex items-center justify-center gap-2 h-12 px-5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 active:border-zinc-700 text-zinc-200 hover:text-white font-semibold rounded-xl text-xs transition-all duration-200"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" /> Voir la démo (1 min)
              </button>
            </div>

            {/* Proof Points */}
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-x-5 gap-y-1 text-zinc-500 text-[11px] font-semibold pt-2">
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> Sans engagement</span>
              <span className="w-1 h-1 rounded-full bg-zinc-800 hidden sm:block"></span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> Stripe 0% commission</span>
              <span className="w-1 h-1 rounded-full bg-zinc-800 hidden sm:block"></span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> PWA Android & iOS</span>
            </div>
          </div>

          {/* Right Column: Premium iPhone Simulator in Dark Theme */}
          <div className="lg:col-span-6 w-full max-w-[320px] sm:max-w-[340px] mx-auto relative pt-4">
            
            {/* Soft backdrop shadows */}
            <div className="absolute inset-x-0 -top-4 -bottom-4 bg-gradient-to-tr from-emerald-500/[0.05] to-transparent rounded-[48px] blur-3xl pointer-events-none" />

            {/* Minimal Smartphone Outer Dark Shell */}
            <div className="relative mx-auto rounded-[42px] border-[8px] border-zinc-900 bg-zinc-950 p-2 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-zinc-800/40">
              
              {/* Speaker Notch */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-zinc-900 rounded-full z-40 flex items-center justify-center">
                <div className="w-8 h-1 bg-zinc-800 rounded-full mb-0.5" />
                <div className="absolute right-5 w-1 h-1 bg-zinc-800 rounded-full mb-0.5" />
              </div>

              {/* Simulated Screen Body - Dark High Tech Theme */}
              <div className="bg-[#0b0b0e] rounded-[30px] overflow-hidden border border-zinc-900 flex flex-col justify-between h-[480px] select-none text-zinc-100 relative">
                
                {/* App Bar (iOS Minimalist Header) */}
                <div className="bg-[#0e0e11]/90 backdrop-blur-md border-b border-zinc-900/60 px-4 pt-6 pb-2.5 flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-mono tracking-widest text-zinc-400 font-bold uppercase">VELATRA APP</span>
                  </div>
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">PWA LIVE</span>
                </div>

                {/* Simulated Content Area */}
                <div className="flex-1 overflow-y-auto p-3.5 flex flex-col justify-between">
                  <div>
                    {/* Simulator Segment Picker */}
                    <div className="grid grid-cols-3 bg-[#0f0f13] p-1 rounded-xl border border-zinc-900/80 mb-3.5 gap-1">
                      {[
                        { id: 'workouts', label: 'Séance', icon: Dumbbell },
                        { id: 'nutrition', label: 'Repas', icon: Apple },
                        { id: 'crm', label: 'Clients', icon: Users }
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1 ${
                              isSelected 
                                ? 'bg-[#18181c] text-white border border-zinc-800/80 shadow' 
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                            style={{ minHeight: '32px' }}
                          >
                            <Icon className={`w-3 h-3 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Panels */}
                    <AnimatePresence mode="wait">
                      {activeTab === 'workouts' && (
                        <motion.div
                          key="workouts"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-3"
                        >
                          <div className="bg-[#111116] p-3 rounded-xl border border-zinc-850 flex justify-between items-center shadow-md">
                            <div>
                              <span className="text-[7px] font-mono uppercase tracking-wider text-emerald-400 block font-bold">SÉANCE D'AUJOURD'HUI</span>
                              <strong className="text-xs font-bold text-white tracking-tight">Full Body Élite</strong>
                            </div>
                            <div className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-semibold font-mono">
                              {workoutProgress}%
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[8px] text-zinc-450 uppercase tracking-widest pl-0.5 font-bold">LOG DES SÉRIES :</span>
                            <div className="grid grid-cols-4 gap-1.5">
                              {completedSets.map((done, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => toggleSet(idx)}
                                  className={`h-9 rounded-lg border flex items-center justify-center transition-all ${
                                    done 
                                      ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-bold' 
                                      : 'bg-[#121216] border-zinc-850 text-zinc-500 hover:text-zinc-400 hover:bg-[#15151c]'
                                  }`}
                                  style={{ minHeight: '36px' }}
                                >
                                  <span className="text-[9px] font-mono font-bold">S{idx+1}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <span className="text-[8px] text-zinc-500 text-center block italic font-medium">
                            Toucher pour simuler l'entraînement athlète.
                          </span>
                        </motion.div>
                      )}

                      {activeTab === 'nutrition' && (
                        <motion.div
                          key="nutrition"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-3"
                        >
                          <div className="space-y-1.5 bg-[#111116] p-3 border border-zinc-850 rounded-xl shadow-md">
                            <div className="flex justify-between items-center text-[9px] text-zinc-400 font-bold">
                              <span>Objectif Calorique</span>
                              <span className="text-emerald-400 font-mono font-bold">{calories} kcal</span>
                            </div>
                            <input
                              type="range"
                              min="1800"
                              max="3200"
                              step="200"
                              value={calories}
                              onChange={(e) => setCalories(Number(e.target.value))}
                              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 bg-[#111116] p-2 rounded-xl border border-zinc-850 shadow-md">
                            <div className="text-center">
                              <span className="text-[7px] text-zinc-450 uppercase block font-bold">Protides</span>
                              <strong className="text-xs font-bold text-white block">{proteins}g</strong>
                            </div>
                            <div className="text-center border-x border-zinc-800">
                              <span className="text-[7px] text-zinc-450 uppercase block font-bold">Glucides</span>
                              <strong className="text-xs font-bold text-white block">{carbs}g</strong>
                            </div>
                            <div className="text-center">
                              <span className="text-[7px] text-zinc-450 uppercase block font-bold">Lipides</span>
                              <strong className="text-xs font-bold text-white block">{fats}g</strong>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'crm' && (
                        <motion.div
                          key="crm"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-2"
                        >
                          {leads.map((lead) => (
                            <div 
                              key={lead.id} 
                              className="bg-[#111116] border border-zinc-850/60 px-2.5 py-1.5 rounded-lg flex items-center justify-between shadow-md"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-zinc-200">{lead.name}</span>
                                  <span className="text-[6.5px] font-bold uppercase px-1 bg-zinc-800 text-zinc-400 rounded font-mono">
                                    {lead.status === 'SMS d’accès envoyé' ? 'OK' : 'Nouveau'}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => triggerRelance(lead.id)}
                                disabled={lead.contacted}
                                className={`h-6 px-2 rounded text-[8px] font-bold uppercase tracking-wider transition-all leading-none ${
                                  lead.contacted 
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/40' 
                                    : 'bg-emerald-500 text-zinc-950 font-black hover:bg-emerald-400 shadow-sm'
                                }`}
                              >
                                {lead.contacted ? 'OK' : 'Relance'}
                              </button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Alert container */}
                  <div className="h-8 relative flex items-center justify-center">
                    <AnimatePresence>
                      {notif && (
                        <motion.div
                          initial={{ opacity: 0, y: 5, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -5, scale: 0.95 }}
                          className="absolute inset-x-0 bottom-0 bg-emerald-500 text-zinc-950 text-[8px] font-black uppercase tracking-wider py-1 rounded-md shadow-md text-center"
                        >
                          {notif}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>

                {/* Simulated direct install action */}
                <div className="bg-[#0e0e11] p-3 border-t border-zinc-900 flex flex-col gap-1.5">
                  <a
                    href="/register"
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, "", "/register");
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                    className="w-full bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-350 hover:to-emerald-450 text-neutral-950 text-[9px] font-bold uppercase text-center py-2 rounded-lg tracking-wider transition-all"
                  >
                    Activer mon club
                  </a>
                  <span className="text-[7.5px] text-zinc-500 block text-center font-semibold">
                    Installer sans App Store • Sans intermédiaires
                  </span>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Demo Video Modal */}
      <AnimatePresence>
        {isPlayingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
            >
              <button
                onClick={() => setIsPlayingVideo(false)}
                className="absolute top-3 right-3 z-[120] bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full p-1.5 border border-zinc-700 transition-colors"
                id="close_video_modal_v3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    </section>
  );
};
