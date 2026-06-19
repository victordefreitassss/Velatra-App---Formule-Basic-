import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hero } from '../components/Hero';
import { 
  Dumbbell, TrendingUp, Users, Calendar, Calculator, ShieldCheck, 
  MessageSquare, Star, ArrowRight, HelpCircle, Mail,
  Check, ChevronDown, Award, Sparkles, Activity, Apple, DollarSign
} from 'lucide-react';

// STATS SECTION (Apple-style minimalist metric grid)
const StatsSection = () => {
  const stats = [
    { value: '+15h', label: 'Libérées par semaine', desc: 'Planning d’entraînements & bilans automatisés' },
    { value: '-45%', label: 'Frais administratifs', desc: 'Unifiez vos outils distincts en une seule plateforme' },
    { value: 'x2.4', label: 'Taux de rétention', desc: 'Suivi autonome des charges et fidélisation' },
    { value: '98%', label: 'De satisfaction client', desc: 'Une image de marque d’élite pour vos coachs' }
  ];

  return (
    <section className="py-24 bg-transparent border-b border-zinc-900/40 relative">
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981] bg-[#10b981]/10 px-3 py-1 rounded-full inline-block border border-[#10b981]/10">
            MÉTRIQUES CLÉS
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white tracking-tight">
            L'excellence mesurable au quotidien
          </h2>
          <p className="text-zinc-400 max-w-md mx-auto text-xs sm:text-sm">
            Vos athlètes méritent une expérience fluide ; votre équipe mérite une gestion simplifiée.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05, duration: 0.5 }}
              className="bg-zinc-950/45 border border-zinc-900/80 p-6 rounded-2xl shadow-xl hover:border-[#10b981]/30 hover:bg-[#0c0c0f]/80 transition-all duration-300"
            >
              <div className="text-3.5xl font-display font-semibold text-[#10b981] mb-1.5 font-mono">
                {stat.value}
              </div>
              <h4 className="text-sm font-bold text-zinc-100 tracking-tight">{stat.label}</h4>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// BEFORE / AFTER (Chaos vs Velatra)
const BeforeAfterSection = () => {
  return (
    <section className="py-24 bg-transparent border-b border-zinc-900/40 relative">
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981] bg-[#10b981]/10 px-3 py-1 rounded-full inline-block border border-[#10b981]/10">
            LE SAUT QUALITATIF
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white tracking-tight">
            Dites adieu au chaos administratif
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Avant */}
          <div className="p-8 bg-[#131215]/45 border border-zinc-900/80 rounded-2xl flex flex-col justify-between">
            <div className="space-y-5">
              <span className="px-2.5 py-1 bg-red-500/10 text-red-400 font-bold text-[9px] tracking-wider uppercase rounded-full inline-block border border-red-500/10">
                Avant VELATRA (Le Chaos)
              </span>
              <ul className="space-y-3.5 text-xs text-zinc-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold bg-red-500/10 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]">✕</span>
                  <span>WhatsApp inondé de captures d'écran de séances à toute heure.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold bg-red-500/10 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]">✕</span>
                  <span>Relances de facturation maladroites et chèques impayés.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold bg-red-500/10 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]">✕</span>
                  <span>Athlètes qui égarent leurs PDF d’entraînement ou de nutrition.</span>
                </li>
              </ul>
            </div>
            <div className="text-[11px] text-zinc-500 italic pt-4 mt-6 border-t border-zinc-800/40">
              Perte de temps : 10 à 15 heures par semaine.
            </div>
          </div>

          {/* Après */}
          <div className="p-8 bg-[#0d1210]/45 border border-[#10b981]/20 rounded-2xl flex flex-col justify-between shadow-2xl hover:border-[#10b981]/30 transition-all duration-300">
            <div className="space-y-5">
              <span className="px-2.5 py-1 bg-[#10b981]/10 text-[#10b981] font-bold text-[9px] tracking-wider uppercase rounded-full inline-block border border-[#10b981]/10">
                Après VELATRA (La Sérénité)
              </span>
              <ul className="space-y-3.5 text-xs text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-[#10b981] font-bold bg-[#10b981]/15 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[11px]">✓</span>
                  <span>Espace client Web-App tout-en-un fluide et esthétique.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#10b981] font-bold bg-[#10b981]/15 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[11px]">✓</span>
                  <span>Abonnements Stripe récurrents automatisés en un clic.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#10b981] font-bold bg-[#10b981]/15 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[11px]">✓</span>
                  <span>Suivi nutritionnel interactif de pointe accessible partout.</span>
                </li>
              </ul>
            </div>
            <div className="text-[11px] text-[#10b981] font-semibold pt-4 mt-6 border-t border-[#10b981]/15">
              Sérénité absolue et image de marque premium.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// INTERACTIVE MODULE TOUR SHOWING LIGHT THEME INTERFACES
const FeatureInteractiveTour = () => {
  const [activeTab, setActiveTab] = useState<'planning' | 'performance' | 'nutrition' | 'stripe'>('planning');

  const [testEvents, setTestEvents] = useState([
    { id: 1, hour: "08:15", title: "Session Individuelle Force", user: "Marc D.", booked: true },
    { id: 2, hour: "12:00", title: "Cross-Training Small Group", user: "Complet", booked: true },
    { id: 3, hour: "18:30", title: "Bilan Nutritionnel Trimestre", user: "Créneau libre", booked: false },
  ]);

  const toggleEventBooking = (id: number) => {
    setTestEvents(testEvents.map(ev => {
      if (ev.id === id) {
        return { 
          ...ev, 
          booked: !ev.booked, 
          user: !ev.booked ? "Nouveau membre" : "Créneau libre" 
        };
      }
      return ev;
    }));
  };

  const [repMaxVal, setRepMaxVal] = useState(120);

  return (
    <section className="py-24 bg-transparent border-b border-zinc-900/40 relative" id="features">
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981] bg-[#10b981]/10 px-3 py-1 rounded-full inline-block border border-[#10b981]/10">
            INTERFACE INTERACTIVE
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white tracking-tight">
            Propulsez la gestion de vos membres
          </h2>
          <p className="text-zinc-400 max-w-sm mx-auto text-xs">
            Testez en temps réel l'ergonomie de l'application mobile Velatra.
          </p>
        </div>

        {/* Outer Frame - Premium dark console styling */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-zinc-950/45 p-6 sm:p-8 rounded-[32px] border border-zinc-900 shadow-2xl">
          
          {/* Tabs Menu on the Left */}
          <div className="lg:col-span-4 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 shrink-0">
            {[
              { id: 'planning', label: 'Planning de Réservation', icon: Calendar },
              { id: 'performance', label: 'Logger de Performance', icon: Dumbbell },
              { id: 'nutrition', label: 'Suivi Calories-Macros', icon: Apple },
              { id: 'stripe', label: 'Encaissements Stripe', icon: DollarSign }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left py-3 px-4 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 shrink-0 ${
                    isSelected 
                      ? 'bg-[#18181c] text-white border border-zinc-800 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                      : 'bg-[#0f0f12]/55 hover:bg-[#121216] text-zinc-400 border border-zinc-900/60'
                  }`}
                  style={{ minWidth: '180px' }}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-zinc-550'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Interactive Display Screen on the Right */}
          <div className="lg:col-span-8 bg-[#0b0b0e] border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between min-h-[340px] shadow-2xl">
            <AnimatePresence mode="wait">
              {activeTab === 'planning' && (
                <motion.div
                  key="planning"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-bold text-white">Agenda interactif du club</h3>
                    <p className="text-[11px] text-zinc-450">Cliquez sur un créneau libre pour simuler une réservation immédiate.</p>
                  </div>

                  <div className="space-y-2">
                    {testEvents.map((ev) => (
                      <div key={ev.id} className="p-3.5 bg-[#121216] border border-zinc-850 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-zinc-950 px-2 py-1 border border-zinc-850 rounded">{ev.hour}</span>
                          <div className="text-xs">
                            <h5 className="font-bold text-zinc-200">{ev.title}</h5>
                            <p className="text-[10px] text-zinc-500">{ev.user}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleEventBooking(ev.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            ev.booked 
                              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700/50' 
                              : 'bg-emerald-555 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:scale-[1.02] text-neutral-950 font-extrabold uppercase'
                          }`}
                        >
                          {ev.booked ? 'Annuler' : 'Réserver'}
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'performance' && (
                <motion.div
                  key="performance"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-bold text-white">Calculateur 1-Rep Max dynamique</h3>
                    <p className="text-[11px] text-zinc-455">Ajustez vos charges pour programmer de futures cibles.</p>
                  </div>

                  <div className="p-4 bg-[#121216] border border-zinc-850 rounded-xl space-y-4">
                    <div className="flex justify-between items-center text-xs text-zinc-400 font-bold">
                      <span>Votre rep max actuel :</span>
                      <span className="text-emerald-400 font-mono text-base font-black">{repMaxVal} kg</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="240"
                      step="5"
                      value={repMaxVal}
                      onChange={(e) => setRepMaxVal(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />

                    <div className="grid grid-cols-2 gap-3.5 pt-2">
                      <div className="bg-[#0b0b0e] p-3 rounded-lg border border-zinc-850 text-center">
                        <span className="text-[8px] uppercase tracking-wider text-zinc-500 block font-semibold">Charges d'endurance (75%)</span>
                        <strong className="text-sm font-bold text-zinc-200 font-mono">{Math.round(repMaxVal * 0.75)} kg</strong>
                      </div>
                      <div className="bg-[#0b0b0e] p-3 rounded-lg border border-zinc-850 text-center">
                        <span className="text-[8px] uppercase tracking-wider text-zinc-500 block font-semibold">Charges de puissance (85%)</span>
                        <strong className="text-sm font-bold text-zinc-200 font-mono">{Math.round(repMaxVal * 0.85)} kg</strong>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'nutrition' && (
                <motion.div
                  key="nutrition"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-bold text-white">Calculateur de plan repas</h3>
                    <p className="text-[11px] text-zinc-450">Synchronisé directement avec le profil athlète de la PWA.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-[#121216] border border-zinc-855 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 block font-bold">Matin</span>
                      <strong className="text-xs font-bold text-white block mt-1">45g Protéines</strong>
                      <span className="text-[9px] text-[#8c8c9e] block font-semibold mt-0.5">Œufs & Avoine</span>
                    </div>
                    <div className="p-4 bg-[#121216] border border-zinc-855 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 block font-bold">Midi</span>
                      <strong className="text-xs font-bold text-white block mt-1">60g Protéines</strong>
                      <span className="text-[9px] text-[#8c8c9e] block font-semibold mt-0.5">Poulet & Patates</span>
                    </div>
                    <div className="p-4 bg-[#121216] border border-zinc-855 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 block font-bold">Soir</span>
                      <strong className="text-xs font-bold text-white block mt-1">50g Protéines</strong>
                      <span className="text-[9px] text-[#8c8c9e] block font-semibold mt-0.5">Pavé de Saumon</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'stripe' && (
                <motion.div
                  key="stripe"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-bold text-white">Système de paiement ultra direct</h3>
                    <p className="text-[11px] text-zinc-455">Vos fonds vont directement sur votre solde de compte bancaire.</p>
                  </div>

                  <div className="p-5 border border-zinc-850 bg-[#121216] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-emerald-400 block font-bold">Commission Plateforme</span>
                      <strong className="text-2xl font-extrabold text-[#10b981] font-mono">0%</strong>
                      <span className="text-[9px] text-zinc-400 block mt-0.5">Velatra ne prend aucune taxe cachée sur vos ventes.</span>
                    </div>
                    <div className="p-4 bg-[#0a0a0d] border border-zinc-800 rounded-lg shadow-md">
                      <h4 className="text-[10px] font-bold text-zinc-450 uppercase font-mono">SOLDE STRIPE DIRECT</h4>
                      <strong className="text-lg font-bold text-white font-mono">€1,450.00</strong>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </section>
  );
};

// RETOUR SUR INVESTISSEMENT (ROI) CALCULATOR
const ROICalculator = () => {
  const [members, setMembers] = useState(80);
  const [ticket, setTicket] = useState(69);

  const monthlyRev = members * ticket;
  const yearlyRev = monthlyRev * 12;

  return (
    <section className="py-24 bg-transparent border-b border-zinc-900/40 relative">
      <div className="max-w-4xl mx-auto px-6 relative z-10 bg-[#0b0b0e]/75 border border-zinc-900/80 p-8 sm:p-10 rounded-3xl shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          <div className="space-y-4">
            <div>
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] uppercase font-mono font-black border border-emerald-500/10">CALCULATEUR ROI</span>
              <h3 className="text-2xl font-semibold text-white tracking-tight mt-2">Mesurez votre croissance</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-400 font-bold">
                  <span>Nombre d'athlètes actifs</span>
                  <span className="text-emerald-400 font-mono">{members}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="5"
                  value={members}
                  onChange={(e) => setMembers(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-400 font-bold">
                  <span>Prix moyen abonnement mensuel</span>
                  <span className="text-emerald-400 font-mono">{ticket} €</span>
                </div>
                <input
                  type="range"
                  min="29"
                  max="299"
                  step="5"
                  value={ticket}
                  onChange={(e) => setTicket(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#0e0e13] border border-zinc-850 rounded-2xl shadow-xl text-center space-y-4">
            <div>
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold">CHIFFRE D'AFFAIRES GÉNÉRÉ</span>
              <strong className="text-3.5xl font-extrabold text-white font-mono">{monthlyRev.toLocaleString()} €</strong>
              <span className="text-[10px] text-zinc-450 block font-medium">par mois</span>
            </div>
            <div className="h-px bg-zinc-850"></div>
            <div>
              <span className="text-[9.5px] uppercase tracking-wider text-emerald-400 block font-semibold">Annihilez vos intermédiaires</span>
              <p className="text-[10px] text-zinc-400 leading-normal max-w-[240px] mx-auto mt-1 font-medium">
                Vous recevez {yearlyRev.toLocaleString()} €/an directement sur votre banque via Stripe sans aucune redevance appliquée par Velatra.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

// TRANSPARENT PRICING SECTION (Apple-style minimalist simple cards)
const PricingSection = () => {
  return (
    <section className="py-24 bg-transparent border-b border-zinc-900/40 relative" id="pricing">
      <div className="max-w-4xl mx-auto px-6 relative z-10">
        
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981] bg-[#10b981]/10 px-3 py-1 rounded-full inline-block border border-[#10b981]/10">
            TARIFS TRANSPARENTS
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white tracking-tight">
            Un abonnement juste et prévisible
          </h2>
          <p className="text-zinc-455 text-xs font-semibold">
            Sans frais cachés, sans prélèvement sur vos ventes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Mensuel */}
          <div className="bg-[#0b0b0d]/55 border border-zinc-900 p-8 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-all shadow-2xl">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Formule Mensuelle</h4>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold font-mono text-white">49 €</span>
                  <span className="text-[10px] text-zinc-500">/ mois</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 font-medium">Sans aucun engagement. Résiliation en un clic.</p>
              </div>

              <div className="h-px bg-zinc-850"></div>

              <ul className="space-y-2.5 text-[11px] text-zinc-400 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3.5]" /> Accès illimité à la PWA du club
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3.5]" /> Encaissements Stripe directs (0% frais Velatra)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3.5]" /> Support technique prioritaire
                </li>
              </ul>
            </div>

            <a
              href="/register"
              className="mt-8 w-full py-3 bg-[#18181c] hover:bg-[#202026] text-white rounded-xl text-[10px] font-bold uppercase text-center tracking-wider block transition-colors"
            >
              Démarrer l'essai
            </a>
          </div>

          {/* Annuel (Best Selling) */}
          <div className="bg-[#0a120e]/85 border-2 border-emerald-500/25 p-8 rounded-2xl flex flex-col justify-between relative shadow-[0_0_30px_rgba(16,185,129,0.05)] hover:border-emerald-500/35 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-neutral-950 text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-350">
              Économisez 20%
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Formule Annuelle</h4>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold font-mono text-white">39 €</span>
                  <span className="text-[10px] text-zinc-500">/ mois</span>
                </div>
                <p className="text-[10px] text-zinc-450 mt-1 font-medium">Facturé annuellement (468 € / an).</p>
              </div>

              <div className="h-px bg-zinc-850"></div>

              <ul className="space-y-2.5 text-[11px] text-zinc-300 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3.5]" /> Toutes les fonctionnalités incluses
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3.5]" /> 2 mois d'abonnement offerts
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3.5]" /> Intégration initiale offerte par notre équipe
                </li>
              </ul>
            </div>

            <a
              href="/register"
              className="mt-8 w-full py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-350 hover:to-emerald-450 text-neutral-950 font-bold uppercase rounded-xl text-[10px] text-center tracking-wider block transition-colors"
            >
              Prendre l'offre Annuelle
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};

// ACCORDION FAQ SECTION
const FAQSection = () => {
  const faqs = [
    {
      q: "Est-ce une application Native sur l'App Store ?",
      a: "Non, c'est une Progressive Web App (PWA). Vos membres n'ont pas besoin de télécharger une lourde application depuis l'App Store. Ils l'installent d'un clic en ajoutant un raccourci direct sur l'écran d'accueil de leur téléphone."
    },
    {
      q: "Comment fonctionnent les paiements Stripe ?",
      a: "Vous connectez votre propre compte Stripe existant ou en créez un en 2 minutes. Tout l'argent des abonnements et coachings payés par vos membres arrive instantanément sur votre solde Stripe, sans intermédiaire ni taxe appliquée par Velatra."
    },
    {
      q: "Puis-je importer mes entraînements existants ?",
      a: "Absolument. Vous pouvez concevoir, dupliquer et assigner des modèles d’entraînements, des presets et des recettes types en quelques secondes depuis l’espace d’administration du coach."
    },
    {
      q: "Y-a-t-il un engagement de durée ?",
      a: "L'abonnement mensuel est 100% libre et sans engagement. Vous pouvez stopper votre abonnement à tout moment depuis vos réglages dans l'application."
    }
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="py-24 bg-transparent border-b border-zinc-900/40 relative">
      <div className="max-w-3xl mx-auto px-6 relative z-10">
        
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981] bg-[#10b981]/10 px-3 py-1 rounded-full inline-block border border-[#10b981]/10">
            FOIRE AUX QUESTIONS
          </span>
          <h2 className="text-3xl font-display font-semibold text-white tracking-tight">
            Des réponses claires à vos questions
          </h2>
        </div>

        <div className="space-y-4 max-w-2xl mx-auto">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div 
                key={idx} 
                className="bg-zinc-950/45 border border-zinc-900 rounded-xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between font-bold text-xs sm:text-sm text-zinc-200 hover:bg-zinc-900/35"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-[#0c0c10]/40"
                    >
                      <p className="px-5 pb-4 text-xs text-zinc-400 leading-relaxed font-normal">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

// MINIMALIST CONTACT FORM
const ContactSection = () => {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !msg) return;
    setSent(true);
  };

  return (
    <section className="py-24 bg-transparent relative">
      <div className="max-w-md mx-auto px-6 relative z-10">
        <div className="bg-[#0b0b0d]/55 border border-zinc-900 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          
          <div className="text-center space-y-2 mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981] bg-[#10b981]/10 px-2.5 py-0.5 rounded-full border border-[#10b981]/10">CONTACT</span>
            <h3 className="text-xl font-semibold text-white tracking-tight">Une question spécifique ?</h3>
            <p className="text-[11px] text-zinc-400">Écrivez-nous directement, nous vous répondrons en moins de 2 heures.</p>
          </div>

          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.form key="form" onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  placeholder="Votre e-mail professionnel"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 text-xs rounded-xl border border-zinc-800 bg-[#0c0c0e] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-white font-medium"
                  required
                />
                <textarea
                  placeholder="Votre demande..."
                  rows={4}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  className="w-full px-4 py-3 text-xs rounded-xl border border-zinc-800 bg-[#0c0c0e] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-white font-medium resize-none text-zinc-200"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-350 hover:to-emerald-450 text-neutral-950 text-xs font-bold uppercase rounded-xl tracking-wider shadow-md hover:shadow-lg transition-all"
                >
                  Envoyer mon message
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold border border-emerald-500/20">✓</div>
                <h4 className="text-sm font-bold text-white">Demande reçue !</h4>
                <p className="text-[11px] text-zinc-400 leading-normal max-w-[240px] mx-auto">Un spécialiste de notre équipe vous contactera et vous aidera dans les plus brefs délais.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default function HomePage() {
  return (
    <div className="relative bg-transparent text-zinc-150 min-h-screen">
      <Hero />
      <StatsSection />
      <BeforeAfterSection />
      <FeatureInteractiveTour />
      <ROICalculator />
      <PricingSection />
      <FAQSection />
      <ContactSection />
    </div>
  );
}
