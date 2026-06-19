import React from 'react';

export const MentionsLegales: React.FC = () => {
  return (
    <div className="pt-32 pb-24">
      <div className="max-w-3xl mx-auto px-6 space-y-6 text-zinc-650 dark:text-zinc-350 text-xs md:text-sm leading-relaxed">
        <h1 className="text-3xl font-display font-black text-zinc-950 dark:text-white mb-8 tracking-tight">Mentions Légales</h1>
        <p><strong>Éditeur du site :</strong> Velatra S.A.S, société par actions simplifiée au capital de 10 000 €, dont le siège social est situé à Paris, France. Immatriculée au Registre de Commerce de Paris.</p>
        <p><strong>Directeur de la publication :</strong> Victor De Freitas, en qualité de Fondateur de Velatra.</p>
        <p><strong>Hébergeur :</strong> Google Cloud Platform (Europe-West), Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA.</p>
        <p><strong>Propriété intellectuelle :</strong> Tous les contenus présents sur ce site (dessins, logos, codes sources, icônes, textes) sont la propriété exclusive de Velatra ou de ses partenaires licenciés. Toute copie est strictement interdite.</p>
      </div>
    </div>
  );
};

export const CGV: React.FC = () => {
  return (
    <div className="pt-32 pb-24">
      <div className="max-w-3xl mx-auto px-6 space-y-6 text-zinc-650 dark:text-zinc-350 text-xs md:text-sm leading-relaxed">
        <h1 className="text-3xl font-display font-black text-zinc-950 dark:text-white mb-8 tracking-tight">Conditions Générales de Vente (CGV)</h1>
        <p>Les présentes Conditions Générales de Vente régissent l'accès et l'utilisation de l'ensemble des modules payants de Velatra par les professionnels du fitness en France.</p>
        <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Plan tarifaire & Abonnements</h3>
        <p>Les tarifs sont facturés par prélèvements bancaires sécurisés récurrents (mensuels ou annuels). L’accès débute par un essai d’évaluation de 14 jours gratuits.</p>
        <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Résiliation</h3>
        <p>L’abonnement est libre d’engagement et peut être résilié à tout moment en un clic depuis votre tableau de bord d’administration, sans frais additionnels.</p>
      </div>
    </div>
  );
};

export const Confidentialite: React.FC = () => {
  return (
    <div className="pt-32 pb-24">
      <div className="max-w-3xl mx-auto px-6 space-y-6 text-zinc-650 dark:text-zinc-350 text-xs md:text-sm leading-relaxed">
        <h1 className="text-3xl font-display font-black text-zinc-950 dark:text-white mb-8 tracking-tight">Politique de Confidentialité</h1>
        <p>Chez Velatra, la sécurité et la confidentialité des données personnelles de vos athlètes sont d'une importance capitale.</p>
        <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Collecte des informations</h3>
        <p>Nous ne collectons que les informations indispensables au bon fonctionnement de l'application (emails, prénoms, plannings, informations de séances d'exercices). Aucun traitement de vos données n'est revendu à des tiers.</p>
        <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Infrastructure & Hébergement</h3>
        <p>Vos bases de données de coaching sont stockées sur Google Firebase Firestore et gérées conformément au cadre général de protection des données (RGPD).</p>
      </div>
    </div>
  );
};
