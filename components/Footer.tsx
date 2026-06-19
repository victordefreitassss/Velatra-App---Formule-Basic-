import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, Phone, MapPin, Instagram, Facebook, Linkedin } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 text-zinc-400 pt-20 pb-10 border-t border-zinc-900">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Brand info */}
        <div className="space-y-4 col-span-1 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Zap className="text-black w-5 h-5 fill-current" />
            </div>
            <span className="font-display font-bold text-xl tracking-tighter text-white">Velatra</span>
          </Link>
          <p className="text-xs text-zinc-500 leading-relaxed">
            L'excellence technologique au service des coachs sportifs et des studios de fitness d’élite.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-850">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-850">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-850">
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Product / Features Column */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white tracking-wider uppercase">SOLUTION</h4>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</Link></li>
            <li><Link to="/tarifs" className="hover:text-white transition-colors">Tarifs & Offres</Link></li>
            <li><Link to="/solutions" className="hover:text-white transition-colors">Cas d'usage</Link></li>
            <li><Link to="/centre-d-aide" className="hover:text-white transition-colors">Centre d'aide</Link></li>
          </ul>
        </div>

        {/* Enterprise / Corporate Column */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white tracking-wider uppercase">ENTREPRISE</h4>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/a-propos" className="hover:text-white transition-colors">À propos de nous</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            <li><Link to="/blog" className="hover:text-white transition-colors">Blog & Actualités</Link></li>
          </ul>
        </div>

        {/* Contact info column */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white tracking-wider uppercase">CONTACT DIRECT</h4>
          <ul className="space-y-3 text-xs">
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
              <a href="mailto:support@velatra.app" className="hover:text-white transition-colors">support@velatra.app</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
              <a href="tel:+33184605920" className="hover:text-white transition-colors">+33 1 84 60 59 20</a>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-zinc-500">Paris, France • Lyon, France</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-16 pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-600">
        <p>© {currentYear} Velatra. Tous droits réservés.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/mentions-legales" className="hover:text-zinc-400 transition-colors">Mentions légales</Link>
          <Link to="/cgv" className="hover:text-zinc-400 transition-colors">CGV</Link>
          <Link to="/confidentialite" className="hover:text-zinc-400 transition-colors">Politique de confidentialité</Link>
        </div>
      </div>
    </footer>
  );
};
