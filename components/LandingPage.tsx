import React from 'react';
import { Button } from './UI';
import { 
  CalendarIcon, 
  VideoIcon, 
  HeartIcon, 
  CreditCardIcon, 
  CheckCircleIcon, 
  DownloadIcon,
  MoonIcon,
  ArrowRightIcon,
  SparklesIcon,
  SendIcon
} from './Icons';

export const LandingPage: React.FC<{ onLogin: () => void, onRegister: () => void }> = ({ onLogin, onRegister }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-zinc-900 overflow-x-hidden selection:bg-velatra-accent selection:text-white">
      
      {/* Top Banner */}
      <div className="bg-[#00B87C] text-white text-center py-2.5 text-sm font-medium">
        🚀 Offre de pré-lancement : <span className="font-bold">-10% à vie</span> sur tous nos abonnements jusqu'au 1er Avril ! <a href="#" className="underline font-bold ml-1 hover:text-white/80 transition-colors">Voir les tarifs</a>
      </div>

      {/* Header */}
      <header className="fixed top-12 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 z-50">
        <div className="bg-white/80 backdrop-blur-xl rounded-full px-6 py-3 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Velatra</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500">
            <a href="#" className="hover:text-zinc-900 transition-colors">Fonctionnalités</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Solutions</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Tarifs</a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="text-zinc-400 hover:text-zinc-900 transition-colors">
              <MoonIcon size={20} />
            </button>
            <button onClick={onLogin} className="hidden md:block text-sm font-bold text-zinc-900 hover:text-velatra-accent transition-colors">
              Connexion
            </button>
            <Button onClick={onRegister} className="hidden md:flex !rounded-full !py-2.5 !px-5 !text-sm group">
              Réserver une Démo <ArrowRightIcon size={16} className="ml-2 inline-block group-hover:translate-x-1 transition-transform" />
            </Button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-zinc-900">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-4 right-4 mt-4 bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100 md:hidden animate-in slide-in-from-top-4 fade-in duration-200">
            <nav className="flex flex-col gap-4 text-center">
              <a href="#" className="text-lg font-bold text-zinc-900 py-2 border-b border-zinc-100">Fonctionnalités</a>
              <a href="#" className="text-lg font-bold text-zinc-900 py-2 border-b border-zinc-100">Solutions</a>
              <a href="#" className="text-lg font-bold text-zinc-900 py-2 border-b border-zinc-100">Tarifs</a>
              <button onClick={onLogin} className="text-lg font-bold text-velatra-accent py-2">Connexion</button>
              <Button onClick={onRegister} className="!rounded-full !py-4 w-full mt-2">
                Réserver une Démo
              </Button>
            </nav>
          </div>
        )}
      </header>

      <main className="pt-32 pb-24 space-y-32">
        {/* Hero Section */}
        <section className="max-w-5xl mx-auto px-4 text-center pt-12 md:pt-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-sm font-medium text-zinc-600 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Velatra 2.0 est maintenant disponible
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-zinc-900 mb-6 leading-[1.1]">
            Le coaching de demain,<br/>
            <span className="font-serif italic font-light text-zinc-600">pas derrière un écran.</span>
          </h1>
          
          <p className="text-2xl font-light text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            La première plateforme qui libère les coachs de la technique pour les reconnecter à l'essentiel : l'humain et la performance.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={onRegister} className="!rounded-full !py-4 !px-8 !text-base shadow-md hover:shadow-lg transition-all duration-300 ease-out">
              Démarrer gratuitement
            </Button>
            <Button variant="secondary" className="!rounded-full !py-4 !px-8 !text-base hover:bg-zinc-50 transition-all duration-300 ease-out">
              Voir la démo
            </Button>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="relative max-w-6xl mx-auto px-4 text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-3xl bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
          
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-zinc-200/50 absolute top-0 left-1/2 -translate-x-1/2 w-full -z-10 select-none">
            Connecté à vos outils préférés
          </h2>
          
          <div className="relative z-10 pt-12 md:pt-20">
            <p className="text-xl md:text-2xl text-zinc-500 max-w-3xl mx-auto leading-relaxed font-medium">
              Velatra s'intègre parfaitement à l'écosystème que vous utilisez déjà pour une transition sans friction.
            </p>

            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mt-16">
              <div className="flex items-center gap-3 text-2xl font-bold text-zinc-400 hover:text-[#635BFF] transition-colors cursor-pointer grayscale hover:grayscale-0 opacity-70 hover:opacity-100">
                <CreditCardIcon size={32} /> Stripe
              </div>
              <div className="flex items-center gap-3 text-2xl font-bold text-zinc-400 hover:text-[#4285F4] transition-colors cursor-pointer grayscale hover:grayscale-0 opacity-70 hover:opacity-100">
                <CalendarIcon size={32} /> Google Calendar
              </div>
              <div className="flex items-center gap-3 text-2xl font-bold text-zinc-400 hover:text-[#2D8CFF] transition-colors cursor-pointer grayscale hover:grayscale-0 opacity-70 hover:opacity-100">
                <VideoIcon size={32} /> Zoom
              </div>
              <div className="flex items-center gap-3 text-2xl font-bold text-zinc-400 hover:text-[#FF2D55] transition-colors cursor-pointer grayscale hover:grayscale-0 opacity-70 hover:opacity-100">
                <HeartIcon size={32} /> Apple Health
              </div>
            </div>
          </div>
        </section>

        {/* Migration Section */}
        <section className="max-w-5xl mx-auto px-4">
          <div className="bg-[#00B87C] rounded-[2.5rem] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            
            <div className="flex-1 text-white space-y-8 relative z-10">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">Peur de changer d'outil ?</h2>
              <p className="text-emerald-50 text-lg md:text-xl leading-relaxed max-w-xl">
                Nous savons que migrer ses clients peut faire peur. C'est pourquoi notre équipe s'occupe d'importer toutes vos données (Excel, autres logiciels) gratuitement lors de votre inscription.
              </p>
              
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-lg font-medium">
                  <CheckCircleIcon size={24} className="text-white" /> Importation de vos clients en 1 clic
                </li>
                <li className="flex items-center gap-3 text-lg font-medium">
                  <CheckCircleIcon size={24} className="text-white" /> Reprise de vos anciens programmes
                </li>
                <li className="flex items-center gap-3 text-lg font-medium">
                  <CheckCircleIcon size={24} className="text-white" /> Accompagnement dédié par un expert
                </li>
              </ul>
            </div>

            <div className="w-full md:w-auto relative z-10">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 md:p-12 text-center text-white shadow-xl">
                <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <DownloadIcon size={48} />
                </div>
                <h3 className="text-2xl font-black mb-2">Migration 100%<br/>Gratuite</h3>
                <p className="text-emerald-100 font-medium">On s'occupe de tout pour vous.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating AI Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="bg-white/90 backdrop-blur-md border border-zinc-200 shadow-xl rounded-full py-3 px-5 flex items-center gap-3 text-sm font-medium text-zinc-900 hover:shadow-2xl hover:-translate-y-1 transition-all">
          <SparklesIcon size={18} className="text-zinc-900" />
          Demandez-moi n'importe quoi...
          <SendIcon size={16} className="text-zinc-400 ml-2" />
        </button>
      </div>

    </div>
  );
};
