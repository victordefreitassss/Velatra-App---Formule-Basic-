import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Sun, Moon, ArrowRight, Menu, X } from 'lucide-react';

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="pt-4 px-4 sm:px-6 lg:px-8">
        <nav className="max-w-5xl mx-auto bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg rounded-2xl transition-colors">
          <div className="px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Zap className="text-white dark:text-black w-5 h-5" />
                </div>
                <span className="font-display font-bold text-xl tracking-tighter text-zinc-900 dark:text-white">Velatra</span>
              </Link>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <Link to="/fonctionnalites" className="text-sm font-medium text-zinc-650 dark:text-zinc-350 hover:text-black dark:hover:text-white transition-colors">Fonctionnalités</Link>
              <Link to="/tarifs" className="text-sm font-medium text-zinc-650 dark:text-zinc-350 hover:text-black dark:hover:text-white transition-colors">Tarifs</Link>
              <Link to="/a-propos" className="text-sm font-medium text-zinc-650 dark:text-zinc-350 hover:text-black dark:hover:text-white transition-colors">À propos</Link>
              <Link to="/contact" className="text-sm font-medium text-zinc-650 dark:text-zinc-350 hover:text-black dark:hover:text-white transition-colors">Contact</Link>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors mr-1"
                aria-label="Mode Nuit"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link to="/login" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 transition-colors">
                Se connecter
              </Link>
              <Link to="/register" className="bg-emerald-500 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                Commencer gratuitement
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="md:hidden flex items-center gap-4">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button className="p-2 text-zinc-600 dark:text-zinc-300" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-2 right-2 mt-2 p-4 bg-white/98 dark:bg-zinc-900/98 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl"
          >
            <div className="flex flex-col gap-2">
              <Link to="/fonctionnalites" className="text-base font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 py-3 rounded-xl" onClick={() => setIsMobileMenuOpen(false)}>Fonctionnalités</Link>
              <Link to="/tarifs" className="text-base font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 py-3 rounded-xl" onClick={() => setIsMobileMenuOpen(false)}>Tarifs</Link>
              <Link to="/a-propos" className="text-base font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 py-3 rounded-xl" onClick={() => setIsMobileMenuOpen(false)}>À propos</Link>
              <Link to="/contact" className="text-base font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 py-3 rounded-xl" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2"></div>
              <div className="flex flex-col gap-3 p-2">
                <Link to="/login" className="text-center text-base font-semibold text-zinc-700 dark:text-zinc-300 py-2" onClick={() => setIsMobileMenuOpen(false)}>
                  Se connecter
                </Link>
                <Link to="/register" className="bg-emerald-500 text-white px-5 py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-lg" onClick={() => setIsMobileMenuOpen(false)}>
                  Commencer gratuitement
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
