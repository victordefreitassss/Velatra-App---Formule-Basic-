import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dumbbell, Zap, Calendar, Users, BarChart4, MessageSquare, 
  CheckCircle, Shield, Award, Sparkles, Smartphone, CreditCard, ChevronRight, PlayCircle
} from 'lucide-react';

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState<'coach' | 'athlete' | 'business'>('coach');

  const tabs = [
    { id: 'coach', label: 'Espace Coach & Studio', desc: 'Organisez les programmes et le suivi', icon: Dumbbell },
    { id: 'athlete', label: 'Espace Adhérent', desc: 'Retrouvez les contenus de coaching', icon: Smartphone },
    { id: 'business', label: 'Gestion de l’activité', desc: 'Retrouvez les outils de gestion', icon: BarChart4 }
  ];

  const subfeatures = {
    coach: [
      {
        title: "Préparer des séances",
        desc: "Composez les séances et les programmes sportifs à partager avec vos adhérents depuis l’espace coach.",
        metrics: "Séances • Programmes • Exercices"
      },
      {
        title: "Consulter l’activité",
        desc: "Retrouvez les informations de suivi renseignées par les adhérents et préparez les prochaines séances.",
        metrics: "Profils • Activité • Suivi"
      },
      {
        title: "Organiser le planning",
        desc: "Consultez les rendez-vous et les séances prévus dans les outils de planning de votre espace.",
        metrics: "Calendrier • Rendez-vous • Séances"
      },
      {
        title: "Suivre les évolutions",
        desc: "Consultez les mesures, les performances et les éléments d’évolution partagés avec le coach.",
        metrics: "Historique • Mesures • Performances"
      }
    ],
    athlete: [
      {
        title: "Retrouver ses séances",
        desc: "Les adhérents consultent les programmes et séances que leur coach met à leur disposition dans leur espace.",
        metrics: "Programmes • Séances • Exercices"
      },
      {
        title: "Consulter le suivi nutritionnel",
        desc: "Retrouvez les éléments de suivi alimentaire partagés avec votre coach dans votre espace.",
        metrics: "Plans • Journaux • Suivi"
      },
      {
        title: "Échanger avec son coach",
        desc: "Utilisez la messagerie de l’application pour retrouver les échanges liés à votre accompagnement.",
        metrics: "Messagerie • Échanges de fichiers"
      },
      {
        title: "Suivre ses progrès",
        desc: "Consignez l’activité sportive et retrouvez les éléments de progression disponibles dans votre espace.",
        metrics: "Historique • Performances • Objectifs"
      }
    ],
    business: [
      {
        title: "Suivre les paiements",
        desc: "Consultez les éléments financiers de votre activité et connectez Stripe depuis les paramètres prévus à cet effet.",
        metrics: "Suivi financier • Connexion Stripe selon configuration"
      },
      {
        title: "Organiser vos prospects",
        desc: "Retrouvez les contacts prospects dans un espace de suivi et organisez les étapes de prise de contact.",
        metrics: "Fiches prospects • Étapes de suivi"
      },
      {
        title: "Gérer les éléments financiers",
        desc: "Rassemblez les informations de revenus, paiements et dépenses disponibles dans les outils de gestion.",
        metrics: "Paiements • Dépenses • Factures"
      },
      {
        title: "Travailler avec plusieurs coachs",
        desc: "Organisez les profils coachs et les adhérents associés selon les rôles configurés dans votre espace.",
        metrics: "Profils coachs • Adhérents associés"
      }
    ]
  };

  return (
    <>
    <Helmet>
      <title>Fonctionnalités Velatra — Coaching, programmes et suivi</title>
      <meta name="description" content="Découvrez les fonctionnalités de Velatra pour gérer vos adhérents, préparer les programmes sportifs et organiser le suivi de votre activité." />
      <link rel="canonical" href={`${window.location.origin}/fonctionnalites`} />
    </Helmet>
    <div className="pt-32 pb-24 relative overflow-hidden bg-transparent">
      {/* Background Gradients */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-wider block w-fit mx-auto">
            PUISSANCE FONCTIONNELLE
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-none">
            Les outils de coaching et de gestion réunis dans <span className="text-emerald-500 font-extrabold">Velatra</span>
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Des outils pour organiser vos adhérents, vos programmes, votre planning et les informations utiles à votre activité.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-100/70 dark:bg-zinc-900/60 p-2 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 max-w-3xl mx-auto mb-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`p-4 rounded-xl text-left transition-all flex items-start gap-3 border-none focus:outline-none ${isSelected ? 'bg-white dark:bg-zinc-800 shadow-md ring-1 ring-zinc-200/40 dark:ring-zinc-700/30' : 'hover:bg-zinc-50 dark:hover:bg-zinc-850/60'}`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-emerald-500 text-white' : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-xs md:text-sm font-bold block ${isSelected ? 'text-zinc-950 dark:text-white' : 'text-zinc-650 dark:text-zinc-450'}`}>
                    {tab.label}
                  </h4>
                  <span className="text-[10px] text-zinc-400 block leading-tight mt-0.5">{tab.desc}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Subfeatures list */}
        <div className="bg-white dark:bg-zinc-905 border border-zinc-200/60 dark:border-zinc-850 p-8 md:p-12 rounded-[40px] shadow-xl relative min-h-[450px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-550/5 rounded-full blur-[80px] pointer-events-none"></div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10"
            >
              {subfeatures[activeTab].map((item, index) => (
                <div key={index} className="space-y-4 flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
                      <h3 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight group-hover:text-emerald-500 transition-colors">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs md:text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed font-normal">
                      {item.desc}
                    </p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-90 w-fit px-3 py-1.5 rounded-lg border border-zinc-150 dark:border-zinc-800/40 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono tracking-tight font-medium">
                    ⚡ {item.metrics}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Final CTA Banner */}
        <div className="bg-zinc-950 text-white p-8 md:p-12 rounded-[40px] border border-zinc-900 mt-20 text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-transparent"></div>
          <div className="relative z-10 max-w-xl mx-auto space-y-4">
            <Sparkles className="w-8 h-8 text-emerald-400 mx-auto" strokeWidth={1.5} />
            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white leading-tight">
              Moins de dispersion dans votre quotidien de coach
            </h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Découvrez les fonctionnalités de Velatra et choisissez les outils adaptés à votre façon de travailler.
            </p>
            <div className="pt-4 flex justify-center gap-4">
              <a
                href="/register"
                className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                Créer mon compte <ChevronRight className="w-4 h-4" />
              </a>
              <a
                href="/contact"
                className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-bold py-3 px-6 rounded-xl text-xs transition-colors"
              >
                Demander une démonstration
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
    </>
  );
}

export { FeaturesPage };
