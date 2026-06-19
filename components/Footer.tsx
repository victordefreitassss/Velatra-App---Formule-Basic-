import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, Phone, MapPin, Instagram, Facebook, Linkedin } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white text-zinc-500 pt-20 pb-10 border-t border-zinc-200/60">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Brand info */}
        <div className="space-y-4 col-span-1 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-zinc-950 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Zap className="text-white w-4 h-4 fill-emerald-400 stroke-none" />
            </div>
            <span className="font-sans font-bold text-lg tracking-tight text-zinc-900">Velatra</span>
          </Link>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">
            L'excellence technologique au service des coachs sportifs et des studios de fitness d’élite.
          </p>
          <div className="flex items-center gap-2.5 pt-1.5 animate-fade-in">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-950 rounded-lg transition-colors border border-zinc-200/50">
              <Instagram className="w-3.5 h-3.5" />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-950 rounded-lg transition-colors border border-zinc-200/50">
              <Facebook className="w-3.5 h-3.5" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-950 rounded-lg transition-colors border border-zinc-200/50">
              <Linkedin className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Product / Features Column */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black tracking-wider text-zinc-900 uppercase">SOLUTION</h4>
          <ul className="space-y-2 text-xs font-medium">
            <li><a href="/#features" className="hover:text-zinc-950 transition-colors">Fonctionnalités</a></li>
            <li><a href="/#pricing" className="hover:text-zinc-950 transition-colors">Tarifs & Offres</a></li>
          </ul>
        </div>

        {/* Enterprise / Corporate Column */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black tracking-wider text-zinc-900 uppercase">ENTREPRISE</h4>
          <ul className="space-y-2 text-xs font-medium">
            <li><Link to="/contact" className="hover:text-zinc-950 transition-colors">Contact</Link></li>
          </ul>
        </div>

        {/* Contact info column */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black tracking-wider text-zinc-900 uppercase">CONTACT DIRECT</h4>
          <ul className="space-y-2 text-xs font-medium">
            <li className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <a href="mailto:support@velatra.app" className="hover:text-zinc-950 transition-colors">support@velatra.app</a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <a href="tel:+33184605920" className="hover:text-zinc-950 transition-colors">+33 1 84 60 59 20</a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-zinc-400 text-[11px] font-normal">Paris & Lyon, France</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-12 pt-6 border-t border-zinc-150 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-zinc-400 font-medium">
        <p>© {currentYear} Velatra. Tous droits réservés.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
          <Link to="/mentions-legales" className="hover:text-zinc-800 transition-colors">Mentions légales</Link>
          <Link to="/cgv" className="hover:text-zinc-800 transition-colors">CGV</Link>
          <Link to="/confidentialite" className="hover:text-zinc-800 transition-colors">Politique de confidentialité</Link>
        </div>
      </div>
    </footer>
  );
};
