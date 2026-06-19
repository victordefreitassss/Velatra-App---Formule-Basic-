import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dumbbell, Zap, Calendar, Users, BarChart4, MessageSquare, 
  CheckCircle, Shield, Award, Sparkles, Smartphone, CreditCard, ChevronRight, PlayCircle
} from 'lucide-react';

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState<'coach' | 'athlete' | 'business'>('coach');

  const tabs = [
    { id: 'coach', label: 'Espace Coach & Studio', desc: 'Pilotez l’entraînement de vos membres d’élite', icon: Dumbbell },
    { id: 'athlete', label: 'Application Mobile Athlète', desc: 'Une expérience d’entraînement autonome', icon: Smartphone },
    { id: 'business', label: 'Finances & CRM Backoffice', desc: 'Gérez la croissance et la conformité Stripe', icon: BarChart4 }
  ];

  const subfeatures = {
    coach: [
      {
        title: "Générateur de Séance Tactique",
        desc: "Concevez vos séances en quelques secondes grâce à notre bibliothèque d'exercices vidéos ou importez vos propres tutoriels. Enregistrez des blocs d'entraînement réutilisables (Amrap, Emom, Force) et clonez-les en un clic.",
        metrics: "Calculateur de 1RM intégré • Vidéos de démo HD"
      },
      {
        title: "Tableau de Bord & Échauffements",
        desc: "Visualisez d'un coup d'œil l'activité de vos sportifs de la semaine. Détectez instantanément les adhérents qui n'ont pas consigné leurs séances et envoyez un rappel d'attention.",
        metrics: "Taux de complétion visible • Alertes inactivité"
      },
      {
        title: "Planification Connectée",
        desc: "Définissez des créneaux de coaching en petit groupe ou en libre accès. Configurez des verrous de capacité de matériel, gérez les absences et laissez vos athlètes réserver eux-mêmes.",
        metrics: "Synchronisation Google Calendar • File d'attente"
      },
      {
        title: "Galerie d’Évolution Corporelle",
        desc: "Suivez les mensurations (poids, masse grasse, graisse viscérale) et stockez les clichés d'évolution physique de manière ordonnée et strictement confidentielle par élève.",
        metrics: "Graphiques d'évolution • Stockage hautement chiffré"
      }
    ],
    athlete: [
      {
        title: "Journal d'Entraînement Autonome",
        desc: "Les athlètes ouvrent leur application sur le plateau de musculation pour consigner leurs séries, charges, et temps de repos en direct. L'application calcule les charges théoriques adaptées.",
        metrics: "Interface ultra-rapide axée toucher • Mode hors-ligne"
      },
      {
        title: "Suivi de Nutrition & Plan Énergétique",
        desc: "Configurez des plans caloriques et cibles de macros personnalisés (Protéines, Glucides, Lipides). L'élève complète ses repas quotidiens et surveille sa balance énergétique en temps réel.",
        metrics: "Répartition automatisée des macros • Alertes hydratation"
      },
      {
        title: "Messagerie Fluide Sécurisée",
        desc: "Conservez une relation privilégiée avec vos athlètes. Lancez des fils de discussion directs ou des publications générales pour votre club, sans dévoiler vos numéros personnels.",
        metrics: "Salons d'annonce • Partage de fichiers PDF"
      },
      {
        title: "Tableau des Trophées & Dépassement",
        desc: "Valorisez l'effort physique en récompensant la régularité et les nouveaux records personnels (RP) sur les exercices de référence (Squat, Deadlift, Clean & Jerk).",
        metrics: "Niveaux de force • Badges de régularité"
      }
    ],
    business: [
      {
        title: "Intégration Stripe & Paiements",
        desc: "Finies les relances embarrassantes pour les impayés. Configurez des forfaits d'abonnement mensuels récurrents ou des forfaits de crédits de séances avec prélèvements sécurisés.",
        metrics: "Zéro frais Velatra • Factures PDF auto-générées"
      },
      {
        title: "CRM d'Acquisition & Tunnels",
        desc: "Un entonnoir d'onboarding complet. Créez des formulaires d'évaluation athlétique élégants à intégrer sur vos réseaux sociaux pour collecter les coordonnées de nouveaux prospects chauds.",
        metrics: "Relance commerciale assistée • Statuts en temps réel"
      },
      {
        title: "Analyse des Revenus & Marges",
        desc: "Suivez l'état réel de votre trésorerie, vos bénéfices, vos marges de dépenses et recevez des prédictions financières intelligentes de fin de mois basées sur vos abonnements actifs.",
        metrics: "Dashboards financiers • Export comptable CSV"
      },
      {
        title: "Droits Multi-Coachs Collaboratifs",
        desc: "Pour les gérants de salle : invitez d'autres entraîneurs sur votre espace, assignez-leur des membres spécifiques, et paramétrez leurs restrictions d'accès financières en direct.",
        metrics: "Permissions sécurisées • Journal d'actions admin"
      }
    ]
  };

  return (
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
            Remplacer 5 logiciels par <span className="text-emerald-500 font-extrabold">Velatra</span>
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Un écosystème d’élite unifié et ultra-rapide. Plus besoin de jongler entre WhatsApp pour échanger, Excel pour planifier, Stripe pour facturer et Drive pour stocker.
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
              Rejoignez les coachs qui gagnent 15h par semaine
            </h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Inscrivez-vous en 1 minute. Sans engagement. Testez l’écosystème gratuitement pendant 14 jours.
            </p>
            <div className="pt-4 flex justify-center gap-4">
              <a
                href="/register"
                className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                Démarrer l'essai gratuit <ChevronRight className="w-4 h-4" />
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

export { FeaturesPage };
