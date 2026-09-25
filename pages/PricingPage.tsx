import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, CircleHelp } from 'lucide-react';

const plans = [
  { id: 'starter', name: 'Starter Coach', description: 'Pour le coach indépendant qui veut structurer son quotidien.', monthly: 49, annual: 39, audience: 'Jusqu’à 15 adhérents actifs', features: ['Outils de création de programmes', 'Modèles de séances', 'Suivi sportif des adhérents', 'Messagerie avec pièces jointes', 'Espace adhérent mobile'] },
  { id: 'studio', name: 'Club & Studio', description: 'Pour les coachs et studios qui souhaitent élargir leur organisation.', monthly: 99, annual: 79, audience: 'Pour gérer une activité en équipe', features: ['Les outils de la formule Starter', 'Gestion des adhérents élargie', 'Suivi nutritionnel', 'Fonctions de paiement Stripe', 'Outils multi-coachs'] },
];

const questions = [
  { q: 'Quelle formule choisir ?', a: 'La formule Starter Coach convient aux coachs qui gèrent un nombre défini d’adhérents. La formule Club & Studio réunit davantage d’outils pour les structures et les équipes. Comparez les fonctions affichées ci-dessus selon vos besoins.' },
  { q: 'Les prix changent-ils selon le mode de facturation ?', a: 'Oui. Le sélecteur affiche les montants mensuels indiqués pour une facturation mensuelle ou annuelle.' },
  { q: 'Puis-je connecter Stripe ?', a: 'Velatra propose une connexion Stripe depuis l’espace coach pour gérer les paiements liés à votre activité. La disponibilité dépend de la configuration de votre compte et de Stripe.' },
  { q: 'Comment obtenir une présentation de Velatra ?', a: 'Vous pouvez nous écrire depuis le formulaire de contact pour nous présenter votre activité et demander une démonstration.' },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const [open, setOpen] = useState<number | null>(0);
  const offers = plans.map((plan) => ({ '@type': 'Offer', name: plan.name, price: annual ? plan.annual : plan.monthly, priceCurrency: 'EUR', priceSpecification: { '@type': 'UnitPriceSpecification', price: annual ? plan.annual : plan.monthly, priceCurrency: 'EUR', unitText: annual ? 'MONTH' : 'MONTH' }, url: `${window.location.origin}/tarifs` }));
  const data = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Velatra', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', offers };

  return <>
    <Helmet>
      <title>Tarifs Velatra — Des formules pour les coachs et studios</title>
      <meta name="description" content="Comparez les formules Velatra pour coachs sportifs et studios. Choisissez les outils qui correspondent à votre activité de coaching." />
      <link rel="canonical" href={`${window.location.origin}/tarifs`} />
      <meta property="og:title" content="Tarifs Velatra" /><meta property="og:description" content="Découvrez les formules Velatra pour organiser vos programmes, vos adhérents et votre activité." />
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
    <main className="marketing-pricing">
      <section className="marketing-pricing-hero"><div className="marketing-container"><span className="marketing-kicker">TARIFS VELATRA</span><h1>Choisissez l’espace<br /><em>qui vous ressemble.</em></h1><p>Comparez les fonctionnalités, puis choisissez la formule qui correspond au fonctionnement de votre activité.</p><div className="marketing-pricing-toggle" role="group" aria-label="Période de facturation"><button className={!annual ? 'is-active' : ''} onClick={() => setAnnual(false)}>Mensuel</button><button className={annual ? 'is-active' : ''} onClick={() => setAnnual(true)}>Annuel <span>Tarif annuel</span></button></div></div></section>
      <section className="marketing-container marketing-pricing-cards">{plans.map((plan, index) => <article key={plan.id} className={index === 1 ? 'marketing-price-card is-featured' : 'marketing-price-card'}><div className="marketing-price-top"><div><span className="marketing-price-eyebrow">{index === 0 ? 'POUR DÉMARRER' : 'POUR GRANDIR'}</span><h2>{plan.name}</h2><p>{plan.description}</p></div>{index === 1 && <span className="marketing-price-badge">PLUS DE FONCTIONS</span>}</div><div className="marketing-price-audience">{plan.audience}</div><div className="marketing-price-value"><strong>{annual ? plan.annual : plan.monthly} €</strong><span>/ mois {annual ? 'en facturation annuelle' : 'en facturation mensuelle'}</span></div><div className="marketing-price-divider" /><ul>{plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul><Link to="/register" className={index === 1 ? 'marketing-button marketing-button-primary' : 'marketing-button marketing-price-secondary'}>Créer un compte <ArrowRight size={15} /></Link><span className="marketing-price-footnote">Les conditions de l’offre vous sont présentées avant la souscription.</span></article>)}</section>
      <section className="marketing-pricing-help"><div className="marketing-container"><div><span className="marketing-kicker">BESOIN D’AIDE POUR CHOISIR ?</span><h2>On peut en parler.</h2><p>Expliquez-nous comment vous accompagnez vos clients et ce que vous cherchez à mieux organiser.</p></div><Link to="/contact" className="marketing-button marketing-button-primary">Demander une démonstration <ArrowRight size={15} /></Link></div></section>
      <section className="marketing-pricing-faq"><div className="marketing-container"><div><CircleHelp size={21} /><span className="marketing-kicker">QUESTIONS FRÉQUENTES</span><h2>Un détail à éclaircir ?</h2></div><div>{questions.map((question, index) => <article key={question.q}><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}><span>{question.q}</span><ChevronDown size={16} className={open === index ? 'is-open' : ''} /></button>{open === index && <p>{question.a}</p>}</article>)}</div></div></section>
    </main>
  </>;
}
export { PricingPage };
