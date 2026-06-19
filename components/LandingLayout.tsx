import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FluidBackground } from './FluidBackground';
import { CookieBanner } from './CookieBanner';
import { DemoPopup } from './DemoPopup';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollYProgress, scrollY } = useScroll();
  const pathLength = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    return scrollY.on("change", (latest) => {
      setIsVisible(latest > 500);
    });
  }, [scrollY]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 bg-zinc-900/80 hover:bg-zinc-900 text-white rounded-full shadow-lg hover:scale-110 transition-transform group border border-zinc-800/80 backdrop-blur-md"
          aria-label="Retour en haut"
        >
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" className="text-zinc-850" />
            <motion.circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" className="text-emerald-500" style={{ pathLength }} />
          </svg>
          <ArrowUp className="w-5 h-5 relative z-10 group-hover:-translate-y-1 transition-transform" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default function LandingLayout() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <div className="min-h-screen selection:bg-emerald-100 selection:text-emerald-900 flex flex-col relative bg-transparent transition-colors duration-500">
      <FluidBackground />
      <motion.div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600 origin-left z-[60]" style={{ scaleX }} />
      <div className="relative z-10 flex flex-col flex-grow">
        <Navbar />
        <main className="flex-grow">
          <Outlet />
        </main>
        <Footer />
      </div>
      <ScrollToTopButton />
      <CookieBanner />
      <DemoPopup />
    </div>
  );
}
