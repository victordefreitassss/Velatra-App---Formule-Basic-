import React, { useState } from 'react';
import { Search, HelpCircle, BookOpen, Shield, Settings, Play } from 'lucide-react';

export default function HelpCenterPage() {
  const [query, setQuery] = useState('');
  const sections = [
    {
      title: "Premiers Pas",
      icon: Play,
      desc: "Découvrez comment configurer votre profil de club, importer vos athlètes et publier votre premier programme d'entraînement en moins de 10 minutes."
    },
    {
      title: "Gestion des Comptes",
      icon: BookOpen,
      desc: "Invitez des collaborateurs, changez les perspectives d'utilisation pour simuler l'affichage d'un athlète et gérez vos accès privilégiés."
    },
    {
      title: "Configuration Stripe",
      icon: Shield,
      desc: "Connectez votre compte Stripe pro, automatisez le recouvrement des factures d'abonnements et gérez les alertes d'impayés."
    },
    {
      title: "Planning & Réservations",
      icon: Settings,
      desc: "Paramétrez des créneaux de coaching collectifs récurrents, et apprenez à bloquer ou prioriser des adhérents spécifiques."
    }
  ];

  const commonQuestions = [
    { q: "Comment ajouter un nouvel athlète ?", a: "Allez sur l'onglet 'Membres', cliquez sur 'Ajouter un athlète' et entrez son email. Il recevra une invitation autonome d'inscription." },
    { q: "Comment suspendre un abonnement en cours ?", a: "Depuis la fiche client de l'athlète concerné, rendez-vous dans la section Facturation et cliquez sur 'Suspendre l'abonnement Stripe'." }
  ];

  return (
    <div className="pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-black uppercase text-emerald-500 tracking-widest block font-bold">CENTRE D'AIDE</span>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-none">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 max-w-xl mx-auto text-sm">
            Trouvez des réponses instantanées dans notre documentation technique complète ou contactez notre support prioritaire Whatsapp.
          </p>
          
          <div className="max-w-md mx-auto relative mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un tutoriel (ex: Stripe, planning)..."
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div
                key={idx}
                className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl w-fit">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white tracking-tight">{section.title}</h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">{section.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-20 border-t border-zinc-200/50 dark:border-zinc-850 pt-16">
          <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-8 text-center">Questions fréquentes d'utilisation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {commonQuestions.map((q, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-500" /> {q.q}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pl-6">{q.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
export { HelpCenterPage };
