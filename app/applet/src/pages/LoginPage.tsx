import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Shield, Sparkles } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logging, setLogging] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true);
    setErr(null);
    setTimeout(() => {
      setLogging(false);
      setErr("Erreur d'authentification : Vos identifiants de démo sont inactifs ou inexistants.");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center items-center p-6 text-zinc-900 relative">
      
      {/* Return Button inside Login Portal */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 h-9 px-4 bg-white hover:bg-zinc-100 border border-zinc-200/60 rounded-xl text-xs font-semibold text-zinc-600 transition-all shadow-sm"
          id="login_back_to_site"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
          Retourner au site
        </button>
      </div>

      <div className="w-full max-w-sm bg-white border border-zinc-200 p-8 rounded-2xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.04)] text-left space-y-6">
        
        {/* Portal Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center mx-auto text-white shadow-sm">
            <span className="font-mono font-black text-sm">V</span>
          </div>
          <h2 className="text-xl font-display font-bold tracking-tight text-zinc-950 pt-1.5">
            Espace Club Coach
          </h2>
          <p className="text-xs text-zinc-400">
            Saisissez vos identifiants pour administrer votre club
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1 font-bold">Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400">
                <Mail className="w-3.5 h-3.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@votreclub.com"
                className="w-full h-10 pl-9 pr-3 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-zinc-300"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1 font-bold">Mot de passe</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 pr-3 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-zinc-300"
              />
            </div>
          </div>

          {err && (
            <div className="text-[10.5px] text-rose-500 bg-rose-50 rounded px-2.5 py-1.5 leading-normal">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={logging}
            className={`w-full h-10 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              logging 
                ? 'bg-zinc-800 text-zinc-400 cursor-wait' 
                : 'bg-zinc-900 hover:bg-black text-white shadow-sm'
            }`}
            id="login_portal_submit"
          >
            {logging ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => navigate('/register')}
            className="text-[10.5px] font-semibold text-zinc-400 hover:text-zinc-800 transition-colors"
          >
            Nouveau sur Velatra ? Demander l'accès gratuit
          </button>
        </div>

      </div>
    </div>
  );
};
