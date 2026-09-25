import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Compass, HeartHandshake, Layers3 } from 'lucide-react';

const principles = [
  { icon: Compass, number: '01', title: 'Partir du quotidien', body: 'Les outils doivent suivre le travail réel d’un coach : préparer, accompagner, suivre et organiser.' },
  { icon: Layers3, number: '02', title: 'Rassembler ce qui va ensemble', body: 'Adhérents, programmes, séances et organisation trouvent leur place dans la même plateforme.' },
  { icon: HeartHandshake, number: '03', title: 'Garder le coach aux commandes', body: 'Velatra met à disposition des outils de suivi. Les décisions d’accompagnement restent entre le coach et son adhérent.' },
];

export default function AboutPageMarketing() {
  return <>
    <Helmet>
      <title>À propos de Velatra — Des outils pensés pour le coaching</title>
      <meta name="description" content="Découvrez la vision de Velatra : réunir les outils dont les coachs sportifs ont besoin pour organiser les programmes, les adhérents et leur activité." />
      <link rel="canonical" href={`${window.location.origin}/a-propos`} />
    </Helmet>
    <main className="marketing-about">
      <section className="marketing-about-hero"><div className="marketing-container"><span className="marketing-kicker">À PROPOS DE VELATRA</span><h1>Les bons outils.<br /><em>Pour le vrai travail de coach.</em></h1><p>Velatra réunit les espaces et fonctionnalités qui accompagnent le quotidien des coachs sportifs et de leurs adhérents.</p><Link to="/fonctionnalites" className="marketing-button marketing-button-primary">Découvrir la plateforme <ArrowRight size={16} /></Link><div className="marketing-about-interface" aria-label="Aperçu des espaces Velatra"><div><span className="marketing-about-mark">V</span><b>VELATRA</b><small>COACHER · ORGANISER · SUIVRE</small></div><span className="marketing-about-node">Programmes</span><span className="marketing-about-node">Adhérents</span><span className="marketing-about-node">Suivi</span><span className="marketing-about-node">Planning</span></div></div></section>
      <section className="marketing-section marketing-about-principles"><div className="marketing-container"><div className="marketing-section-heading"><span className="marketing-kicker">NOTRE APPROCHE</span><h2>Le coaching au centre.<br /><em>Les outils autour.</em></h2><p>Une plateforme claire doit aider à mieux organiser l’activité, sans compliquer la relation entre le coach et l’adhérent.</p></div><div className="marketing-about-grid">{principles.map(({ icon: Icon, number, title, body }) => <article key={number}><span>{number}</span><div><Icon size={20} /></div><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>
      <section className="marketing-about-quote"><div className="marketing-container"><span className="marketing-kicker">NOTRE CONVICTION</span><p>Un coach doit pouvoir consacrer son énergie à l’accompagnement, avec des outils qui l’aident à garder une vue claire sur son activité.</p><span className="marketing-about-quote-rule" /></div></section>
      <section className="marketing-about-cta"><div className="marketing-container"><div><span className="marketing-kicker"><Check size={14} /> DE LA PLACE POUR CHAQUE RÔLE</span><h2>Un espace pour le coach.<br />Un espace pour l’adhérent.</h2><p>Explorez l’application et les outils disponibles pour votre activité.</p></div><div className="marketing-about-actions"><Link to="/register" className="marketing-button marketing-button-primary">Découvrir Velatra <ArrowRight size={15} /></Link><Link to="/contact" className="marketing-text-link">Parler à l’équipe <ArrowRight size={15} /></Link></div></div></section>
    </main>
  </>;
}
export { AboutPageMarketing };
