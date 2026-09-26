import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check, CircleHelp, ClipboardList, Dumbbell, Users, CalendarDays, ChartNoAxesCombined } from 'lucide-react';

type SeoPage = {
  title: string;
  shortTitle: string;
  description: string;
  intro: string;
  sections: { title: string; text: string }[];
  features: string[];
};

const pages: Record<string, SeoPage> = {
  '/logiciel-coach-sportif': {
    title: 'Logiciel pour coach sportif : adhérents, programmes et suivi | Velatra',
    shortTitle: 'Le logiciel de coaching sportif pensé pour votre quotidien.',
    description: 'Gérez les adhérents, les programmes sportifs, les séances et le suivi de votre activité avec Velatra, un logiciel conçu pour les coachs sportifs.',
    intro: 'Réunissez les outils de votre activité de coach sportif : gestion des adhérents, création de programmes, suivi des séances et organisation.',
    sections: [
      { title: 'Une vue claire sur vos adhérents', text: 'Retrouvez les profils et les informations de suivi dans votre espace coach pour préparer un accompagnement cohérent.' },
      { title: 'Des programmes accessibles', text: 'Préparez des séances et des programmes sportifs, puis partagez-les avec vos adhérents dans leur espace dédié.' },
      { title: 'Une activité mieux organisée', text: 'Rassemblez les outils de coaching et les informations utiles au suivi de votre activité dans la même plateforme.' },
    ],
    features: ['Gestion des adhérents', 'Programmes et séances', 'Suivi des progrès', 'Espace dédié aux adhérents'],
  },
  '/logiciel-personal-trainer': {
    title: 'Logiciel pour personal trainer : suivi client et séances | Velatra',
    shortTitle: 'Un espace pour personnaliser le suivi de chaque client.',
    description: 'Un logiciel de personal training pour organiser les clients, préparer les séances et suivre les programmes sportifs dans un espace dédié.',
    intro: 'Le personal training repose sur un accompagnement individuel. Velatra vous aide à retrouver les informations utiles, structurer les séances et garder le fil du suivi.',
    sections: [
      { title: 'Un profil par client', text: 'Rassemblez les éléments de suivi et le programme partagé afin de mieux préparer votre prochaine séance.' },
      { title: 'Des séances structurées', text: 'Créez des séances d’entraînement et organisez vos programmes depuis l’espace coach.' },
      { title: 'Un espace accessible entre les séances', text: 'Vos clients peuvent retrouver les contenus transmis par leur coach dans leur propre espace.' },
    ],
    features: ['Profils clients', 'Création de séances', 'Programmes personnalisés', 'Espace client mobile'],
  },
  '/logiciel-studio-coaching': {
    title: 'Logiciel de gestion pour studio de coaching sportif | Velatra',
    shortTitle: 'Les outils de votre studio de coaching, réunis.',
    description: 'Centralisez les adhérents, les programmes, le planning et les outils de gestion de votre studio de coaching sportif avec Velatra.',
    intro: 'Un studio jongle entre accompagnement, planning et organisation. Velatra rassemble les outils de coaching et les informations utiles à l’activité.',
    sections: [
      { title: 'Une vue organisée de vos adhérents', text: 'Retrouvez les profils, les programmes et les informations utiles dans votre espace de gestion.' },
      { title: 'Planning et séances au même endroit', text: 'Organisez les rendez-vous et retrouvez les séances prévues depuis les outils de planification disponibles.' },
      { title: 'Un suivi adapté à votre structure', text: 'Velatra comprend des fonctionnalités pour les coachs et les studios. Consultez les offres pour voir les fonctions prévues pour chaque formule.' },
    ],
    features: ['Adhérents et profils', 'Planning et réservations', 'Programmes sportifs', 'Outils de gestion'],
  },
  '/crm-coach-sportif': {
    title: 'CRM pour coach sportif : organisez vos prospects | Velatra',
    shortTitle: 'Suivez vos prospects sans perdre le fil.',
    description: 'Un CRM pour coach sportif afin de rassembler les prospects, organiser les prises de contact et suivre les étapes avant l’inscription.',
    intro: 'Un nouveau prospect ne devrait pas disparaître dans une conversation. Organisez vos contacts et retrouvez les différentes étapes de votre suivi commercial.',
    sections: [
      { title: 'Centralisez vos contacts', text: 'Retrouvez vos prospects dans un espace dédié et gardez les informations utiles à portée de main.' },
      { title: 'Visualisez les prochaines étapes', text: 'Organisez vos prises de contact et faites le point sur les personnes à recontacter ou à rencontrer.' },
      { title: 'Passez du prospect à l’accompagnement', text: 'Lorsque le prospect devient adhérent, son suivi peut se poursuivre dans les outils coach et l’espace qui lui est destiné.' },
    ],
    features: ['Liste de prospects', 'Suivi des étapes', 'Organisation des relances', 'Lien avec l’espace de coaching'],
  },
  '/logiciel-suivi-client-coach': {
    title: 'Logiciel de suivi client pour coach sportif | Velatra',
    shortTitle: 'Gardez le fil du suivi de chaque adhérent.',
    description: 'Suivez les programmes, les séances et les informations partagées par vos clients dans un logiciel conçu pour les coachs sportifs.',
    intro: 'Un accompagnement efficace s’appuie sur des informations accessibles. Velatra réunit les programmes, les séances et les outils de suivi de vos adhérents.',
    sections: [
      { title: 'Retrouvez le contexte avant la séance', text: 'Consultez les profils et les informations de suivi disponibles dans l’espace coach.' },
      { title: 'Suivez l’activité au fil du temps', text: 'Les séances et les éléments saisis dans l’espace adhérent contribuent au suivi partagé avec son coach.' },
      { title: 'Faites vivre une expérience cohérente', text: 'Vos adhérents disposent d’un espace dédié pour retrouver les contenus de coaching mis à leur disposition.' },
    ],
    features: ['Profils et objectifs', 'Programmes partagés', 'Historique des séances', 'Espace adhérent'],
  },
  '/logiciel-programme-entrainement': {
    title: 'Logiciel pour créer des programmes d’entraînement | Velatra',
    shortTitle: 'Préparez et partagez vos programmes d’entraînement.',
    description: 'Créez des séances et programmes sportifs, organisez vos exercices et partagez l’entraînement avec vos adhérents grâce à Velatra.',
    intro: 'Préparez les séances, organisez vos programmes et partagez le contenu dans l’espace de vos adhérents. Le suivi reste lié à votre activité de coaching.',
    sections: [
      { title: 'Construisez des séances structurées', text: 'Composez des entraînements à partir des outils et exercices disponibles dans votre espace coach.' },
      { title: 'Organisez les programmes', text: 'Rassemblez les séances et préparez les contenus que vous souhaitez transmettre à vos adhérents.' },
      { title: 'Partagez le travail avec vos adhérents', text: 'Vos clients peuvent retrouver les programmes communiqués dans leur espace personnel.' },
    ],
    features: ['Création de séances', 'Bibliothèque d’exercices', 'Programmes sportifs', 'Espace client'],
  },
};

const iconSet = [Users, Dumbbell, CalendarDays, ChartNoAxesCombined];

export default function SeoLandingPage() {
  const { pathname } = useLocation();
  const page = pages[pathname] ?? pages['/logiciel-coach-sportif'];
  const canonical = `${window.location.origin}${pathname}`;
  const faq = [
    { question: 'À qui s’adresse Velatra ?', answer: 'Velatra accompagne les coachs sportifs et les structures de coaching qui souhaitent réunir leurs adhérents, programmes et outils de suivi.' },
    { question: 'Les adhérents disposent-ils d’un espace personnel ?', answer: 'Oui. Les adhérents peuvent accéder à un espace dédié pour retrouver les programmes et contenus transmis par leur coach.' },
    { question: 'Comment découvrir les fonctionnalités disponibles ?', answer: 'La page Produit présente les outils de l’application. La page Tarifs détaille les offres disponibles.' },
  ];
  const structuredData = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Velatra', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: page.description, url: canonical, featureList: page.features },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) },
  ];

  return <>
    <Helmet>
      <title>{page.title}</title>
      <meta name="description" content={page.description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={page.title} />
      <meta property="og:description" content={page.description} />
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
    <main className="marketing-seo-page">
      <section className="marketing-seo-hero"><div className="marketing-container"><nav className="marketing-breadcrumb" aria-label="Fil d’Ariane"><Link to="/">Accueil</Link><span>/</span><Link to="/produit">Velatra</Link><span>/</span><span>{page.title.split(':')[0]}</span></nav><span className="marketing-kicker"><span className="marketing-kicker-dot" /> VOTRE ACTIVITÉ DE COACHING</span><h1>{page.shortTitle}</h1><p>{page.intro}</p><div className="marketing-hero-actions"><Link to="/contact?request=coach-beta" className="marketing-button marketing-button-primary">Obtenir mon accès bêta <ArrowRight size={16} /></Link><Link to="/produit" className="marketing-button marketing-button-secondary">Voir le produit</Link></div><div className="marketing-seo-proof"><div><b>01</b><span>Un espace pour<br />vos adhérents</span></div><div><b>02</b><span>Les outils pour<br />vos programmes</span></div><div><b>03</b><span>Une vue plus claire<br />sur votre activité</span></div></div></div></section>
      <section className="marketing-seo-content"><div className="marketing-container"><div className="marketing-seo-heading"><span className="marketing-kicker">DÉCOUVRIR VELATRA</span><h2>Les bons outils pour<br /><em>mieux accompagner.</em></h2></div><div className="marketing-seo-feature-grid">{page.sections.map((section, index) => { const Icon = iconSet[index]; return <article key={section.title}><span className="marketing-seo-icon"><Icon size={18} /></span><small>0{index + 1}</small><h3>{section.title}</h3><p>{section.text}</p></article>; })}</div><div className="marketing-seo-included"><div><span className="marketing-kicker">DANS VOTRE ESPACE</span><h2>Votre quotidien de coach,<br /><em>rassemblé.</em></h2><p>{page.intro}</p><Link to="/produit" className="marketing-text-link">Voir les fonctionnalités <ArrowRight size={15} /></Link></div><ul>{page.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul></div></div></section>
      <section className="marketing-seo-faq"><div className="marketing-container"><div><span className="marketing-kicker"><CircleHelp size={14} /> VOS QUESTIONS</span><h2>Avant de vous lancer.</h2></div><div>{faq.map((item) => <article key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></article>)}</div></div></section>
      <section className="marketing-seo-cta"><div className="marketing-container"><div><span className="marketing-kicker">FAITES LE PREMIER PAS</span><h2>Votre activité mérite<br />un espace à elle.</h2></div><div><p>Découvrez Velatra et voyez comment ses outils s’intègrent à votre façon de coacher.</p><Link to="/contact?request=coach-beta" className="marketing-button marketing-button-primary">Obtenir mon accès bêta <ArrowRight size={16} /></Link></div></div></section>
    </main>
  </>;
}
