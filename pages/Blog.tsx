import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Search } from 'lucide-react';

const posts = [
  { title: 'Comment structurer le suivi des adhérents dans un studio de coaching', desc: 'Des repères simples pour suivre la présence, les objectifs et les prochaines étapes de vos adhérents.', date: '12 juin 2026', isoDate: '2026-06-12', author: 'Velatra', category: 'Fidélisation', tags: ['Coaching', 'Organisation'], slug: 'optimiser-retention-membres-studio-fitness', read: '5 min' },
  { title: 'Organiser les paiements de son activité de coach sportif', desc: 'Les informations à rassembler pour suivre les offres, les échéances et les paiements de votre activité.', date: '4 juin 2026', isoDate: '2026-06-04', author: 'Velatra', category: 'Gestion', tags: ['Business', 'Organisation'], slug: 'automatiser-comptabilite-guide-coach-independant', read: '4 min' },
  { title: 'Mettre en place un suivi de progression utile pour ses adhérents', desc: 'Comment relier les objectifs, les séances et les échanges pour rendre le suivi plus lisible.', date: '28 mai 2026', isoDate: '2026-05-28', author: 'Velatra', category: 'Coaching', tags: ['Fidélisation', 'Organisation'], slug: 'suivi-performance-autonome-motivation-athletes', read: '6 min' },
  { title: 'Créer un parcours de découverte pour son activité de coaching', desc: 'Organisez les premiers échanges, précisez votre offre et facilitez le suivi de vos prospects.', date: '25 septembre 2026', isoDate: '2026-09-25', author: 'Velatra', category: 'Acquisition', tags: ['Business', 'Marketing'], slug: 'parcours-decouverte-coach-sportif', read: '5 min' },
];
const categories = ['Tout', 'Gestion', 'Coaching', 'Business', 'Acquisition', 'Fidélisation', 'Organisation', 'Marketing'];

export default function BlogPage() {
  const [category, setCategory] = useState('Tout');
  const [search, setSearch] = useState('');
  const visiblePosts = useMemo(() => posts.filter((post) => (category === 'Tout' || post.category === category || post.tags.includes(category)) && `${post.title} ${post.desc} ${post.category} ${post.tags.join(' ')}`.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr'))), [category, search]);
  const featured = posts[0];

  return <>
    <Helmet>
      <title>Blog Velatra — Coaching sportif, organisation et activité</title>
      <meta name="description" content="Conseils pratiques pour coachs sportifs : suivi des adhérents, programmes, organisation et gestion d’une activité de coaching." />
      <meta property="og:title" content="Le blog Velatra pour les coachs sportifs" />
      <meta property="og:description" content="Des repères utiles pour mieux organiser votre activité et accompagner vos adhérents." />
    </Helmet>
    <main className="marketing-blog">
      <section className="marketing-blog-header"><div className="marketing-container"><span className="marketing-kicker">LE JOURNAL VELATRA</span><h1>Des idées claires.<br /><em>Pour coacher sereinement.</em></h1><p>Guides et conseils pour organiser votre activité, structurer le suivi et accompagner vos adhérents.</p></div></section>
      <section className="marketing-container marketing-blog-content">
        <article className="marketing-blog-featured"><div><span className="marketing-blog-category">À LA UNE · {featured.category}</span><h2>{featured.title}</h2><p>{featured.desc}</p><div className="marketing-blog-meta"><span><CalendarDays size={13} /> {featured.date}</span><span>{featured.read} de lecture</span></div><Link to={`/blog/${featured.slug}`} className="marketing-button marketing-button-primary">Lire l’article <ArrowRight size={15} /></Link></div><div className="marketing-blog-feature-visual" aria-hidden="true"><div className="marketing-blog-paper"><span>VELATRA · CARNET DE COACH</span><i /><i /><i /><i /><b>Le suivi, en clair.</b></div><span className="marketing-blog-feature-orbit" /></div></article>
        <div className="marketing-blog-toolbar"><div className="marketing-blog-categories" aria-label="Filtrer par catégorie">{categories.map((item) => <button key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="marketing-blog-search"><Search size={15} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un article" aria-label="Rechercher un article" /></label></div>
        <div className="marketing-blog-grid">{visiblePosts.map((post) => <article key={post.slug} className="marketing-blog-card"><span className="marketing-blog-card-mark">V<span>·</span></span><div className="marketing-blog-meta"><span>{post.category}</span><span>{post.read}</span></div><h2>{post.title}</h2><p>{post.desc}</p><div className="marketing-blog-card-bottom"><time dateTime={post.isoDate}>{post.date}</time><Link to={`/blog/${post.slug}`} aria-label={`Lire : ${post.title}`}><ArrowRight size={17} /></Link></div></article>)}</div>
        {visiblePosts.length === 0 && <p className="marketing-blog-empty">Aucun article ne correspond à votre recherche.</p>}
        <div className="marketing-blog-cta"><div><span className="marketing-kicker">UN ESPACE POUR VOTRE COACHING</span><h2>Vos programmes, votre suivi,<br />votre activité au même endroit.</h2></div><Link to="/register" className="marketing-button marketing-button-primary">Découvrir Velatra <ArrowRight size={15} /></Link></div>
      </section>
    </main>
  </>;
}
export { BlogPage };
