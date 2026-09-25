import React from 'react';
import { Link } from 'react-router-dom';

const groups = [
  { title: 'PRODUIT', links: [{ label: 'Fonctionnalités', to: '/fonctionnalites' }, { label: 'Solutions', to: '/solutions' }, { label: 'Tarifs', to: '/tarifs' }] },
  { title: 'RESSOURCES', links: [{ label: 'Blog', to: '/blog' }, { label: 'Centre d’aide', to: '/centre-d-aide' }, { label: 'Contact', to: '/contact' }] },
  { title: 'VELATRA', links: [{ label: 'À propos', to: '/a-propos' }, { label: 'Connexion', to: '/login' }, { label: 'Créer un compte', to: '/register' }] },
];

export const Footer: React.FC = () => (
  <footer className="marketing-footer">
    <div className="marketing-container">
      <div className="marketing-footer-inner">
        <div className="marketing-footer-brand">
          <Link to="/" className="marketing-logo"><span className="marketing-logo-mark">V</span><span>VELATRA</span></Link>
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
