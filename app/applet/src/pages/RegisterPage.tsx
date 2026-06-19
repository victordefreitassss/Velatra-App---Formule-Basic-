import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Shield, Sparkles } from 'lucide-react';

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [clubName, setClubName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && clubName.trim() && email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center items-center p-6 text-zinc-900 relative">
      
      {/* Return Button inside Register Page */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 h-9 px-4 bg-white hover:bg-zinc-100 border border-zinc-200/60 rounded-xl text-xs font-semibold text-zinc-600 transition-all shadow-sm"
          id="register_back_to_site"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
          Retourner au site
        </button>
      </div>

      <div className="w-full max-w-sm bg-white border border-zinc-200 p-8 rounded-2xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.04)] text-left space-y-6">
        
        {/* Portal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono">
            <Sparkles className="w-3 h-3 text-emerald-500 fill-current animate-spin" /> Offre de Lancement
          </div>
          <h2 className="text-xl font-display font-bold tracking-tight text-zinc-950 pt-1">
            Créer votre Club PWA
          </h2>
          <p className="text-xs text-zinc-400">
            Commencez dès aujourd'hui votre essai complet de 14 jours gratuits
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1 font-bold">Nom du Responsable</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marc-Antoine Bernard"
                className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-zinc-300"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1 font-bold">Nom du Club / Marque</label>
              <input
                type="text"
                required
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Apex Fitness Athlétique"
                className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-zinc-300"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1 font-bold">Adresse Email de contact</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@apexfitness.com"
                className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-zinc-300"
              />
            </div>

            <div className="flex items-start gap-2 bg-zinc-50 border border-zinc-150 p-2.5 rounded-lg text-[9px] text-zinc-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Velatra sécurise vos fonds directement via Stripe Connect. Zéro commission en plus de la tarification standard.</span>
            </div>

            <button
              type="submit"
              className="w-full h-10 bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm"
              id="register_submit"
            >
              Fonder mon club
            </button>
          </form>
        ) : (
          <div className="py-10 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-800 tracking-tight">Félicitations, Club créé !</h3>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Votre espace <strong>{clubName}</strong> est en cours d'indexation PWA. Un email d'activation vient d'être envoyé à {email}.
              </p>
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-[10.5px] font-semibold text-zinc-400 hover:text-zinc-800 transition-colors"
          >
            Déjà inscrit ? Gérer mon club
          </button>
        </div>

      </div>
    </div>
  );
};
