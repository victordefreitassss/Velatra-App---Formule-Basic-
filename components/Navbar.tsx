import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';

const accessRequest = '/contact?request=coach-beta';
const navGroups = {
  solutions: [
    { label: 'Coachs sportifs', description: 'Pour les coachs indépendants', to: '/solutions/coach-sportif' },
    { label: 'Studios & salles', description: 'Pour les équipes de coaching', to: '/solutions/studio' },
  ],
  resources: [
    { label: 'Blog', description: 'Conseils et actualités', to: '/blog' },
    { label: 'Centre d’aide', description: 'Réponses sur Velatra', to: '/centre-d-aide' },
  ],
};

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { pathname } = useLocation();
  const isStudioPage = pathname === '/solutions/studio';
  const ctaLabel = isStudioPage ? 'Demander une démo' : 'Obtenir mon accès bêta';
  const ctaHref = isStudioPage ? '/contact?request=studio-demo' : accessRequest;
  const closeMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 12);
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  useEffect(() => {
    closeMenu();
    document.querySelectorAll<HTMLDetailsElement>('.marketing-nav-dropdown[open]').forEach((menu) => { menu.open = false; });
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const openMenus = document.querySelectorAll<HTMLDetailsElement>('.marketing-nav-dropdown[open]');
      openMenus.forEach(menu => { menu.open = false; menu.querySelector('summary')?.focus(); });
      if (isMobileMenuOpen) { closeMenu(); document.querySelector<HTMLButtonElement>('.marketing-mobile-toggle')?.focus(); }
    };
    const closeOutside = (event: PointerEvent) => {
      document.querySelectorAll<HTMLDetailsElement>('.marketing-nav-dropdown[open]').forEach(menu => {
        if (!menu.contains(event.target as Node)) menu.open = false;
      });
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOutside);
    return () => { window.removeEventListener('keydown', closeOnEscape); window.removeEventListener('pointerdown', closeOutside); };
  }, [isMobileMenuOpen]);

  const dropdown = (label: string, items: typeof navGroups.solutions) => (
    <details className="marketing-nav-dropdown">
      <summary>{label}<ChevronDown size={13} aria-hidden="true" /></summary>
      <div className="marketing-nav-menu">
        {items.map((item) => <Link key={item.to} to={item.to}>
          <span>{item.label}</span><small>{item.description}</small>
        </Link>)}
      </div>
    </details>
  );

  return (
    <header className={`marketing-navbar-wrap${isScrolled ? ' is-scrolled' : ''}`}>
      <nav className="marketing-navbar" aria-label="Navigation principale">
        <Link to="/" className="marketing-logo" onClick={closeMenu} aria-label="Velatra, accueil">
          <img className="marketing-logo-mark" src="/brand/velatra-mark.png" alt="" /><span>VELATRA</span>
        </Link>
        <div className="marketing-nav-links">
          <Link to="/produit">Produit</Link>
          {dropdown('Solutions', navGroups.solutions)}
          <Link to="/tarifs">Tarifs</Link>
          {dropdown('Ressources', navGroups.resources)}
        </div>
        <div className="marketing-nav-actions">
          <Link to="/login" className="marketing-login">Connexion</Link>
          <Link to={ctaHref} className="marketing-nav-cta">{ctaLabel}<ArrowRight size={14} /></Link>
        </div>
        <button type="button" className="marketing-mobile-toggle" aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={isMobileMenuOpen} aria-controls="marketing-mobile-menu" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </nav>
      {isMobileMenuOpen && <div className="marketing-mobile-nav" id="marketing-mobile-menu">
        <Link to="/" className="marketing-mobile-nav-brand" onClick={closeMenu} aria-label="Velatra, accueil"><img className="marketing-logo-mark" src="/brand/velatra-mark.png" alt="" /><span>VELATRA</span></Link>
        <Link to="/produit" onClick={closeMenu}>Produit</Link>
        {dropdown('Solutions', navGroups.solutions)}
        <Link to="/tarifs" onClick={closeMenu}>Tarifs</Link>
        {dropdown('Ressources', navGroups.resources)}
        <Link to="/login" onClick={closeMenu}>Connexion</Link>
        <Link to={ctaHref} className="marketing-mobile-cta" onClick={closeMenu}>{ctaLabel}<ArrowRight size={14} /></Link>
      </div>}
    </header>
  );
};
