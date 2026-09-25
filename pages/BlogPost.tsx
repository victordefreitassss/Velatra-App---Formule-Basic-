import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3 } from 'lucide-react';

type ArticleSection = { heading: string; paragraphs: string[] };
type Article = { title: string; description: string; category: string; published: string; date: string; read: string; sections: ArticleSection[] };

const articles: Record<string, Article> = {
  'optimiser-retention-membres-studio-fitness': {
    title: 'Comment structurer le suivi des adhérents dans un studio de coaching',
    description: 'Des repères simples pour suivre la présence, les objectifs et les prochaines étapes de vos adhérents.',
    category: 'Fidélisation', published: '2026-06-12', date: '12 juin 2026', read: '5 min',
    sections: [
      { heading: 'Rendez les objectifs visibles', paragraphs: ['Un adhérent comprend mieux son accompagnement lorsque les objectifs convenus avec son coach sont formulés clairement. Gardez une trace des priorités et reprenez-les régulièrement pendant les bilans.', 'Les objectifs peuvent évoluer avec les contraintes, les progrès et les préférences de la personne. Le suivi doit aider la conversation, pas remplacer le jugement du coach.'] },
      { heading: 'Gardez une trace des séances', paragraphs: ['Retrouver les séances prévues et les éléments consignés par l’adhérent permet de préparer les prochains échanges. Choisissez les informations qui servent vraiment à adapter l’accompagnement.', 'Une vue d’ensemble des programmes et de l’activité facilite la continuité quand plusieurs séances s’enchaînent.'] },
      { heading: 'Organisez les prochains points de contact', paragraphs: ['Un suivi régulier ne demande pas forcément un long rendez-vous à chaque fois. Une courte vérification des objectifs, du planning et des difficultés éventuelles permet de décider de la suite.', 'Dans Velatra, les profils, programmes et séances partagés sont rassemblés dans l’espace coach. Consultez la page Fonctionnalités pour découvrir les outils de suivi disponibles.'] },
    ],
  },
  'automatiser-comptabilite-guide-coach-independant': {
    title: 'Organiser les paiements de son activité de coach sportif',
    description: 'Les informations à rassembler pour suivre les offres, les échéances et les paiements de votre activité.',
    category: 'Gestion', published: '2026-06-04', date: '4 juin 2026', read: '4 min',
    sections: [
      { heading: 'Commencez par clarifier vos offres', paragraphs: ['Notez les services proposés, leur fréquence et leur prix. Une présentation claire aide le client à comprendre ce qu’il achète et vous aide à suivre les échéances.', 'Précisez également les modalités de réservation, de report et de résiliation qui s’appliquent à votre activité.'] },
      { heading: 'Rassemblez les informations utiles', paragraphs: ['Pour suivre votre activité, vous avez besoin de retrouver les échéances, le statut des paiements et les justificatifs associés. Choisissez une organisation que vous pouvez tenir à jour.', 'Si vous utilisez Stripe, vérifiez directement dans votre compte les moyens de paiement, les frais et les règles qui s’appliquent à votre configuration. Les frais du prestataire dépendent de son offre et ne sont pas fixés par Velatra.'] },
      { heading: 'Séparez le suivi des paiements et la comptabilité', paragraphs: ['Un tableau de suivi ou un outil de gestion peut aider à repérer les paiements attendus et à retrouver les justificatifs. Il ne remplace pas une comptabilité adaptée à votre situation ni les conseils d’un professionnel.', 'Velatra comprend des outils de suivi des paiements et peut se connecter à Stripe selon la configuration. Consultez la page Tarifs et les modalités affichées avant de choisir.'] },
    ],
  },
  'suivi-performance-autonome-motivation-athletes': {
    title: 'Mettre en place un suivi de progression utile pour ses adhérents',
    description: 'Comment relier les objectifs, les séances et les échanges pour rendre le suivi plus lisible.',
    category: 'Coaching', published: '2026-05-28', date: '28 mai 2026', read: '6 min',
    sections: [
      { heading: 'Choisissez peu d’indicateurs, mais utiles', paragraphs: ['Les indicateurs dépendent de l’objectif, de la discipline et du contexte de l’adhérent. Avant de recueillir une mesure, expliquez à quoi elle sert et comment elle sera utilisée.', 'Un suivi bien choisi facilite les échanges avec le coach. Trop d’indicateurs peuvent alourdir la saisie et distraire des objectifs de la personne.'] },
      { heading: 'Reliez les mesures aux séances', paragraphs: ['Les charges, répétitions, ressentis et notes de séance donnent un contexte au programme. Décidez avec l’adhérent ce qu’il est utile de consigner et à quelle fréquence.', 'Les données de suivi ne racontent pas toute l’histoire. Le coach les met en perspective avec les échanges, la récupération et l’expérience vécue par l’adhérent.'] },
      { heading: 'Faites du bilan un échange', paragraphs: ['Un bilan régulier permet de revoir ce qui avance, ce qui bloque et les ajustements possibles. Les décisions de programme restent du ressort du coach et se prennent avec l’adhérent.', 'Velatra permet de partager des programmes et de retrouver les informations de suivi dans l’espace de coaching. Consultez les pages Suivi client et Programmes d’entraînement pour découvrir ces usages.'] },
    ],
  },
  'parcours-decouverte-coach-sportif': {
    title: 'Créer un parcours de découverte pour son activité de coaching',
    description: 'Organisez les premiers échanges, précisez votre offre et facilitez le suivi de vos prospects.',
    category: 'Acquisition', published: '2026-09-25', date: '25 septembre 2026', read: '5 min',
    sections: [
      { heading: 'Présentez clairement votre accompagnement', paragraphs: ['Expliquez à qui s’adresse votre offre, ce qu’elle comprend et comment se déroule l’accompagnement. Une présentation précise aide un futur adhérent à savoir si votre façon de travailler lui correspond.', 'Évitez de promettre un résultat qui dépend de nombreux facteurs personnels. Présentez plutôt les étapes, le cadre et les échanges qui composent votre accompagnement.'] },
      { heading: 'Rendez le premier contact simple', paragraphs: ['Indiquez un moyen de contact clair et les informations dont vous avez besoin pour comprendre la demande. Un formulaire court peut aider à préparer un premier échange sans demander plus de données que nécessaire.', 'Précisez ce qui se passe ensuite : prise de rendez-vous, appel de découverte ou réponse par e-mail. Restez cohérent avec les délais que vous pouvez réellement tenir.'] },
      { heading: 'Gardez une trace de la prochaine étape', paragraphs: ['Après un premier échange, notez la prochaine action utile : répondre à une question, proposer un créneau ou reprendre contact à une date convenue.', 'Un espace de suivi des prospects aide à organiser ces étapes. Velatra comprend un espace dédié aux prospects et des outils de coaching pour poursuivre l’accompagnement une fois l’inscription faite.'] },
    ],
  },
};

export default function BlogPostPage() {
  const { slug } = useParams();
  const article = slug ? articles[slug] : undefined;
  const canonical = `${window.location.origin}/blog/${slug ?? ''}`;
  if (!article) return <main className="marketing-article-not-found"><div className="marketing-container"><span className="marketing-kicker">ARTICLE INTROUVABLE</span><h1>Cette page n’existe pas.</h1><p>Retournez au blog pour parcourir les articles disponibles.</p><Link to="/blog" className="marketing-button marketing-button-primary"><ArrowLeft size={15} /> Retour au blog</Link></div></main>;

  const outline = article.sections.map((section, index) => ({ ...section, id: `section-${index + 1}` }));
  const structuredData = { '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.description, datePublished: article.published, dateModified: article.published, author: { '@type': 'Organization', name: 'Velatra' }, publisher: { '@type': 'Organization', name: 'Velatra' }, mainEntityOfPage: canonical, articleSection: article.category, inLanguage: 'fr-FR' };

  return <>
    <Helmet>
      <title>{article.title} | Blog Velatra</title>
      <meta name="description" content={article.description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="article" /><meta property="og:title" content={`${article.title} | Blog Velatra`} /><meta property="og:description" content={article.description} />
      <meta property="article:published_time" content={article.published} /><meta property="article:section" content={article.category} />
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
    <main className="marketing-article"><div className="marketing-container">
      <nav className="marketing-breadcrumb" aria-label="Fil d’Ariane"><Link to="/">Accueil</Link><span>/</span><Link to="/blog">Blog</Link><span>/</span><span>{article.category}</span></nav>
      <header className="marketing-article-header"><Link to="/blog" className="marketing-article-back"><ArrowLeft size={14} /> Tous les articles</Link><span className="marketing-blog-category">{article.category}</span><h1>{article.title}</h1><p>{article.description}</p><div className="marketing-article-meta"><span>Par Velatra</span><span><CalendarDays size={13} /> <time dateTime={article.published}>{article.date}</time></span><span><Clock3 size={13} /> {article.read} de lecture</span></div></header>
      <div className="marketing-article-layout"><aside className="marketing-article-toc"><b>DANS CET ARTICLE</b>{outline.map((section) => <a key={section.id} href={`#${section.id}`}>{section.heading}</a>)}</aside><article className="marketing-article-body">{outline.map((section) => <section id={section.id} key={section.id}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}<div className="marketing-article-cta"><span className="marketing-kicker">VOTRE ESPACE COACHING</span><h2>Envie de réunir vos outils ?</h2><p>Découvrez comment Velatra organise les programmes et le suivi de vos adhérents.</p><Link to="/register" className="marketing-button marketing-button-primary">Découvrir Velatra <ArrowRight size={15} /></Link></div></article></div>
    </div></main>
  </>;
}
export { BlogPostPage };
