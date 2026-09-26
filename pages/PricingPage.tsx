import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicMeta, FeatureList, ProgrammingService, coachAccess, studioDemo } from '../components/PublicProduct';

const plans = [
  { name: 'Velatra Coach', monthly: '49', annual: '490', description: 'Pour les coachs indépendants, personal trainers et coachs en ligne.', features: ['Un compte coach', 'Gestion des clients et espace adhérent', 'CRM prospects, relances et conversion', 'Programmes, séances et suivi nutritionnel', 'Planning, messagerie et suivi des paiements', 'Assistance IA à la programmation'], href: coachAccess, cta: 'Obtenir mon accès bêta' },
  { name: 'Velatra Studio', monthly: '149', annual: '1 490', description: 'Pour les studios, salles et équipes de coaching.', features: ['Tous les outils de Velatra Coach', 'Plusieurs comptes coachs après activation', 'Attribution des adhérents à leur coach', 'Rôles responsable, coach et adhérent', 'Vue de gestion pour le responsable'], href: studioDemo, cta: 'Demander une démo' },
];
const comparison = [
  ['Programmes, suivi et espace adhérent', 'Inclus', 'Inclus'],
  ['CRM, planning et suivi des paiements', 'Inclus', 'Inclus'],
  ['Assistance IA à la programmation', 'Incluse', 'Incluse'],
  ['Comptes coachs', 'Un compte', 'Plusieurs, après activation'],
  ['Attribution adhérent / coach', 'Votre propre clientèle', 'Attribution par le responsable'],
];
const questions = [
  ['Comment obtenir un accès ?', 'Velatra est en bêta sur invitation. Pour Coach, demandez votre accès. Pour Studio, une démonstration permet de préparer les accès de votre équipe. Les conditions de souscription sont présentées avant tout paiement.'],
  ['Comment fonctionne le paiement annuel ?', 'Velatra Coach coûte 490 € pour un an, au lieu de 588 € sur douze paiements mensuels. Velatra Studio coûte 1 490 € pour un an, au lieu de 1 788 €. Cela correspond à deux mensualités offertes.'],
  ['Faut-il un abonnement supplémentaire pour l’IA ?', 'Non. L’assistance à la programmation fait partie de Velatra. Les propositions doivent être relues et validées par le coach avant d’être utilisées dans le suivi.'],
  ['Comment fonctionnent les paiements de mes clients ?', 'Le suivi financier est disponible dans Velatra. Pour les paiements en ligne, vous devez connecter et configurer votre compte Stripe. Les frais du prestataire de paiement sont distincts de l’abonnement Velatra.'],
  ['Qu’est-ce que la programmation sur mesure ?', 'C’est un service facultatif de préparation de programmes, en complément du logiciel. Le volume et le niveau d’accompagnement sont définis ensemble avant de commencer. Pour les studios, un devis est établi.'],
];

export default function PricingPage() {
  return <div className="vp-page"><PublicMeta path="/tarifs" title="Tarifs Velatra — Coach 49 €/mois · Studio 149 €/mois" description="Velatra Coach à 49 €/mois ou 490 €/an. Velatra Studio à 149 €/mois ou 1 490 €/an. Deux mois offerts avec le paiement annuel." /><header className="vp-hero marketing-container"><span className="marketing-kicker">LES TARIFS VELATRA</span><h1>Une plateforme.<br /><em>Deux façons de coacher.</em></h1><p>Choisissez l’espace adapté à votre activité. Les outils de coaching et l’assistance IA sont au cœur des deux offres.</p></header><div className="marketing-container"><section className="vp-two-col vp-prices" aria-label="Les abonnements Velatra">{plans.map((plan, i) => <article className={`vp-price ${i ? 'vp-price-studio' : ''}`} key={plan.name}><span className="marketing-kicker">{i ? 'POUR VOTRE STRUCTURE' : 'POUR VOTRE ACTIVITÉ'}</span><h2>{plan.name}</h2><p>{plan.description}</p><div className="vp-price-amount"><strong>{plan.monthly} €</strong><span>/ mois</span></div><div className="vp-price-year">ou <strong>{plan.annual} € / an</strong><span>2 mois offerts avec le paiement annuel</span></div><FeatureList items={plan.features} /><Link to={plan.href} className="marketing-button marketing-button-primary">{plan.cta}<ArrowRight size={17} /></Link><p className="vp-note">{i ? 'Accès équipe activés avec Velatra pendant la bêta.' : 'Accès bêta sur invitation.'}</p></article>)}</section><p className="vp-pricing-note">Les paiements en ligne nécessitent une connexion Stripe. Les modalités de souscription et de facturation vous sont précisées avant tout engagement.</p>
      <section className="vp-section"><div className="vp-section-heading"><span className="marketing-kicker">LE CHOIX EN UN COUP D’ŒIL</span><h2>Seul ou en équipe.</h2><p>La différence tient à l’organisation de votre activité.</p></div><div className="vp-comparison" role="table" aria-label="Comparaison Coach et Studio"><div className="vp-comparison-head" role="row"><span role="columnheader">Fonctionnalités</span><span role="columnheader">Coach</span><span role="columnheader">Studio</span></div>{comparison.map(([feature, coach, studio]) => <div role="row" key={feature}><strong role="rowheader">{feature}</strong><span role="cell"><small>Coach</small>{coach}</span><span role="cell"><small>Studio</small>{studio}</span></div>)}</div></section>
      <ProgrammingService /><section className="vp-section vp-faq"><div className="vp-section-heading"><span className="marketing-kicker">AVANT DE VOUS LANCER</span><h2>Les réponses utiles.</h2></div>{questions.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section></div></div>;
}
export { PricingPage };
