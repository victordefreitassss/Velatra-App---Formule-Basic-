import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hero } from '../components/Hero';
import { TrustedBy } from '../components/TrustedBy';
import { 
  Dumbbell, TrendingUp, Users, Calendar, Calculator, ShieldCheck, 
  MessageSquare, Star, ArrowRight, HelpCircle, Mail,
  Check, ChevronDown, RefreshCw, BarChart4, Compass, Award, FileText
} from 'lucide-react';

// STATS SECTION
const StatsSection = () => {
  const stats = [
    { value: '+15h', label: 'Gagnées par semaine', desc: 'Grâce aux automatisations et au planning en un clic' },
    { value: '-45%', label: 'Coûts administratifs', desc: 'Remplacement de 5 outils différents par une solution d’élite' },
    { value: 'x2.4', label: 'Taux de rétention', desc: 'Des clients plus impliqués grâce au suivi de performance autonome' },
    { value: '98%', label: 'Des coachs satisfaits', desc: 'Recommandent Velatra pour la gestion de leur activité pro' }
  ];

  return (
    <section className="py-20 relative bg-zinc-50/50 dark:bg-zinc-900/20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/55 dark:border-zinc-800/50 shadow-md group hover:border-emerald-500/20 transition-all hover:shadow-lg"
            >
              <div className="text-3xl md:text-4xl font-display font-black text-emerald-500 dark:text-emerald-450 mb-2">
                {stat.value}
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">{stat.label}</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// BEFORE / AFTER SLIDER SECTION
const BeforeAfterSection = () => {
  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-black text-zinc-950 dark:text-white tracking-tight">
            Dites adieu au chaos administratif
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto text-sm md:text-base">
            Arrêtez de jongler entre Excel, WhatsApp, Google Drive, et papier. Unifiez toute votre activité.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Avant */}
          <div className="p-8 md:p-10 bg-red-500/5 dark:bg-red-500/5 border border-red-200/40 dark:border-red-950/40 rounded-3xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="px-3 py-1 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold text-[10px] tracking-wider uppercase rounded-full">
                Avant VELATRA (Le Chaos)
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Le quotidien fatiguant</h3>
              <ul className="space-y-3 text-xs text-zinc-500 dark:text-zinc-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">✕</span>
                  <span>WhatsApp inondé de captures d’écran d’entraînements à toute heure</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">✕</span>
                  <span>Feuilles d’émargement papier égarées, retards de paiement récurrents</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">✕</span>
                  <span>Clients qui perdent leur plan de nutrition ou leurs fiches séances</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">✕</span>
                  <span>Facturation manuelle fastidieuse en fin de mois (perte de temps)</span>
                </li>
              </ul>
            </div>
            <div className="text-[11px] text-zinc-400 italic">
              Résultat : 10 à 15 heures de perdues par semaine sur du secrétariat répétitif.
            </div>
          </div>

          {/* Après */}
          <div className="p-8 md:p-10 bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-950/50 rounded-3xl space-y-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
            <div className="space-y-4 relative z-10">
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] tracking-wider uppercase rounded-full">
                Après VELATRA (La Sérénité)
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">La maîtrise absolue</h3>
              <ul className="space-y-3 text-xs text-zinc-500 dark:text-zinc-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span>Espace client autonome avec planning, logs d'entraînement et bilans</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span>Suivi de nutrition et courbes d'évolution synchronisées en direct</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span>CRM professionnel d'acquisition avec formulaires de capture d’leads</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span>Paiements automatisés par Stripe (zéro chèque sans provision)</span>
                </li>
              </ul>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Résultat : Une image de marque d’élite et 100% de temps dédié à vos athlètes.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// INTERACTIVE SAVINGS / ROI CALCULATOR
const ROICalculator = () => {
  const [clients, setClients] = useState(30);
  const [pricePerMonth, setPricePerMonth] = useState(80);

  // Estimating savings
  const hoursSavedPerWeek = Math.round((clients * 0.4) + 3);
  const monthlyRevenue = clients * pricePerMonth;
  const standardSoftwareCostSavings = Math.round(clients * 1.5); // alternative pricing structure savings

  return (
    <section className="py-24 bg-zinc-950 text-white rounded-[40px] mx-4 md:mx-8 px-6 md:px-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-black uppercase text-emerald-400 tracking-widest bg-emerald-500/15 px-3 py-1 rounded-full">
              Simulateur de Gain
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight leading-none text-white">
              Combien allez-vous économiser ?
            </h2>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              Glissez les curseurs ci-dessous pour estimer le temps libéré et les gains générés grâce aux automatisations premium de Velatra.
            </p>

            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold font-mono text-zinc-300">
                  <span>NOMBRE D'ATHLÈTES ACTIFS</span>
                  <span className="text-emerald-400">{clients} clients</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={clients}
                  onChange={(e) => setClients(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold font-mono text-zinc-300">
                  <span>ABONNEMENT MOYEN PAR ATHLÈTE / MOIS</span>
                  <span className="text-emerald-400">{pricePerMonth} €</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="350"
                  step="10"
                  value={pricePerMonth}
                  onChange={(e) => setPricePerMonth(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="p-8 md:p-10 bg-zinc-900 border border-zinc-800 rounded-3xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none"></div>
              
              <div className="space-y-8 relative z-10">
                <div className="border-b border-zinc-800 pb-6 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider block font-bold">Chiffre d’Affaires</span>
                    <strong className="text-xl md:text-2xl font-bold font-display text-zinc-100">{monthlyRevenue.toLocaleString()} € / mois</strong>
                  </div>
                  <Calculator className="w-8 h-8 text-emerald-500/80" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block">TEMPS GAGNÉ</span>
                    <strong className="text-3xl font-display font-black text-emerald-400 block mt-1">~{hoursSavedPerWeek}h</strong>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">par semaine</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block">ÉCONOMIE LOGICIEL</span>
                    <strong className="text-3xl font-display font-black text-emerald-400 block mt-1">~{standardSoftwareCostSavings} €</strong>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">d’outils résiliés</span>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                  <span className="text-xs text-emerald-400 font-bold block mb-1">Analyse Velatra</span>
                  <p className="text-xs text-zinc-350 leading-relaxed">
                    En libérant {hoursSavedPerWeek} heures par semaine, vous pouvez accueillir jusqu'à <strong>{Math.round(clients * 0.2)} nouveaux athlètes</strong> (soit +{(Math.round(clients * 0.2) * pricePerMonth).toLocaleString()} € de revenus additionnels mensuels).
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

// CORE ADVANCED FEATURES GRID
const CoreFeatures = () => {
  const list = [
    {
      icon: Dumbbell,
      title: "Générateur de Séance Intelligent",
      desc: "Concevez et modifiez des entraînements instantanément. Vos adhérents reçoivent leur séance illustrée en vidéo directement sur leur appli mobile."
    },
    {
      icon: Users,
      title: "CRM Sportif & Fiches Prospects",
      desc: "Centralisez vos échanges, configurez des processus d’inscription et relancez automatiquement les nouveaux prospects pour planifier des essais."
    },
    {
      icon: Calculator,
      title: "Suivi Compta & Devis Faciles",
      desc: "Exportez les factures, suivez vos statistiques financières réelles, et gérez les relances de paiements automatiques en partenariat avec Stripe."
    },
    {
      icon: TrendingUp,
      title: "Nutrition & Analyse Corporelle",
      desc: "Intégrez des plans alimentaires complets de saison, et dessinez les courbes de poids, masse grasse et de rep-max de vos athlètes."
    },
    {
      icon: Calendar,
      title: "Planning Interactif Réactif",
      desc: "Limitez le nombre d’équipements et d’athlètes par créneau pour les coachings collectifs ou les séances individuelles personnalisées."
    },
    {
      icon: MessageSquare,
      title: "Chat Privé & Notifications Push",
      desc: "Envoyez des messages directs en toute confidentialité, sans dévoiler votre numéro personnel. Alertes instantanées de séances ou de rappels."
    }
  ];

  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-black uppercase text-emerald-500 tracking-widest block">Fonctionnalités Clés</span>
          <h2 className="text-3xl md:text-4xl font-display font-black text-zinc-950 dark:text-white tracking-tight">
            Tout ce qu'un studio de fitness de haut niveau exige
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto text-sm md:text-base">
            Aucun compromis. Velatra réunit le meilleur d’un CRM client, d’un planificateur d'activités physiques et d’un tracker d’objectifs sportifs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {list.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.5 }}
                className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl flex flex-col justify-between hover:scale-[1.01] transition-all hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{item.title}</h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// PRICING CARDS
const PricingSection = () => {
  const [isAnnuel, setIsAnnuel] = useState(true);

  const plans = [
    {
      name: "Starter Coach",
      price: isAnnuel ? 39 : 49,
      desc: "Idéal pour les coachs indépendants lançant leur activité avec sérénité.",
      features: [
        "Jusqu'à 15 athlètes actifs",
        "Générateur de programmes illimité",
        "Suivi compta & encaissements manuels",
        "Messagerie privée cryptée",
        "Espace client premium inclus",
        "Support technique par email"
      ],
      popular: false,
      cta: "/register"
    },
    {
      name: "Club & Studio Power",
      price: isAnnuel ? 79 : 99,
      desc: "La formule absolue pour les gérants de salle et les coachs de haut niveau.",
      features: [
        "Nombre d'athlètes illimité",
        "Intégration Stripe (Paiements web)",
        "Processus d'onboarding autonome",
        "Suivi de nutrition & rep-max avancé",
        "Multi-coachs & droits collaboratifs",
        "Support prioritaire Whatsapp 7j/7"
      ],
      popular: true,
      cta: "/register"
    }
  ];

  return (
    <section className="py-24 bg-zinc-50/50 dark:bg-zinc-900/20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-black uppercase text-emerald-500 tracking-widest block">Tarifs Transparents</span>
          <h2 className="text-3xl md:text-4xl font-display font-black text-zinc-950 dark:text-white tracking-tight">
            Un abonnement juste, sans mauvaise surprise
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto text-sm">
            Basculez entre le forfait mensuel ou annuel pour économiser jusqu'à <strong>20% sur votre budget</strong>.
          </p>

          {/* Toggle Button */}
          <div className="inline-flex items-center gap-1.5 p-1 bg-white dark:bg-zinc-905 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-inner mt-4">
            <button
              onClick={() => setIsAnnuel(true)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${isAnnuel ? 'bg-emerald-500 text-white shadow-md' : 'text-zinc-500 dark:text-zinc-400'}`}
            >
              Facturation Annuelle (-20%)
            </button>
            <button
              onClick={() => setIsAnnuel(false)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${!isAnnuel ? 'bg-emerald-500 text-white shadow-md' : 'text-zinc-500 dark:text-zinc-400'}`}
            >
              Mensuel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto items-stretch">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`p-8 md:p-10 rounded-3xl border flex flex-col justify-between relative transition-all bg-white dark:bg-zinc-905 ${plan.popular ? 'border-emerald-500 shadow-xl ring-2 ring-emerald-500/10' : 'border-zinc-200 dark:border-zinc-850 shadow-md'}`}
            >
              {plan.popular && (
                <span className="absolute top-0 right-8 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                  Le plus populaire
                </span>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-white font-display tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-display font-black text-zinc-950 dark:text-white">{plan.price} €</span>
                  <span className="text-xs text-zinc-400">/ mois</span>
                </div>

                <div className="h-px bg-zinc-200 dark:bg-zinc-800"></div>

                <ul className="space-y-3.5 text-xs">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-350">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <a
                  href={plan.cta}
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, "", plan.cta);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className={`w-full py-3 px-4 font-bold rounded-xl text-center text-xs transition-all flex items-center justify-center gap-2 ${plan.popular ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-lg shadow-emerald-500/15' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-800 dark:text-white'}`}
                >
                  Démarrer l'essai gratuit <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ACCORDION FAQ
const FAQSection = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const questions = [
    {
      q: "Est-ce que je peux essayer l’application gratuitement ?",
      a: "Oui, la création d'un compte est gratuite. Vous bénéficiez d'un essai de 14 jours complet et sans engagement avec toutes les fonctionnalités avancées actives."
    },
    {
      q: "Dois-je installer une application sur mon téléphone ?",
      a: "Non. Velatra est une plateforme d'élite conçue sur le protocole PWA (Progressive Web App). Elle s'installe en un clic sur le bureau de votre iPhone ou Android pour être accessible hors-ligne de manière ultra-fluide."
    },
    {
      q: "Mes données d'athlètes et de facturation sont-elles sécurisées ?",
      a: "Absolument. Nos bases de données sont hébergées sur l'infrastructure Google Firebase hautement sécurisée, avec des chiffrements de pointe. De plus, toutes les transactions passent par le protocole Stripe, leader mondial du marché."
    },
    {
      q: "Je viens d'un autre logiciel, comment importer mes données ?",
      a: "L'importation de vos adhérents est ultra simple ! Vous pouvez nous envoyer un simple fichier CSV ou Excel et notre support prioritaire configure vos comptes de coaching en moins d'une heure."
    }
  ];

  return (
    <section className="py-24 max-w-3xl mx-auto px-6">
      <div className="text-center space-y-3 mb-16">
        <HelpCircle className="w-8 h-8 text-emerald-500 mx-auto" />
        <h2 className="text-2xl md:text-3xl font-display font-black text-zinc-950 dark:text-white tracking-tight">
          Questions Fréquentes
        </h2>
        <p className="text-zinc-500 text-xs md:text-sm">
          Pour toute autre demande spécifique, contactez directement notre assistance réactive.
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((item, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300"
          >
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full px-6 py-5 flex items-center justify-between text-left border-none focus:outline-none bg-transparent"
            >
              <span className="text-sm font-bold text-zinc-900 dark:text-white pr-4">{item.q}</span>
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${openIdx === idx ? 'rotate-180 text-emerald-500' : ''}`} />
            </button>
            
            <AnimatePresence>
              {openIdx === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden border-t border-zinc-100 dark:border-zinc-850"
                >
                  <p className="px-6 py-4 text-xs md:text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed bg-zinc-50/50 dark:bg-zinc-90 w-full">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
};

// NEWSLETTER / CONTACT SECTION
const ContactSection = () => {
  const [mail, setMail] = useState('');
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
    setMail('');
    setMsg('');
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <section className="py-24 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-t border-zinc-200/50 dark:border-zinc-850">
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-wider">
            PRENEZ LE CONTRÔLE
          </span>
          <h2 className="text-3xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-none">
            Prêt à transformer votre entreprise de coaching ?
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
            Pour toute demande d’informations, de projets sur-mesure ou de partenariats commerciaux, notre équipe commerciale est à votre disposition constante.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 rounded-3xl shadow-xl relative">
          <h3 className="text-lg font-bold text-zinc-950 dark:text-white mb-4">Contactez-nous</h3>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="Votre email professionnel"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              className="w-full px-4 py-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-white"
            />
            <textarea
              required
              rows={3}
              placeholder="Votre message..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full px-4 py-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-white"
            />
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              Envoyer la demande <Mail className="w-4 h-4" />
            </button>
          </form>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-3xl flex flex-col items-center justify-center p-6 text-center"
              >
                <span className="text-3xl">✉️</span>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-2">Message envoyé !</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Notre équipe vous répondra sous quelques heures.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

// COMPARISON TABLE SECTION (NEW)
const ComparisonSection = () => {
  const criteria = [
    { title: "Centralisation tout-en-un", excel: "Non (5+ outils)", legacy: "Partiel (systèmes lourds)", velatra: true },
    { title: "Application PWA Rapide & Autonome", excel: "Non", legacy: "Souvent obsolète / complexe", velatra: true },
    { title: "Suivi nutritionnel & calorique", excel: "Via PDF figés", legacy: "Non ou en option payante", velatra: true },
    { title: "Intégration Stripe & Encaissements", excel: "Manuel (relances pénibles)", legacy: "Commissions élevées (3-5%)", velatra: true },
    { title: "Calculateur de rep-max & logs", excel: "Feuille de calcul instable", legacy: "Non disponible", velatra: true },
    { title: "Frais de transaction Velatra", excel: "N/A", legacy: "Frais fixes par membre", velatra: "0% (hors frais Stripe standard)" },
    { title: "Support technique français 7j/7", excel: "Aucun", legacy: "Email uniquement (48h-72h)", velatra: "WhatsApp prioritaire < 2h" },
  ];

  return (
    <section className="py-24 bg-zinc-50/40 dark:bg-zinc-950/40 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-black uppercase text-emerald-500 tracking-widest block font-bold">Comparatif Elite</span>
          <h2 className="text-3xl md:text-4xl font-display font-black text-zinc-950 dark:text-white tracking-tight">
            Pourquoi abandonner vos anciens outils ?
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto text-sm md:text-base">
            Découvrez comment Velatra se positionne devant les méthodes d’ancienne génération pour propulser votre studio de fitness.
          </p>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-[32px] shadow-xl">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800/60">
                <th className="p-6 text-sm font-black text-zinc-950 dark:text-white uppercase tracking-wider">Fonctionnalités clés</th>
                <th className="p-6 text-xs text-zinc-500 uppercase font-bold text-center">Papier / Excel / WhatsApp</th>
                <th className="p-6 text-xs text-zinc-500 uppercase font-bold text-center">Anciens logiciels US</th>
                <th className="p-6 text-xs text-emerald-500 uppercase font-black text-center bg-emerald-500/5">Velatra Elite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {criteria.map((item, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td className="p-6 text-xs md:text-sm font-bold text-zinc-900 dark:text-white">{item.title}</td>
                  <td className="p-6 text-xs text-zinc-450 dark:text-zinc-500 text-center">{item.excel}</td>
                  <td className="p-6 text-xs text-zinc-450 dark:text-zinc-500 text-center">{item.legacy}</td>
                  <td className="p-6 text-xs text-center font-bold text-emerald-500 bg-emerald-500/5">
                    {item.velatra === true ? (
                      <span className="inline-flex items-center gap-1.5 justify-center text-emerald-500 font-bold mx-auto">
                        <Check className="w-4 h-4 stroke-[3]" /> Oui (Premium)
                      </span>
                    ) : item.velatra}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

// SUCCESS STORIES / TESTIMONIALS SECTION (NEW)
const SuccessStoriesSection = () => {
  const stories = [
    {
      quote: "Velatra a littéralement sauvé ma comptabilité et mon sommeil. Mes 45 athlètes paient maintenant via Stripe récurrent sans que j'aie à leur envoyer un seul message gênant.",
      name: "Alexandre Gauthier",
      role: "Fondateur de Cross-Athletics Studio",
      metrics: "+35% de C.A.",
      tag: "Studio CrossFit"
    },
    {
      quote: "Les élèves adorent enregistrer directement leurs fiches de musculation et rep-max sur l'application. La rétention s'est envolée : mes athlètes restent engagés 2 fois plus longtemps.",
      name: "Élodie Martinez",
      role: "Coach Athlétique et de Force Elite",
      metrics: "x2 Rétention",
      tag: "Personal Coaching"
    },
    {
      quote: "L'intelligence du générateur de séance de Velatra me fait gagner facilement 15 heures par semaine. Les templates se clonent en un clic, j'ai l'esprit libre pour coacher physiquement.",
      name: "Thomas Dubois",
      role: "Directeur de Fighter-Club Association",
      metrics: "12h gagnées / sem",
      tag: "Arts Martiaux"
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center space-y-4 mb-20">
          <span className="text-xs font-black uppercase text-emerald-500 tracking-widest block font-bold">Témoignages réels</span>
          <h2 className="text-3xl md:text-4xl font-display font-black text-zinc-950 dark:text-white tracking-tight">
            Ils propulsent leur activité avec Velatra
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto text-sm md:text-base">
            Qu'ils soient indépendants ou à la tête de grands complexes, nos membres partagent leur succès.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stories.map((story, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl shadow-md relative flex flex-col justify-between hover:scale-[1.01] transition-transform"
            >
              <div className="space-y-6">
                <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-bold tracking-wider rounded-full">
                  {story.tag}
                </span>
                <p className="text-xs md:text-sm text-zinc-650 dark:text-zinc-350 italic leading-relaxed">
                  "{story.quote}"
                </p>
              </div>

              <div className="mt-8 border-t border-zinc-100 dark:border-zinc-800/60 pt-6 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-zinc-950 dark:text-white">{story.name}</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{story.role}</p>
                </div>
                <div className="bg-emerald-500/5 text-emerald-500 text-xs font-black px-2.5 py-1.5 rounded-lg border border-emerald-500/10 font-mono">
                  {story.metrics}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function HomePage() {
  return (
    <div className="space-y-4 pb-12">
      <Hero />
      <TrustedBy />
      <StatsSection />
      <BeforeAfterSection />
      <ComparisonSection />
      <ROICalculator />
      <CoreFeatures />
      <SuccessStoriesSection />
      <PricingSection />
      <FAQSection />
      <ContactSection />
    </div>
  );
}
export { HomePage };
