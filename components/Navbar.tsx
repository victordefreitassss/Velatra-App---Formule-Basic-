import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, ArrowRight, Menu, X } from 'lucide-react';

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="pt-4 px-4 sm:px-6 lg:px-8">
        <nav className="max-w-5xl mx-auto bg-[#0a0a0c]/60 backdrop-blur-xl border border-zinc-900/80 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.6)] rounded-2xl">
          <div className="px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 bg-zinc-950/80 border border-zinc-800/80 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform group-hover:border-emerald-500/30">
                  <Zap className="text-emerald-400 w-4 h-4 fill-emerald-400 stroke-none" />
                </div>
                <span className="font-sans font-bold text-lg tracking-tight text-white">Velatra</span>
              </Link>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <Link to="/#features" className="text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-colors">Fonctionnalités</Link>
              <Link to="/#pricing" className="text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-colors">Tarifs</Link>
              <Link to="/contact" className="text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-colors">Contact</Link>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link to="/login" className="text-xs font-semibold text-zinc-450 hover:text-white transition-colors">
                Se connecter
              </Link>
              <Link to="/register" className="bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-350 hover:to-emerald-450 text-neutral-950 px-4.5 py-2.5 rounded-xl text-xs font-bold hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] duration-250 transition-all flex items-center gap-1.5 active:scale-[0.98]">
                Essai gratuit
                <ArrowRight className="w-3 h-3 text-neutral-950 stroke-[2.5]" />
              </Link>
            </div>

            <div className="md:hidden flex items-center">
              <button className="p-2 text-zinc-400 hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-4 right-4 mt-2 p-4 bg-[#0d0d10]/95 backdrop-blur-2xl border border-zinc-850/80 rounded-2xl shadow-2xl"
          >
            <div className="flex flex-col gap-1.5">
              <Link 
                to="/#features" 
                className="text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 px-4 py-2.5 rounded-xl block transition-all" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Fonctionnalités
              </Link>
              <Link 
                to="/#pricing" 
                className="text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 px-4 py-2.5 rounded-xl block transition-all" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tarifs
              </Link>
              <Link 
                to="/contact" 
                className="text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 px-4 py-2.5 rounded-xl block transition-all" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="h-px bg-zinc-850 my-1.5"></div>
              <div className="flex flex-col gap-2 p-1">
                <Link 
                  to="/login" 
                  className="text-center text-sm font-semibold text-zinc-400 hover:text-white py-2.5 block" 
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Se connecter
                </Link>
                <Link 
                  to="/register" 
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 text-neutral-950 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all" 
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Essai gratuit
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-950 stroke-[2.5]" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
