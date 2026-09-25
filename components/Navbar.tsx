import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';

const navigation = [
  { label: 'Produit', to: '/#produit' },
  { label: 'Solutions', to: '/solutions' },
  { label: 'Fonctionnalités', to: '/fonctionnalites' },
  { label: 'Tarifs', to: '/tarifs' },
  { label: 'Adhérents', to: '/#adherents' },
  { label: 'Ressources', to: '/centre-d-aide' },
  { label: 'Blog', to: '/blog' },
];

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const closeMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 12);
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        document.querySelector<HTMLButtonElement>('.marketing-mobile-toggle')?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMobileMenuOpen]);

  return (
    <header className={`marketing-navbar-wrap${isScrolled ? ' is-scrolled' : ''}`}>
      <nav className="marketing-navbar" aria-label="Navigation principale">
        <Link to="/" className="marketing-logo" onClick={closeMenu} aria-label="Velatra, accueil">
          <span className="marketing-logo-mark" aria-hidden="true" /><span>VELATRA</span>
        </Link>
        <div className="marketing-nav-links">
          {navigation.map((item) => <Link key={item.label} to={item.to}>{item.label}</Link>)}
        </div>
        <div className="marketing-nav-actions">
          <Link to="/login" className="marketing-login">Connexion</Link>
          <Link to="/contact" className="marketing-nav-cta">Demander un accès bêta <ArrowRight size={14} /></Link>
        </div>
        <button type="button" className="marketing-mobile-toggle" aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={isMobileMenuOpen} aria-controls="marketing-mobile-menu" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </nav>
      {isMobileMenuOpen && <div className="marketing-mobile-nav" id="marketing-mobile-menu">
        <Link to="/" className="marketing-mobile-nav-brand" onClick={closeMenu} aria-label="Velatra, accueil"><span className="marketing-logo-mark" aria-hidden="true" /><span>VELATRA</span></Link>
        {navigation.map((item) => <Link key={item.label} to={item.to} onClick={closeMenu}>{item.label}</Link>)}
        <Link to="/login" onClick={closeMenu}>Connexion</Link>
        <Link to="/contact" className="marketing-mobile-cta" onClick={closeMenu}>Demander un accès bêta <ArrowRight size={14} /></Link>
      </div>}
    </header>
  );
};
