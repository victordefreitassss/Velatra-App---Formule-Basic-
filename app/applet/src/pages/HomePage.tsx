import React, { useState } from 'react';
import { Hero } from '../components/Hero';
import { 
  CheckCircle, Zap, Dumbbell, Shield, ArrowUpRight, TrendingUp, Sparkles, MessageCircle, Mail, Phone, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const HomePage = () => {
  const [selectedFeature, setSelectedFeature] = useState(0);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadSent, setLeadSent] = useState(false);

  const features = [
    {
      title: "PWA Élite",
      desc: "Zéro installation App Store. Vos athlètes épinglent votre logo sur leur écran d'accueil iOS ou Android en un clic.",
      icon: Zap,
      stats: "Temps de chargement < 0.2s"
    },
    {
      title: "Nutrition & Macros",
      desc: "Création instantanée de plans caloriques et répartition automatique des macronutriments par objectifs complexes.",
      icon: TrendingUp,
      stats: "+40% d'assiduité nutritionnelle"
    },
    {
      title: "Paiements Stripe",
      desc: "Encaissez par abonnements récurrents ou séances simples. Les fonds arrivent directement sur votre compte bancaire.",
      icon: Shield,
      stats: "0% commission Velatra"
    }
  ];

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (leadName.trim() && leadEmail.trim()) {
      setLeadSent(true);
    }
  };

  return (
    <div className="bg-white text-zinc-900 leading-relaxed font-sans">
      <Hero />

      {/* Interactive Bento Features Section */}
      <section id="features" className="py-24 max-w-5xl mx-auto px-6 border-b border-zinc-100">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-mono">
            Expérience athlète
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-zinc-950">
            Conçu pour le smartphone. Épuré pour vous.
          </h2>
          <p className="text-sm text-zinc-500 font-normal">
            Concentrez-vous sur l'humain. Notre technologie invisible prend soin de l'administratif.
          </p>
        </div>

        {/* Feature grid with selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            const isSelected = selectedFeature === idx;
            return (
              <div
                key={idx}
                onClick={() => setSelectedFeature(idx)}
                className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer text-left select-none relative ${
                  isSelected 
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-md scale-[1.01]' 
                    : 'bg-zinc-50/60 text-zinc-800 border-zinc-200/50 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-emerald-500 text-white' : 'bg-white border border-zinc-200 text-zinc-900'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full ${isSelected ? 'bg-zinc-800 text-emerald-400' : 'bg-zinc-150 text-zinc-500'}`}>
                    {feat.stats}
                  </span>
                </div>
                <h3 className="text-base font-bold tracking-tight mb-2">{feat.title}</h3>
                <p className={`text-xs leading-relaxed ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {feat.desc}
                </p>
                
                {isSelected && (
                  <div className="absolute bottom-2.5 right-6 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing / Value Proposition Section */}
      <section id="pricing" className="py-24 max-w-5xl mx-auto px-6 border-b border-zinc-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-4 text-center lg:text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded">
              Tarification honnête
            </span>
            <h2 className="text-3xl md:text-3.5xl font-display font-semibold tracking-tight text-zinc-950">
              Pas de pourcentage sur votre sueur.
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed font-normal">
              Contrairement aux plateformes traditionnelles, nous prenons 0% sur vos transactions Stripe. Vos ventes restent les vôtres.
            </p>
            <div className="space-y-2 pt-2.5 text-zinc-700 text-xs text-left max-w-xs mx-auto lg:mx-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Facturation Stripe intégrée à vos offres</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Support ultra-réactif sous 24h</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Accès complet fonctionnalités illimitées</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-zinc-50/70 border border-zinc-150 p-6 md:p-8 rounded-3xl relative text-left">
            <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-1 rounded-full uppercase font-mono border border-emerald-100 animate-pulse">
              Meilleure Offre
            </div>
            
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-2 font-mono">FORMULE CLUB</span>
            <div className="flex items-baseline gap-1.5 mb-6">
              <span className="text-4.5xl font-display font-black text-zinc-950">49€</span>
              <span className="text-sm font-medium text-zinc-400">/ mois</span>
              <span className="text-xs text-zinc-400 ml-1">sans engagement</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 mb-6 border-b border-zinc-200/50">
              <div className="space-y-1">
                <strong className="text-xs font-bold text-zinc-800">Illimité</strong>
                <p className="text-[10px] text-zinc-400">Nombre de clients actifs illimités</p>
              </div>
              <div className="space-y-1">
                <strong className="text-xs font-bold text-zinc-800">Paiement direct</strong>
                <p className="text-[10px] text-zinc-400">Vos gains virés sous 1 jour ouvré</p>
              </div>
            </div>

            <a
              href="/register"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/register");
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="w-full h-11 bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center rounded-xl transition-all"
            >
              Lancer mon essai gratuit
            </a>
          </div>

        </div>
      </section>

      {/* Conversion Contact Form Section */}
      <section className="py-24 max-w-3xl mx-auto px-6 text-center">
        <div className="space-y-3.5 mb-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded">
            Démarrer la transition
          </span>
          <h2 className="text-3xl font-display font-semibold tracking-tight text-zinc-950">
            Prêt à propulser votre club ?
          </h2>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Laissez-nous vos coordonnées et recevez l'accès VIP à la maquette autonome d'unification pour mobile en exclusivité.
          </p>
        </div>

        <div className="bg-white border border-zinc-200 p-6 md:p-8 rounded-2xl shadow-sm text-left max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {!leadSent ? (
              <motion.form 
                key="form"
                onSubmit={handleLeadSubmit}
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1 font-bold">Votre nom complet</label>
                  <input
                    type="text"
                    required
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Marc-Antoine Coach"
                    className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-zinc-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1 font-bold">Adresse Email</label>
                  <input
                    type="email"
                    required
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="coach@votreclub.com"
                    className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-zinc-300"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                  id="lead_submit_btn"
                >
                  Valider ma demande
                </button>
              </motion.form>
            ) : (
              <motion.div 
                key="success"
                className="py-10 text-center space-y-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-800 tracking-tight">Merci, c'est enregistré !</h3>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    Un de nos ingénieurs sportifs prendra contact avec vous d'ici 3 heures pour configurer votre PWA direct de démo.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};
