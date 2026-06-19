import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, ArrowRight, ShieldCheck, HelpCircle, ChevronDown, 
  Sparkles, Star, Lock, Heart, FileText, Landmark
} from 'lucide-react';

export default function PricingPage() {
  const [isAnnuel, setIsAnnuel] = useState(true);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  const plans = [
    {
      name: "Starter Coach",
      price: isAnnuel ? 39 : 49,
      desc: "L'option idéale pour se lancer sereinement ou gérer un volume maîtrisé de séances.",
      features: [
        "Jusqu'à 15 athlètes actifs",
        "Générateur d'entraînements illimité",
        "Modèles de séances clonables",
        "Suivi de poids & rep-max basique",
        "Messagerie privée avec pièces jointes",
        "Espace client mobile autonome",
        "Support technique par e-mail sous 24h"
      ],
      popular: false,
      cta: "/register",
      badge: "Démarrage Facile"
    },
    {
      name: "Club & Studio Power",
      price: isAnnuel ? 79 : 99,
      desc: "La formule absolue pour les studios d'entraînement de haut niveau et les coachs établis.",
      features: [
        "Athlètes actifs illimités",
        "Intégration Stripe ultra-rapide (Paiements)",
        "Suivi nutritionnel & calorique complet",
        "Processus d'onboarding autonome",
        "Gestion multi-coachs collaboratifs",
        "Export de données comptables d'élite",
        "Support prioritaire WhatsApp 7j/7 (< 2h)"
      ],
      popular: true,
      cta: "/register",
      badge: "Le Choix Elite"
    }
  ];

  const compareMatrix = [
    { cat: "Coaching & Entraînement", items: [
      { name: "Bibliothèque d'exercices vidéos", starter: true, studio: true },
      { name: "Créateur de templates de séances", starter: true, studio: true },
      { name: "Logs d'activité autonome athlète", starter: true, studio: true },
      { name: "Suivi nutritionnel complet (Macros/Calories)", starter: false, studio: true },
      { name: "Saisie d'objectifs sportifs & courbes de force", starter: "Basique", studio: "Illimité & Avancé" }
    ]},
    { cat: "Gestion client & Financement", items: [
      { name: "Nombre d'adhérents actifs autorisés", starter: "15 athlètes max", starterHighlight: true, studio: "Illimité (sans limites)", studioHighlight: true },
      { name: "Formulaires de capture de prospects", starter: "1 formulaire", studio: "Illimités" },
      { name: "Encaissement automatique Stripe récurrent", starter: false, studio: true },
      { name: "Suivi comptable & Invoices PDF", starter: "Manuel uniquement", studio: "Automatique standard" },
      { name: "Frais additionnels sur votre chiffre d'affaires", starter: "0%", studio: "0% ! (uniquement charges de base Stripe)" }
    ]},
    { cat: "Équipe & Infrastructure", items: [
      { name: "Inviter des coachs additionnels", starter: false, studio: "Inclus (droits collaborateurs)" },
      { name: "Espace client sur-mesure (PWA)", starter: true, studio: true },
      { name: "Hébergement Firebase hautement chiffré", starter: true, studio: true },
      { name: "Canal de support réactif", starter: "Email standard", studio: "WhatsApp prioritaire 7j/7" }
    ]}
  ];

  const pricingFaqs = [
    {
      q: "Puis-je changer ou résilier mon abonnement à tout moment ?",
      a: "Oui, tous nos forfaits sont sans engagement à long terme. Vous pouvez passer de la formule mensuelle à la formule annuelle, mettre à niveau ou interrompre votre abonnement directement depuis les paramètres de votre compte en un seul clic."
    },
    {
      q: "Y a-t-il des frais de mise en place cachés ?",
      a: "Absolument aucun. Il n’y a aucun frais d'ouverture, de configuration matérielle ou d'arrêt. Les prix affichés sont clairs et transparents."
    },
    {
      q: "Que se passe-t-il après la fin de la période d'essai de 14 jours ?",
      a: "Pendant vos 14 jours d'essai, vous profitez de l'intégralité des fonctionnalités. Si vous choisissez de continuer, vous renseignerez votre moyen de paiement. Dans le cas contraire, votre compte passera simplement en sommeil, sans aucun prélèvement."
    },
    {
      q: "Comment fonctionne l'intégration Stripe pour les abonnements de mes athlètes ?",
      a: "C'est ultra-simple. Dans votre dashboard, vous connectez votre compte Stripe en 1 minute. Vous créez vos formules payantes (ex: 80€/mois) et vos athlètes peuvent souscrire via un simple lien sécurisé. Les fonds arrivent directement sur votre compte bancaire."
    }
  ];

  return (
    <div className="pt-32 pb-24 relative overflow-hidden bg-transparent">
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/3 -translate-y-12 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-6">
        
        {/* Header Block */}
        <div className="text-center space-y-4 mb-16">
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-wider block w-fit mx-auto">
            TARIFS TRANSPARENTS
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-none">
            Investissez dans une croissance d'élite
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Économisez jusqu'à <strong>20% en optant pour la facturation annuelle</strong>. Tous les forfaits commencent par un essai gratuit de 14 jours de toutes nos fonctionnalités, sans carte bancaire requise.
          </p>

          {/* Selector Toggle */}
          <div className="inline-flex items-center gap-1.5 p-1 bg-zinc-150/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-inner mt-6">
            <button
              onClick={() => setIsAnnuel(true)}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all border-none cursor-pointer ${isAnnuel ? 'bg-emerald-500 text-white shadow-md' : 'text-zinc-500 dark:text-zinc-400'}`}
            >
              Facturation Annuelle (-20% Inclus)
            </button>
            <button
              onClick={() => setIsAnnuel(false)}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all border-none cursor-pointer ${!isAnnuel ? 'bg-emerald-500 text-white shadow-md' : 'text-zinc-500 dark:text-zinc-400'}`}
            >
              Mensuel
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto items-stretch mb-24">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`p-8 md:p-10 rounded-[36px] bg-white dark:bg-zinc-905 border flex flex-col justify-between relative transition-all ${plan.popular ? 'border-emerald-500 shadow-xl ring-4 ring-emerald-500/5' : 'border-zinc-200/60 dark:border-zinc-850 shadow-md'}`}
            >
              {/* Badge */}
              <span className={`absolute top-0 right-10 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md ${plan.popular ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-350 border border-zinc-200/50 dark:border-zinc-700/50'}`}>
                {plan.badge}
              </span>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-950 dark:text-white font-display tracking-tight flex items-center gap-2">
                    {plan.name} {plan.popular && <Sparkles className="w-4 h-4 text-emerald-500" />}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-1.5 pt-2">
                  <span className="text-4xl md:text-5xl font-display font-black text-zinc-950 dark:text-white tracking-tighter">{plan.price} €</span>
                  <span className="text-xs text-zinc-400">/ mois</span>
                </div>

                <div className="h-px bg-zinc-200/60 dark:bg-zinc-800"></div>

                <ul className="space-y-3 text-xs leading-normal">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-zinc-650 dark:text-zinc-350">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
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
                  className={`w-full py-3.5 px-4 font-bold rounded-xl text-center text-xs transition-all flex items-center justify-center gap-2 ${plan.popular ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-lg shadow-emerald-500/15' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-805 dark:text-white'}`}
                >
                  Démarrer mon essai de 14j gratuit <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Feature Checklist Matrix */}
        <div className="py-16 border-t border-zinc-200/50 dark:border-zinc-850">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-black text-zinc-950 dark:text-white tracking-tight">
              Comparatif complet des fonctions
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm">
              Explorez les détails ligne à ligne pour sélectionner la formule la plus adaptée à vos charges de travail.
            </p>
          </div>

          <div className="overflow-x-auto bg-white dark:bg-zinc-905 border border-zinc-200/60 dark:border-zinc-850 rounded-[32px] shadow-lg max-w-4xl mx-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800">
                  <th className="p-5 text-xs text-zinc-500 uppercase tracking-widest font-bold">Fonctionnalités</th>
                  <th className="p-5 text-xs text-zinc-500 uppercase tracking-widest font-bold text-center">Starter Coach</th>
                  <th className="p-5 text-xs text-emerald-500 uppercase tracking-widest font-black text-center bg-emerald-500/5">Club & Studio Power</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {compareMatrix.map((cat, catIdx) => (
                  <React.Fragment key={catIdx}>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-90 w-full">
                      <td colSpan={3} className="p-4 px-5 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                        {cat.cat}
                      </td>
                    </tr>
                    {cat.items.map((item, itemIdx) => (
                      <tr key={itemIdx} className="hover:bg-zinc-50/25 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="p-5 text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.name}</td>
                        <td className="p-5 text-xs text-center text-zinc-500">
                          {typeof item.starter === 'boolean' ? (
                            item.starter ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-zinc-350 dark:text-zinc-650">—</span>
                          ) : (
                            <span className={item.starterHighlight ? "font-bold text-zinc-950 dark:text-white" : ""}>{item.starter}</span>
                          )}
                        </td>
                        <td className="p-5 text-xs text-center font-bold text-emerald-500 bg-emerald-500/5">
                          {typeof item.studio === 'boolean' ? (
                            item.studio ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-zinc-350">—</span>
                          ) : (
                            <span className={item.studioHighlight ? "font-bold text-emerald-500" : ""}>{item.studio}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enterprise & Franchise Dedicated CTA */}
        <div className="bg-gradient-to-tr from-zinc-900 via-zinc-950 to-black text-white p-8 md:p-12 rounded-[40px] border border-zinc-850 flex flex-col md:flex-row justify-between items-center gap-8 max-w-4xl mx-auto my-16">
          <div className="space-y-3 text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-black tracking-widest rounded-full">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" /> Franchise & Multi-Salles
            </div>
            <h3 className="text-xl md:text-2xl font-display font-black text-white tracking-tight">
              Besoin de marque blanche ou d'une intégration complexe ?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Pour les réseaux de salles de sport, franchises de CrossFit ou clubs multisports comptant plus de 500 adhérents actifs. Échanges avec un chargé de compte d'élite, migrations assistées gratuites, et clauses SLA.
            </p>
          </div>
          <a
            href="/contact"
            className="bg-white hover:bg-zinc-100 text-zinc-950 font-bold py-3.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shrink-0 shadow-lg"
          >
            Contacter nos experts
          </a>
        </div>

        {/* Trust Guarantees */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 bg-zinc-50/50 dark:bg-zinc-900/10 p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/40 max-w-4xl mx-auto mb-16 text-center">
          <div>
            <span className="text-xl">🔒</span>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white mt-2">SSL Chiffré 256-bit</h4>
            <p className="text-[10px] text-zinc-450 mt-1">Données bancaires et de performance sécurisées de bout en bout</p>
          </div>
          <div>
            <span className="text-xl">🇪🇺</span>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white mt-2">Hôte RGPD France</h4>
            <p className="text-[10px] text-zinc-450 mt-1">Serveurs Cloud situés en Europe et conformes à toutes les normes de données</p>
          </div>
          <div>
            <span className="text-xl font-bold font-mono">14</span>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white mt-2">Essai Gratuit Complet</h4>
            <p className="text-[10px] text-zinc-450 mt-1">Pas de carte bancaire exigée à la création de votre essai gratuit</p>
          </div>
          <div>
            <span className="text-xl">💳</span>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white mt-2">Sans Engagement</h4>
            <p className="text-[10px] text-zinc-450 mt-1">Améliorez, dégradez ou interrompez votre abonnement en un clic</p>
          </div>
        </div>

        {/* FAQs */}
        <section className="max-w-3xl mx-auto px-6 mt-16">
          <div className="text-center space-y-3 mb-12">
            <HelpCircle className="w-8 h-8 text-emerald-500 mx-auto" />
            <h2 className="text-2xl md:text-3xl font-display font-black text-zinc-950 dark:text-white tracking-tight">
              Des réponses claires à vos questions
            </h2>
            <p className="text-zinc-550 dark:text-zinc-400 text-xs text-center">
              Tout savoir sur la facturation, l'intégration Stripe et votre période d'évaluation gratuite.
            </p>
          </div>

          <div className="space-y-4">
            {pricingFaqs.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={idx} className="bg-white dark:bg-zinc-905 border border-zinc-200/60 dark:border-zinc-850 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
                  <button
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left border-none focus:outline-none bg-transparent"
                  >
                    <span className="text-sm font-bold text-zinc-900 dark:text-white pr-4">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-zinc-100 dark:border-zinc-850"
                      >
                        <p className="px-6 py-4 text-xs md:text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed bg-zinc-50/30 dark:bg-zinc-900/20">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}

export { PricingPage };
