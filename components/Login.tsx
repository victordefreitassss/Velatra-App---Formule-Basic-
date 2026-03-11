
import React, { useState } from 'react';
import { Card, Input, Button } from './UI';
import { RegistrationForm } from './RegistrationForm';
import { ClubRegistration } from './ClubRegistration';
import { 
  auth, 
  signInWithEmailAndPassword 
} from '../firebase';

const AppLogo = () => (
  <div className="flex flex-col items-center">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-velatra-accent rounded-xl flex items-center justify-center shadow-inner">
        <span className="font-black text-white text-2xl tracking-tighter">V</span>
      </div>
      <div className="font-display font-bold text-5xl tracking-tight leading-none text-white">VELA<span className="text-velatra-accent">TRA</span></div>
    </div>
    <div className="text-[10px] tracking-[6px] text-velatra-textDark font-bold uppercase mt-3 opacity-80 pl-2">PERFORMANCE SaaS</div>
  </div>
);

export const Login: React.FC<{ onLogin: any, onRegister: any }> = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'discovery' | 'club_register'>('login');
  const [isCoachMode, setIsCoachMode] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pwd) return;
    
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, pwd);
    } catch (err: any) {
      setError(isCoachMode ? "Code d'accès incorrect." : "Identifiants invalides.");
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'register') {
    return <RegistrationForm onRegister={() => setMode('login')} onCancel={() => setMode('login')} />;
  }

  if (mode === 'club_register') {
    return <ClubRegistration onSuccess={() => setMode('login')} onCancel={() => setMode('login')} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-transparent relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-velatra-accent/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-[380px] space-y-10 py-12 animate-in fade-in duration-1000 relative z-10">
        <div className="text-center">
          <AppLogo />
          <p className="text-[10px] uppercase tracking-[6px] text-velatra-accent font-bold mt-8 opacity-90">
            {isCoachMode ? "ESPACE COACHING PRIVÉ" : "AUTHENTIFICATION ATHLÈTE"}
          </p>
        </div>

        <Card className={`!p-8 space-y-6 border-white/5 ring-1 transition-all duration-500 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] bg-black/40 backdrop-blur-3xl ${isCoachMode ? 'ring-velatra-accent/40 bg-velatra-accent/5' : 'ring-white/10'}`}>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {!isCoachMode ? (
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest font-bold text-velatra-textDark ml-1">Email</label>
                <Input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="!bg-white/[0.03] !border-white/5" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest font-bold text-velatra-accent ml-1">Email Coach</label>
                <Input type="email" placeholder="coach@votreclub.com" value={email} onChange={e => setEmail(e.target.value)} required className="!bg-white/[0.03] !border-white/5 focus:!ring-velatra-accent/20" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-widest font-bold text-velatra-textDark ml-1">Mot de passe</label>
              <Input type="password" placeholder="••••••••" value={pwd} onChange={e => setPwd(e.target.value)} required className="!bg-white/[0.03] !border-white/5" />
            </div>
            
            {error && <p className="text-[10px] text-red-400 font-bold text-center bg-red-400/10 py-2.5 rounded-xl border border-red-400/20 leading-snug">{error}</p>}
            
            <Button type="submit" fullWidth disabled={loading} className="!py-4 shadow-xl mt-2">
              {loading ? "VÉRIFICATION..." : "DÉVERROUILLER"}
            </Button>
          </form>

          <div className="flex flex-col gap-5 text-center pt-4">
            {!isCoachMode && (
              <>
                <button onClick={() => setMode('register')} className="text-[10px] font-bold text-velatra-textDark hover:text-white transition-colors tracking-widest uppercase">
                  Pas encore membre ? <span className="text-white underline ml-1">S'inscrire</span>
                </button>
                <button onClick={() => setMode('club_register')} className="text-[10px] font-bold text-velatra-accent hover:text-white transition-colors tracking-widest uppercase mt-2">
                  Vous êtes un coach ou gérant ? <span className="text-white underline ml-1">Créer un club</span>
                </button>
              </>
            )}
            <button onClick={() => setIsCoachMode(!isCoachMode)} className="text-[10px] font-bold tracking-[4px] py-3 px-6 rounded-full border border-white/10 text-velatra-textDark hover:text-velatra-accent hover:border-velatra-accent/30 transition-all uppercase mx-auto">
              {isCoachMode ? "Retour Membre" : "Accès Coach"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
