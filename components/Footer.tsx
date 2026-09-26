import { Link } from 'react-router-dom';

const groups = [
  { title: 'PRODUIT', links: [{ label: 'La plateforme', to: '/produit' }, { label: 'Tarifs', to: '/tarifs' }] },
  { title: 'SOLUTIONS', links: [{ label: 'Coachs sportifs', to: '/solutions/coach-sportif' }, { label: 'Studios & salles', to: '/solutions/studio' }] },
  { title: 'RESSOURCES', links: [{ label: 'Blog', to: '/blog' }, { label: 'Centre d’aide', to: '/centre-d-aide' }, { label: 'Contact', to: '/contact' }] },
  { title: 'VELATRA', links: [{ label: 'À propos', to: '/a-propos' }, { label: 'Connexion', to: '/login' }, { label: 'Obtenir mon accès bêta', to: '/contact?request=coach-beta' }] },
];

export const Footer = () => (
  <footer className="marketing-footer">
    <div className="marketing-container">
      <div className="marketing-footer-inner">
        <div className="marketing-footer-brand">
          <Link to="/" className="marketing-logo"><img className="marketing-logo-mark" src="/brand/velatra-mark.png" alt="" /><span>VELATRA</span></Link>
          <p>La plateforme qui réunit les outils essentiels de votre activité de coaching sportif.</p>
        </div>
        {groups.map((group) => <div key={group.title}><h3>{group.title}</h3><div className="marketing-footer-links">{group.links.map((link) => <Link key={link.label} to={link.to}>{link.label}</Link>)}</div></div>)}
      </div>
      <div className="marketing-footer-bottom">
        <span>© {new Date().getFullYear()} Velatra</span>
        <div className="marketing-footer-legal"><Link to="/mentions-legales">Mentions légales</Link><Link to="/cgv">CGV</Link><Link to="/confidentialite">Confidentialité</Link></div>
      </div>
    </div>
  </footer>
);
