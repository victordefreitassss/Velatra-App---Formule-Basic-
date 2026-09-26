import { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

export const coachAccess = '/contact?request=coach-beta';
export const studioDemo = '/contact?request=studio-demo';

export function PublicMeta({ title, description, path }: { title: string; description: string; path: string }) {
  return <Helmet><title>{title}</title><meta name="description" content={description} /><link rel="canonical" href={`${window.location.origin}${path}`} /><meta property="og:title" content={title} /><meta property="og:description" content={description} /><meta property="og:type" content="website" /></Helmet>;
}

export function PublicHero({ eyebrow, title, description, studio = false, children }: { eyebrow: string; title: ReactNode; description: string; studio?: boolean; children?: ReactNode }) {
  return <header className="vp-hero marketing-container"><span className="marketing-kicker">{eyebrow}</span><h1>{title}</h1><p>{description}</p><div className="vp-actions"><Link to={studio ? studioDemo : coachAccess} className="marketing-button marketing-button-primary">{studio ? 'Demander une démo' : 'Obtenir mon accès bêta'}<ArrowRight size={17} /></Link><Link to="/tarifs" className="marketing-button marketing-button-secondary">Voir les tarifs<ArrowRight size={17} /></Link></div>{children}</header>;
}

export function FeatureList({ items }: { items: string[] }) {
  return <ul className="vp-feature-list">{items.map(item => <li key={item}><Check size={17} aria-hidden="true" /><span>{item}</span></li>)}</ul>;
}

export function ProductCapture({ view = 'dashboard' }: { view?: 'dashboard' | 'crm' }) {
  return <figure className="vp-capture"><div className="vp-capture-bar"><span><img src="/brand/velatra-mark.png" alt="" />VELATRA</span><span>INTERFACE RÉELLE · DONNÉES DE DÉMONSTRATION</span></div><picture><source media="(max-width: 600px)" srcSet={`/product/${view}-mobile.jpg`} /><img src={`/product/${view}-desktop.jpg`} alt={view === 'dashboard' ? 'Tableau de bord coach Velatra : actions à traiter, prochaines séances et suivi des adhérents.' : 'CRM Velatra : prospects organisés par étape, de la prise de contact à l’abonnement.'} loading="lazy" width="1280" height="820" /></picture><figcaption>{view === 'dashboard' ? 'Le tableau de bord de l’application, avec des profils fictifs.' : 'Le pipeline du produit : contacts, relances et séances d’essai. Profils fictifs.'}</figcaption></figure>;
}

export function ProgrammingService() {
  return <section className="vp-service" id="programmation-sur-mesure"><div><span className="marketing-kicker">UNE OPTION, SELON VOS BESOINS</span><h2>Vous préférez déléguer<br />la programmation ?</h2><p>Confiez-nous la préparation de vos programmes directement dans Velatra. Un accompagnement facultatif, en complément de votre abonnement.</p><Link to="/contact?request=programming" className="marketing-text-link">Parler de mon accompagnement<ArrowRight size={17} /></Link></div><div className="vp-service-price"><h3>Programmation sur mesure</h3><strong>À partir de 149 € <span>/ mois</span></strong><p>Selon le volume et le niveau d’accompagnement.</p><span>Pour les studios : sur devis.</span></div></section>;
}

export function ProductClosing({ studio = false }: { studio?: boolean }) {
  return <section className="vp-closing"><div><span className="marketing-kicker">FAITES PLACE AU COACHING</span><h2>{studio ? 'Découvrez Velatra avec votre équipe.' : 'Votre activité mérite un espace à elle.'}</h2><p>{studio ? 'Présentez-nous votre structure. Nous vous montrons les outils disponibles et préparons les accès de votre équipe.' : 'La bêta est accessible sur invitation. Présentez-nous votre activité pour préparer votre accès.'}</p></div><Link to={studio ? studioDemo : coachAccess} className="marketing-button marketing-button-primary">{studio ? 'Demander une démo' : 'Obtenir mon accès bêta'}<ArrowRight size={17} /></Link></section>;
}
