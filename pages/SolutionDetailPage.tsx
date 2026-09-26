import { useLocation, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicMeta, PublicHero, FeatureList, ProductCapture, ProductClosing } from '../components/PublicProduct';

export default function SolutionDetailPage() {
  const studio = useLocation().pathname === '/solutions/studio';
  const features = studio ? [
    ['Un responsable pour piloter.', 'Le responsable retrouve les adhérents de sa structure et ses outils de gestion dans un espace central.'],
    ['Un coach pour chaque suivi.', 'Attribuez les adhérents à leur coach. Chaque coach retrouve les personnes qui lui sont confiées.'],
    ['Des accès adaptés au rôle.', 'Les rôles responsable, coach et adhérent organisent les accès. L’espace personnel de l’adhérent accompagne son propre suivi.'],
    ['Le quotidien de votre structure.', 'Préparez les programmes, retrouvez les rendez-vous et consultez les paiements de votre activité.'],
  ] : [
    ['Retrouvez le contexte client.', 'Objectifs, historique et échanges vous aident à reprendre le suivi sans rechercher les informations dans plusieurs outils.'],
    ['Préparez vos programmes.', 'Créez les séances manuellement ou utilisez l’IA pour obtenir une proposition que vous ajustez et validez.'],
    ['Gardez le fil des prospects.', 'Organisez les prises de contact, les relances et les séances d’essai avant de créer un profil adhérent.'],
    ['Structurez votre semaine.', 'Rassemblez planning, tâches et suivi des paiements pour garder une vue claire sur votre activité.'],
  ];
  return <div className="vp-page"><PublicMeta path={studio ? '/solutions/studio' : '/solutions/coach-sportif'} title={studio ? 'Velatra Studio — La plateforme de votre structure de coaching' : 'Velatra Coach — Votre activité de coach dans un seul système'} description={studio ? 'Organisez vos coachs, attribuez les adhérents et centralisez le suivi de votre studio. Découvrez les outils d’équipe disponibles dans Velatra.' : 'Clients, programmes, suivi, planning et prospects : Velatra accompagne les coachs indépendants, personal trainers et coachs en ligne.'} /><PublicHero studio={studio} eyebrow={studio ? 'VELATRA STUDIO · STUDIOS & SALLES' : 'VELATRA COACH · COACHS INDÉPENDANTS'} title={studio ? <>Vos coachs. Vos adhérents.<br /><em>Un seul système.</em></> : <>Votre activité de coach.<br /><em>Dans un seul système.</em></>} description={studio ? 'Réunissez les outils de votre activité et organisez le suivi entre le responsable, les coachs et leurs adhérents.' : 'En présentiel ou à distance, consacrez votre énergie au suivi. Velatra réunit la programmation, les clients et l’organisation de votre activité.'} />
      <div className="marketing-container"><ProductCapture /><section className="vp-section"><div className="vp-section-heading"><span className="marketing-kicker">{studio ? 'UNE ORGANISATION QUI RESTE CLAIRE' : 'LE FIL DE VOTRE QUOTIDIEN'}</span><h2>{studio ? 'Chacun son rôle. Un suivi relié.' : 'Moins d’outils dispersés. Plus de continuité.'}</h2></div><div className="vp-two-col">{features.map(([title, text], i) => <article className="vp-panel" key={title}><span className="marketing-kicker">0{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="vp-split vp-plan-summary"><div><span className="marketing-kicker">{studio ? 'VELATRA STUDIO' : 'VELATRA COACH'}</span><h2>{studio ? '149 €' : '49 €'} <span>/ mois</span></h2><p>Ou <strong>{studio ? '1 490 €' : '490 €'} / an</strong><br />2 mois offerts avec le paiement annuel.</p><Link to="/tarifs" className="marketing-text-link">Comparer les offres<ArrowRight size={17} /></Link></div><div><FeatureList items={studio ? ['Les outils de Velatra Coach', 'Plusieurs comptes coachs après activation de l’équipe', 'Attribution des adhérents à leur coach', 'Vue de gestion du responsable de structure'] : ['Un compte coach', 'Gestion clients, CRM et espace adhérent', 'Programmes, suivi, messagerie et assistance IA', 'Planning et suivi des paiements']} /><p className="vp-note">{studio ? 'Pendant la bêta, les accès équipe sont activés avec Velatra lors de la mise en place. La démonstration permet de vérifier les outils adaptés à votre structure.' : 'L’accès bêta est sur invitation. Les paiements en ligne nécessitent la configuration de Stripe.'}</p></div></section><ProductClosing studio={studio} /></div>
    </div>;
}
