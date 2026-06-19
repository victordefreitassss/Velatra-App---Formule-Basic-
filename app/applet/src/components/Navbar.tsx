import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export const Navbar = () => {
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <nav className="fixed top-0 inset-x-0 h-16 bg-white/75 backdrop-blur-md border-b border-zinc-100 z-50 flex items-center justify-between px-6 transition-all">
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
        {/* Brand Logo */}
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 cursor-pointer focus:outline-none"
          id="nav_brand_logo"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shadow-sm">
            <span className="text-white font-mono font-black text-sm">V</span>
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-900 font-display">Velatra</span>
        </button>

        {/* Minimal Navigation Items */}
        <div className="flex items-center gap-6">
          <a 
            href="#features" 
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            Fonctionnalités
          </a>
          <a 
            href="#pricing" 
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            Tarifs
          </a>
          
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 border border-zinc-200 px-3.5 py-1.5 rounded-lg transition-all"
            id="nav_login_btn"
          >
            Se connecter
          </button>
        </div>
      </div>
    </nav>
  );
};
