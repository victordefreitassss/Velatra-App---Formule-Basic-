import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Sparkles } from 'lucide-react';

export default function SolutionsPage() {
  const [activeUsecase, setActiveUsecase] = useState<number>(0);

  const usecases = [
    {
      title: "Coachs indépendants & personal trainers",
      desc: "Réunissez le suivi des adhérents, les programmes et l’organisation de vos séances dans un espace coach.",
      problem: "Les informations client, les programmes et les échanges peuvent se retrouver dans plusieurs outils.",
      solution: "Velatra rassemble les profils d’adhérents, les programmes partagés et les outils de suivi dans le même espace.",
      metrics: "Profils adhérents • Programmes • Suivi",
      features: [
        "Profils et fiches adhérents",
        "Programmes et séances sportives",
        "Espace adhérent dédié",
        "Suivi des séances et progrès"
      ],
      tag: "Indépendants"
    },
    {
      title: "Studios de coaching",
      desc: "Organisez les adhérents, les rendez-vous et les programmes d’un studio dans une plateforme commune.",
      problem: "Quand plusieurs personnes participent à l’activité, le planning et le suivi doivent rester faciles à retrouver.",
      solution: "Velatra donne accès aux outils de coaching et de gestion prévus dans votre espace, selon les rôles configurés.",
      metrics: "Planning • Adhérents • Équipe",
      features: [
        "Planning des rendez-vous et séances",
        "Profils coachs et adhérents",
        "Programmes sportifs partagés",
        "Messagerie intégrée"
      ],
      tag: "Boutique Studios"
    },
    {
      title: "Boxes et salles d’entraînement",
      desc: "Préparez les entraînements et suivez les séances ainsi que les performances consignées par vos adhérents.",
      problem: "Les séances et les données de progression sont plus utiles lorsqu’elles restent rattachées au suivi de l’adhérent.",
      solution: "Les outils de programmation et de suivi Velatra permettent de partager les séances et de retrouver l’activité dans l’espace coach.",
      metrics: "Séances • Historique • Performances",
      features: [
        "Création de séances et programmes",
        "Historique d’entraînement",
        "Suivi des performances",
        "Espace adhérent"
      ],
      tag: "CrossFit Clubs"
    },
    {
      title: "Clubs et équipes de coaching",
      desc: "Rassemblez les adhérents, les prospects, les coachs et les informations de gestion de votre structure.",
      problem: "La coordination d’une équipe implique de savoir qui accompagne chaque adhérent et où retrouver les informations utiles.",
      solution: "Velatra regroupe les outils de gestion des adhérents, des prospects, des rôles coachs et des finances disponibles dans l’application.",
      metrics: "Adhérents • Prospects • Gestion d’équipe",
      features: [
        "Organisation des profils coachs",
        "Suivi des prospects",
        "Suivi financier et paiements",
        "Programmes et suivi adhérent"
      ],
      tag: "Grands Complexes"
    }
  ];

  return (
    <>
    <Helmet>
      <title>Solutions Velatra — Pour coachs indépendants et studios</title>
      <meta name="description" content="Découvrez comment Velatra accompagne les coachs indépendants, personal trainers et studios dans la gestion de leurs adhérents et programmes." />
      <link rel="canonical" href={`${window.location.origin}/solutions`} />
    </Helmet>
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
            Une plateforme pensée pour les métiers du coaching
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Les outils Velatra accompagnent les coachs indépendants, personal trainers, studios et équipes qui veulent mieux organiser leurs adhérents et leurs programmes.
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
              {usecase.tag}
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
              {usecases[activeUsecase].metrics}
            </div>
          </div>

          {/* Right Exhaustive Breakdown */}
          <div className="md:col-span-7 space-y-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-850/60 pt-6 md:pt-0 md:pl-8">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block">Situation courante</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                  {usecases[activeUsecase].problem}
                </p>
              </div>

              <div className="h-px bg-zinc-100 dark:bg-zinc-850"></div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500 block">Ce que Velatra réunit</span>
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
              Découvrez Velatra selon votre façon de coacher
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
              Présentez-nous votre activité et vos besoins. Nous pourrons vous expliquer les outils disponibles et répondre à vos questions.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="/register"
                className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors shadow-lg"
              >
                Créer un compte
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

export { SolutionsPage };
