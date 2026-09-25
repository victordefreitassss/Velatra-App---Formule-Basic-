import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check,
  ChevronRight, ClipboardList, Dumbbell, FileSpreadsheet, FileText,
  MessageCircle, MoveRight, Users
} from 'lucide-react';
import './homepage.css';

type ProductView = 'overview' | 'clients' | 'programs' | 'planning' | 'prospects';

const productViews: { key: ProductView; label: string; icon: typeof Users; title: string; description: string }[] = [
  { key: 'overview', label: 'Vue d’ensemble', icon: Activity, title: 'Gardez le fil de votre activité.', description: 'Les informations utiles réunies dans un espace coach.' },
  { key: 'clients', label: 'Adhérents', icon: Users, title: 'Chaque adhérent a son espace.', description: 'Objectifs, programmes et suivi restent faciles à retrouver.' },
  { key: 'programs', label: 'Programmes', icon: Dumbbell, title: 'Préparez les séances.', description: 'Créez des programmes et partagez-les avec vos adhérents.' },
  { key: 'planning', label: 'Planning', icon: CalendarDays, title: 'Organisez la semaine.', description: 'Retrouvez les rendez-vous et séances au même endroit.' },
  { key: 'prospects', label: 'Prospects', icon: MessageCircle, title: 'Suivez chaque prise de contact.', description: 'Visualisez les prochaines étapes avant l’inscription.' },
];

const clientSamples = [
  { initials: 'ML', name: 'Mila Laurent', detail: 'Force · suivi cette semaine', status: 'À jour' },
  { initials: 'TH', name: 'Théo Henry', detail: 'Mobilité · séance à préparer', status: 'À suivre' },
  { initials: 'SA', name: 'Sarah André', detail: 'Reprise · programme actif', status: 'En cours' },
];

function ProductContent({ view }: { view: ProductView }) {
  if (view === 'clients') {
    return <div className="vh-client-list" aria-label="Liste de démonstration des adhérents">
      {clientSamples.map((client, index) => <div className="vh-client-row" key={client.initials}>
        <span className={`vh-client-avatar tone-${index + 1}`}>{client.initials}</span>
        <span className="vh-client-info"><b>{client.name}</b><small>{client.detail}</small></span>
        <span className={index === 1 ? 'vh-pill is-warm' : 'vh-pill'}>{client.status}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </div>)}
    </div>;
  }

  if (view === 'programs') {
    return <div className="vh-program-list" aria-label="Exemples de programmes">
      {[
        ['Force & mobilité', '3 séances · 4 semaines', 'En cours'],
        ['Reprise progressive', '2 séances · 6 semaines', 'Brouillon'],
        ['Renforcement général', '3 séances · 5 semaines', 'En cours'],
      ].map(([name, details, status], index) => <article className="vh-program-row" key={name}>
        <span className={`vh-program-mark mark-${index + 1}`}><Dumbbell size={17} /></span>
        <span><b>{name}</b><small>{details}</small></span>
        <span className="vh-pill">{status}</span>
        <ArrowUpRight size={15} aria-hidden="true" />
      </article>)}
    </div>;
  }

  if (view === 'planning') {
    return <div className="vh-schedule" aria-label="Exemple de planning hebdomadaire">
      <div className="vh-schedule-days"><span>HEURE</span><span>LUN. 21</span><span>MAR. 22</span><span>MER. 23</span><span>JEU. 24</span><span>VEN. 25</span></div>
      <div className="vh-schedule-grid">
        <span>09:00</span><div className="vh-event is-green">Mila · Force</div><div /><div className="vh-event is-sand">Théo · Suivi</div><div /><div className="vh-event is-green">Sarah · Mobilité</div>
        <span>11:00</span><div /><div className="vh-event is-ink">Bilan · Hugo</div><div /><div className="vh-event is-green">Mila · Séance</div><div />
        <span>14:00</span><div className="vh-event is-sand">Appel découverte</div><div /><div className="vh-event is-green">Sarah · Séance</div><div /><div />
      </div>
    </div>;
  }

  if (view === 'prospects') {
    return <div className="vh-pipeline" aria-label="Exemple de suivi de prospects">
      {[
        ['Nouveau', 'Camille', 'Demande de contact'],
        ['À relancer', 'Noah', 'Échange à poursuivre'],
        ['Rendez-vous', 'Léa', 'Bilan découverte'],
      ].map(([step, name, note], index) => <article className="vh-pipeline-column" key={step}>
        <div className="vh-pipeline-title"><span className={`vh-pipeline-dot dot-${index + 1}`} />{step}<span>{index + 1}</span></div>
        <div className="vh-lead-card"><span className="vh-lead-avatar">{name.slice(0, 1)}</span><b>{name}</b><small>{note}</small><span className="vh-lead-action">Voir le suivi <ArrowUpRight size={12} /></span></div>
      </article>)}
    </div>;
  }

  return <div className="vh-overview">
    <div className="vh-overview-metrics">
      <article><span>Adhérents</span><b>24</b></article>
      <article><span>Programmes actifs</span><b>08</b></article>
      <article><span>Séances à venir</span><b>12</b></article>
    </div>
    <div className="vh-overview-lower">
      <div className="vh-agenda-card">
        <div className="vh-card-heading"><b>À l’agenda</b><span>Cette semaine <ChevronRight size={14} /></span></div>
        <div className="vh-agenda-row"><time>09:00</time><i /><span><b>Mila Laurent</b><small>Séance · Force & mobilité</small></span><span className="vh-agenda-duration">45 min</span></div>
        <div className="vh-agenda-row"><time>11:30</time><i className="is-sand" /><span><b>Point de suivi</b><small>Visioconférence · Théo</small></span><span className="vh-agenda-duration">30 min</span></div>
        <div className="vh-agenda-row"><time>16:00</time><i className="is-ink" /><span><b>Préparer le programme</b><small>Sarah André</small></span><span className="vh-agenda-duration">À faire</span></div>
      </div>
      <div className="vh-next-card"><span className="vh-next-label">PROCHAINE ÉTAPE</span><span className="vh-next-icon"><MessageCircle size={17} /></span><b>Reprendre le fil du suivi</b><p>Retrouvez les programmes et les informations utiles de vos adhérents dans leur espace.</p><span className="vh-next-link">Ouvrir les adhérents <ArrowRight size={13} /></span></div>
    </div>
  </div>;
}

function ProductInterface({ view }: { view: ProductView }) {
  const current = productViews.find((item) => item.key === view) ?? productViews[0];
  return <div className="vh-product-window" aria-label="Aperçu du produit avec données fictives">
    <div className="vh-product-chrome">
      <div className="vh-chrome-dots" aria-hidden="true"><i /><i /><i /></div>
      <span className="vh-chrome-url">velatra.app / espace-coach</span>
      <span className="vh-demo-mark"><span /> APERÇU · DONNÉES FICTIVES</span>
    </div>
    <div className="vh-product-app">
      <aside className="vh-product-sidebar">
        <div className="vh-product-brand"><span>V</span><b>VELATRA</b></div>
        <span className="vh-sidebar-caption">ESPACE COACH</span>
        <nav aria-label="Navigation de l’aperçu">
          {productViews.map((item) => {
            const Icon = item.icon;
            return <span key={item.key} className={view === item.key ? 'is-active' : ''}><Icon size={16} />{item.label}</span>;
          })}
        </nav>
        <div className="vh-sidebar-profile"><span>VC</span><div><b>Votre espace</b><small>Compte coach</small></div></div>
      </aside>
      <div className="vh-product-main">
        <div className="vh-product-heading"><div><span>ESPACE COACH <i>/</i> {current.label.toUpperCase()}</span><h2>{current.title}</h2><p>{current.description}</p></div><button type="button" tabIndex={-1} aria-hidden="true">+ Ajouter</button></div>
        <div className="vh-product-dynamic" key={view}><ProductContent view={view} /></div>
      </div>
    </div>
  </div>;
}

function ToolConvergence() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.18 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <section className={`vh-convergence ${isVisible ? 'is-visible' : ''}`} ref={sectionRef} aria-labelledby="vh-convergence-title">
    <div className="vh-wrap vh-convergence-wrap">
      <div className="vh-convergence-copy"><span className="vh-eyebrow">D’OUTILS ÉPARPILLÉS À UN ESPACE CLAIR</span><h2 id="vh-convergence-title">Le coaching est votre métier.<br /><em>Pas la gestion de cinq outils.</em></h2><p>Tableurs, messages, calendrier, documents : vos journées ne devraient pas se passer à chercher la bonne information.</p></div>
      <div className="vh-convergence-scene" aria-label="Des outils courants réunis dans l’espace Velatra">
        <div className="vh-tool-cluster">
          <span className="vh-tool-chip chip-sheet"><FileSpreadsheet size={18} /> Tableur</span>
          <span className="vh-tool-chip chip-message"><MessageCircle size={18} /> Messages</span>
          <span className="vh-tool-chip chip-calendar"><CalendarDays size={18} /> Calendrier</span>
          <span className="vh-tool-chip chip-pdf"><FileText size={18} /> PDF & notes</span>
        </div>
        <div className="vh-convergence-path" aria-hidden="true"><i /><i /><i /><ArrowDown size={20} /></div>
        <div className="vh-single-space"><span className="vh-space-mark">V</span><div><span>AU MÊME ENDROIT</span><b>Velatra</b><small>Adhérents · programmes · planning · suivi</small></div><MoveRight size={23} aria-hidden="true" /></div>
      </div>
    </div>
  </section>;
}

function ProductTour() {
  const [view, setView] = useState<ProductView>('overview');
  const current = productViews.find((item) => item.key === view) ?? productViews[0];
  return <section className="vh-tour" id="produit" aria-labelledby="vh-tour-title">
    <div className="vh-wrap">
      <div className="vh-tour-intro"><div><span className="vh-eyebrow">VOTRE ACTIVITÉ, AU MÊME ENDROIT</span><h2 id="vh-tour-title">Un seul espace.<br /><em>Toute votre activité.</em></h2></div><p>Clients, CRM, programmes et planning : voyez concrètement comment Velatra rassemble les outils du coach.</p></div>
      <div className="vh-tour-tabs" aria-label="Choisir un aperçu du produit">
        {productViews.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" aria-pressed={view === item.key} onClick={() => setView(item.key)}><Icon size={16} />{item.label}</button>; })}
      </div>
      <div className="vh-tour-layout">
        <div className="vh-tour-copy" aria-live="polite"><span className="vh-tour-index">0{productViews.findIndex((item) => item.key === view) + 1} <i>/</i> 05</span><h3>{current.title}</h3><p>{current.description}</p><Link to="/fonctionnalites" className="vh-inline-link">Explorer les fonctionnalités <ArrowRight size={16} /></Link></div>
        <div className="vh-tour-screen"><ProductInterface view={view} /></div>
      </div>
    </div>
  </section>;
}

function MemberExperience() {
  return <section className="vh-member" id="adherents" aria-labelledby="vh-member-title">
    <div className="vh-wrap vh-member-layout">
      <div className="vh-member-copy"><span className="vh-eyebrow">L’ESPACE DE L’ADHÉRENT</span><h2 id="vh-member-title">Le coaching continue<br /><em>entre les séances.</em></h2><p>Vos adhérents retrouvent les programmes, les séances et les informations que vous partagez avec eux, depuis leur propre espace.</p><ul><li><Check size={17} /> Programmes sportifs et séances</li><li><Check size={17} /> Suivi selon les outils activés par le coach</li><li><Check size={17} /> Espace accessible sur mobile</li></ul><Link to="/fonctionnalites" className="vh-inline-link">Voir l’espace adhérent <ArrowRight size={16} /></Link></div>
      <div className="vh-member-stage"><div className="vh-member-caption"><span>02</span><span>ESPACE ADHÉRENT · APERÇU FICTIF</span></div><div className="vh-phone"><div className="vh-phone-camera" /><div className="vh-phone-top"><b>VELATRA</b><span>ML</span></div><div className="vh-phone-greeting"><small>VOTRE ESPACE</small><h3>Bonjour, Mila</h3><p>Voici votre prochaine séance.</p></div><div className="vh-phone-feature"><span>PROGRAMME EN COURS</span><b>Force & mobilité</b><small>Cette semaine · 3 séances prévues</small><div><i /></div></div><div className="vh-phone-session"><span><Dumbbell size={17} /></span><div><b>Séance du jour</b><small>Haut du corps · 45 min</small></div><ChevronRight size={16} /></div><div className="vh-phone-session is-light"><span><Activity size={17} /></span><div><b>Mon suivi</b><small>Mis à jour avec votre coach</small></div><ChevronRight size={16} /></div><div className="vh-phone-bottom"><span>Accueil</span><span>Programme</span><span>Suivi</span><span>Profil</span></div></div><div className="vh-member-side-note"><span className="vh-side-note-mark"><MessageCircle size={18} /></span><b>Un espace à eux.</b><small>Des repères faciles à retrouver après chaque séance.</small></div></div>
    </div>
  </section>;
}

function PricingPreview() {
  return <section className="vh-pricing" aria-labelledby="vh-pricing-title"><div className="vh-wrap vh-pricing-inner">
    <div><span className="vh-eyebrow">DES FORMULES SELON VOTRE ACTIVITÉ</span><h2 id="vh-pricing-title">Choisissez votre espace.</h2><p>Comparez les outils inclus et les conditions avant de souscrire.</p></div>
    <div className="vh-price-options"><div><span>STARTER COACH</span><b>39 € <small>/ mois</small></b><p>Tarif mensuel équivalent en facturation annuelle · jusqu’à 15 adhérents actifs.</p></div><div><span>CLUB & STUDIO</span><b>79 € <small>/ mois</small></b><p>Tarif mensuel équivalent en facturation annuelle · pour une activité en équipe.</p></div></div>
    <Link to="/tarifs" className="vh-inline-link">Voir les tarifs et conditions <ArrowRight size={16} /></Link>
  </div></section>;
}

const faqs = [
  { question: 'À qui s’adresse Velatra ?', answer: 'Velatra s’adresse aux coachs sportifs indépendants, personal trainers et structures de coaching qui veulent réunir leurs outils de suivi et d’organisation.' },
  { question: 'Que peuvent consulter les adhérents ?', answer: 'Selon les fonctionnalités activées par leur coach, les adhérents retrouvent leurs programmes, leurs séances et les informations de suivi partagées.' },
  { question: 'Comment demander un accès ?', answer: 'La création d’un espace coach nécessite actuellement un code d’invitation bêta. Contactez-nous pour connaître les conditions d’accès.' },
  { question: 'Où voir les prix et les fonctions de chaque formule ?', answer: 'La page Tarifs détaille les montants selon la période de facturation, le nombre d’adhérents et les fonctionnalités affichées.' },
];

function ClosingSection() {
  const [open, setOpen] = useState<number | null>(null);
  return <section className="vh-closing" aria-labelledby="vh-closing-title"><div className="vh-wrap vh-closing-layout">
    <div className="vh-closing-cta"><span className="vh-eyebrow">REPRENEZ LE FIL DE VOTRE ACTIVITÉ</span><h2 id="vh-closing-title">Vous êtes devenu coach<br /><em>pour coacher.</em></h2><p>Votre activité mérite un espace pensé pour la suivre au quotidien.</p><Link to="/contact" className="vh-button vh-button-primary">Demander un accès bêta <ArrowRight size={17} /></Link><Link to="/tarifs" className="vh-secondary-link">Voir les tarifs</Link><div className="vh-closing-rule"><span>VELATRA · ESPACE COACH</span><i /></div></div>
    <div className="vh-faq"><span className="vh-eyebrow">QUESTIONS FRÉQUENTES</span><h3>Avant de vous lancer.</h3>{faqs.map((item, index) => <article key={item.question} className={open === index ? 'is-open' : ''}><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}><span>{item.question}</span><span aria-hidden="true">{open === index ? '−' : '+'}</span></button>{open === index && <p>{item.answer}</p>}</article>)}<Link to="/contact" className="vh-inline-link">Une autre question ? Écrivez-nous <ArrowRight size={15} /></Link></div>
  </div></section>;
}

export default function HomePage() {
  return <>
    <Helmet>
      <title>Velatra — Gérez votre coaching, pas vos outils</title>
      <meta name="description" content="Réunissez adhérents, programmes, suivi, planning et prospects dans Velatra, l’espace de travail conçu pour les coachs sportifs." />
      <meta property="og:title" content="Velatra — Gérez votre coaching. Pas vos outils." />
      <meta property="og:description" content="Adhérents, programmes, planning et suivi : voyez comment Velatra rassemble votre activité de coach." />
      <meta property="og:type" content="website" />
    </Helmet>
    <main className="velatra-home-v2">
      <section className="vh-hero" aria-labelledby="vh-hero-title">
        <div className="vh-hero-backdrop" aria-hidden="true"><span>V</span><i /></div>
        <div className="vh-wrap vh-hero-copy">
          <span className="vh-eyebrow"><i /> LA PLATEFORME TOUT-EN-UN DES COACHS</span>
          <h1 id="vh-hero-title">Gérez votre coaching.<br /><em>Pas vos outils.</em></h1>
          <p>Clients, programmes, planning, paiements et CRM. Velatra rassemble toute votre activité dans une seule plateforme.</p>
          <div className="vh-hero-actions"><Link to="/contact" className="vh-button vh-button-primary">Demander un accès bêta <ArrowRight size={17} /></Link><a href="#produit" className="vh-button vh-button-secondary">Voir le produit <ArrowDown size={16} /></a></div>
          <div className="vh-hero-facts"><span>COACH + ADHÉRENT</span><i /><span>SPORT + NUTRITION</span><i /><span>CRM + ORGANISATION</span></div>
        </div>
        <div className="vh-wrap vh-hero-product"><ProductInterface view="overview" /></div>
        <div className="vh-hero-scroll"><span>FAITES DÉFILER POUR VOIR COMMENT TOUT SE REJOINT</span><i /></div>
      </section>
      <ToolConvergence />
      <ProductTour />
      <MemberExperience />
      <PricingPreview />
      <ClosingSection />
    </main>
  </>;
}

export { HomePage };
