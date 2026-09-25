import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';

const navigation = [
  { label: 'Produit', to: '/#produit' },
  { label: 'Solutions', to: '/solutions' },
  { label: 'Fonctionnalités', to: '/fonctionnalites' },
  { label: 'Tarifs', to: '/tarifs' },
  { label: 'Clients', to: '/#clients' },
  { label: 'Ressources', to: '/centre-d-aide' },
  { label: 'Blog', to: '/blog' },
];

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="marketing-navbar-wrap">
      <nav className="marketing-navbar" aria-label="Navigation principale">
        <Link to="/" className="marketing-logo" onClick={closeMenu} aria-label="Velatra, accueil">
          <span className="marketing-logo-mark">V</span><span>VELATRA</span>
        </Link>
        <div className="marketing-nav-links">
          {navigation.map((item) => <Link key={item.label} to={item.to}>{item.label}</Link>)}
        </div>
        <div className="marketing-nav-actions">
          <Link to="/login" className="marketing-login">Connexion</Link>
          <Link to="/register" className="marketing-nav-cta">Essayer gratuitement <ArrowRight size={14} /></Link>
        </div>
        <button type="button" className="marketing-mobile-toggle" aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </nav>
      {isMobileMenuOpen && <div className="marketing-mobile-nav">
        {navigation.map((item) => <Link key={item.label} to={item.to} onClick={closeMenu}>{item.label}</Link>)}
        <Link to="/login" onClick={closeMenu}>Connexion</Link>
      </div>}
    </header>
  );
};
