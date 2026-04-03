
import React, { useState } from 'react';
import { Card, Input, Button } from './UI';
import { RegistrationForm } from './RegistrationForm';
import { ClubRegistration } from './ClubRegistration';
import { 
  auth, 
  db,
  doc,
  getDoc,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from '../firebase';

const AppLogo = () => (
  <div className="flex flex-col items-center">
    <div className="flex items-center gap-3">
      <div className="w-16 h-16 rounded-xl shadow-inner overflow-hidden flex items-center justify-center shrink-0 bg-white">
        <img src="https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png" alt="Velatra Logo" className="w-full h-full object-contain scale-[1.4]" />
      </div>
      <div className="font-display font-bold text-5xl tracking-tight leading-none text-zinc-900">VELA<span className="text-emerald-500">TRA</span></div>
    </div>
    <div className="text-[10px] tracking-[6px] text-zinc-500 font-bold uppercase mt-3 opacity-80 pl-2">PERFORMANCE SaaS</div>
  </div>
);

export const Login: React.FC<{ initialMode?: 'login' | 'register' | 'club_register' }> = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'club_register'>(initialMode);
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
      const userCredential = await signInWithEmailAndPassword(auth, email, pwd);
      
      // Vérifier si le document utilisateur existe toujours (s'il a été supprimé par le coach)
      if (email !== 'victor.defreitas.pro@gmail.com') {
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        if (!userDoc.exists()) {
          await signOut(auth);
          setError("Votre compte a été supprimé ou désactivé par le club.");
          setLoading(false);
          return;
        }
      }
    } catch (err: any) {
      if (email === 'victor.defreitas.pro@gmail.com') {
        try {
          await createUserWithEmailAndPassword(auth, email, pwd);
        } catch (createErr) {
          setError("Identifiants invalides.");
        }
      } else {
        setError("Identifiants invalides.");
      }
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-[380px] space-y-10 py-12 animate-in fade-in duration-1000 relative z-10">
        <div className="text-center">
          <AppLogo />
          <p className="text-[10px] uppercase tracking-[6px] text-emerald-500 font-bold mt-8 opacity-90">
            {isCoachMode ? "ESPACE COACHING PRIVÉ" : "AUTHENTIFICATION ATHLÈTE"}
          </p>
        </div>

        <Card className={`!p-8 space-y-6  ring-1 transition-all duration-500 shadow-2xl bg-zinc-50/60 backdrop-blur-3xl ${isCoachMode ? 'ring-emerald-500/40 bg-emerald-500/5' : ''}`}>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {!isCoachMode ? (
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Email</label>
                <Input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="!bg-white border-zinc-200 text-zinc-900" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest font-bold text-emerald-500 ml-1">Email Coach</label>
                <Input type="email" placeholder="coach@votreclub.com" value={email} onChange={e => setEmail(e.target.value)} required className="!bg-white border-zinc-200 text-zinc-900 focus:!ring-emerald-500/20" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Mot de passe</label>
              <Input type="password" placeholder="••••••••" value={pwd} onChange={e => setPwd(e.target.value)} required className="!bg-white border-zinc-200 text-zinc-900" />
            </div>
            
            {error && <p className="text-[10px] text-red-400 font-bold text-center bg-red-400/10 py-2.5 rounded-xl border border-red-400/20 leading-snug">{error}</p>}
            
            <Button type="submit" fullWidth disabled={loading} className="!py-4 shadow-xl mt-2">
              {loading ? "VÉRIFICATION..." : "DÉVERROUILLER"}
            </Button>
          </form>

          <div className="flex flex-col gap-5 text-center pt-4">
            {!isCoachMode && (
              <>
                <button onClick={() => setMode('register')} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors tracking-widest uppercase">
                  Pas encore membre ? <span className="text-zinc-900 underline ml-1">S'inscrire</span>
                </button>
                <button onClick={() => setMode('club_register')} className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors tracking-widest uppercase mt-2">
                  Vous êtes un coach ou gérant ? <span className="text-emerald-600 underline ml-1">Créer un club</span>
                </button>
              </>
            )}
            <button onClick={() => setIsCoachMode(!isCoachMode)} className="text-[10px] font-bold tracking-[4px] py-3 px-6 rounded-full border border-zinc-200 text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/30 transition-all uppercase mx-auto">
              {isCoachMode ? "Retour Membre" : "Accès Coach"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
