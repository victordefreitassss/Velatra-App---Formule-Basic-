import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Star, Users, Briefcase, ChevronRight, CheckCircle, 
  HelpCircle, Sparkles, TrendingUp, HelpCircleIcon
} from 'lucide-react';

export default function SolutionsPage() {
  const [activeUsecase, setActiveUsecase] = useState<number>(0);

  const usecases = [
    {
      title: "Coachs Indépendants & Personnels",
      desc: "Idéal pour piloter l'entraînement de 5 à 40 athlètes à distance ou à domicile. Centralisez vos plans d'exercices, simplifiez vos diagnostics de nutrition et protégez votre temps précieux.",
      problem: "Perdre 12 heures par semaine à envoyer des fichiers PDF sur WhatsApp, courir après les virement bancaires manuels, et mélanger sa vie privée de sa vie pro.",
      solution: "Un espace client mobile autonome où l'athlète consigne ses charges, accède à ses séances vidéo illustrées de saison, et règle son abonnement Stripe récurrent.",
      metrics: "Programmes centralisés • Suivi des progrès au même endroit",
      features: [
        "Création de fiches d'exercices en 3 clics",
        "Modèles de nutrition & calories clonables",
        "Messagerie privée et isolée des numéros perso",
        "Suivi de poids et courbe de rep-max d'un élève"
      ],
      tag: "Indépendants"
    },
    {
      title: "Studios Semi-Privés & Personal Training",
      desc: "Simplifiez le contrôle d'accès et l'agenda de réservation de vos séances en petit groupe. Donnez une image de marque d'élite pour fidéliser vos adhérents sur le long terme.",
      problem: "Les clients qui annulent à la dernière minute par SMS, les conflits d'horaires sur les créneaux, et l'impossibilité de limiter la capacité de matériel.",
      solution: "Un planificateur réactif intelligent où le membre réserve sa place en 3 secondes. Les annulations tardives sont créditées automatiquement suivant vos règles de studio.",
      metrics: "Réservations regroupées • Créneaux et capacités visibles",
      features: [
        "Verrous de capacité par créneau de coaching",
        "Gestion d'absence automatique paramétrable",
        "Notifications push de rappels de réservation",
        "Onboarding digitalisé par QR Code à la salle"
      ],
      tag: "Boutique Studios"
    },
    {
      title: "Box de CrossFit & Gyms Fonctionnels",
      desc: "Gérez vos WODs collectifs de haute intensité. Donnez vos instructions de séances quotidiennes et permettez à vos athlètes de comparer leurs performances en direct.",
      problem: "Difficulté de suivre la régularité physique de dizaines de membres, matériels surchargés, et comptabilisation artisanale des forfaits de crédits de séances.",
      solution: "Une interface communautaire d'unification avec consignation de rep-max de référence (Squat, Snatch, Handstand) et des dashboards d'occupation horaire réels.",
      metrics: "Séances et résultats regroupés • Suivi des forfaits",
      features: [
        "Calculateur automatique du niveau de force athlète",
        "Tableau de score pour les records de référence du club",
        "Détection proactive des clients en baisse de rythme",
        "Gestion de forfaits multi-crédits de séances"
      ],
      tag: "CrossFit Clubs"
    },
    {
      title: "Clubs Multisports & Complexes",
      desc: "Automatisez la comptabilité de vos centaines d'élèves, contrôlez les transactions Stripe en temps réel, et harmonisez le travail de votre équipe multi-coachs.",
      problem: "Paiements rejetés non contestés, manque de visibilité sur les performances de chaque coach externe, et données sensibles éparpillées.",
      solution: "Un centre de contrôle de super-administration sécurisé. Droits restreints par collaborateur, alertes de paiement automatique Stripe, et graphiques de marge brute.",
      metrics: "Gestion multi-activités • Documents partagés avec contrôle d'accès",
      features: [
        "Portails multi-coachs aux droits d'accès étanches",
        "CRM prospects connecté pour capturer de nouveaux leads",
        "Suivi comptable consolidé avec exports fiscaux CSV",
        "Contrats et rapports de signature dématérialisés"
      ],
      tag: "Grands Complexes"
    }
  ];

  return (
    <div className="pt-32 pb-24 relative overflow-hidden bg-transparent">
      {/* Background decoration shapes */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-6">
        
        {/* Header Block */}
        <div className="text-center space-y-4 mb-16">
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-wider block w-fit mx-auto">
            SOLUTIONS PAR SEGMENT
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-none">
            Taillé pour chaque modèle d'affaires sportif
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Velatra élimine les frictions administratives en s'adaptant à vos spécificités de gestion réelles, que vous exerciez seul à distance ou à la tête d’un réseau de salles multisports.
          </p>
        </div>

        {/* Dynamic Selector Row */}
        <div className="flex flex-wrap gap-2.5 justify-center mb-12 max-w-4xl mx-auto">
          {usecases.map((usecase, idx) => (
            <button
              key={idx}
              onClick={() => setActiveUsecase(idx)}
              className={`p-3.5 px-6 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${activeUsecase === idx ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-white dark:bg-zinc-905 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-850 hover:border-zinc-300'}`}
            >
              🏢 {usecase.tag}
            </button>
          ))}
        </div>

        {/* Selected Use Case Details */}
        <div className="bg-white dark:bg-zinc-905 border border-zinc-200/60 dark:border-zinc-850 rounded-[40px] p-8 md:p-12 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 relative min-h-[500px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none"></div>

          {/* Left Summary */}
          <div className="md:col-span-5 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-black tracking-widest rounded-full">
                Solution {usecases[activeUsecase].tag}
              </span>
              <h2 className="text-2xl font-display font-black text-zinc-950 dark:text-white tracking-tight leading-snug">
                {usecases[activeUsecase].title}
              </h2>
              <p className="text-xs md:text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed font-normal">
                {usecases[activeUsecase].desc}
              </p>
            </div>

            <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 shrink-0 font-semibold text-emerald-600 dark:text-emerald-400 text-xs tracking-tight">
              🏆 {usecases[activeUsecase].metrics}
            </div>
          </div>

          {/* Right Exhaustive Breakdown */}
          <div className="md:col-span-7 space-y-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-850/60 pt-6 md:pt-0 md:pl-8">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-red-500 block">Dilemma initial (Le Chaos)</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                  "{usecases[activeUsecase].problem}"
                </p>
              </div>

              <div className="h-px bg-zinc-100 dark:bg-zinc-850"></div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500 block">La réponse Velatra (La Sérénité)</span>
                <p className="text-xs text-zinc-900 dark:text-zinc-200">
                  {usecases[activeUsecase].solution}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block">Fonctionnalités intégrées clés</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {usecases[activeUsecase].features.map((feat, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-zinc-650 dark:text-zinc-350">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Conversion Section */}
        <div className="bg-zinc-950 text-white p-8 md:p-12 rounded-[40px] border border-zinc-900 text-center mt-20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[70px] pointer-events-none"></div>

          <div className="max-w-xl mx-auto space-y-6 relative z-10">
            <Sparkles className="w-8 h-8 text-emerald-400 mx-auto" />
            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight leading-snug">
              Profitez d'un audit de migration gratuit
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
              Vous venez d'un autre logiciel ou d'un grand tableau Excel ? Notre support prioritaire importe gratuitement toutes vos fiches sportifs en moins d’une heure.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="/register"
                className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors shadow-lg"
              >
                Commencer gratuitement
              </a>
              <a
                href="/contact"
                className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-bold py-3 px-6 rounded-xl text-xs transition-colors"
              >
                Parler à un expert
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export { SolutionsPage };
