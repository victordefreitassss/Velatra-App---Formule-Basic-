
import React, { useState } from 'react';
import { Card, Input, Button } from './UI';
import { apiFetch, auth, createUserWithEmailAndPassword } from '../firebase';
import { Info } from 'lucide-react';

interface ClubRegistrationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const ClubRegistration: React.FC<ClubRegistrationProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [accountType, setAccountType] = useState<'coach' | 'club'>('coach');
  const [showBetaInfo, setShowBetaInfo] = useState(false);
  
  const [clubName, setClubName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [createdClubId, setCreatedClubId] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName || !email || !password || !ownerName || !inviteCode) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Keep the new session if server-side invitation validation fails so the
      // user can correct the code and retry without creating an orphan account.
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email?.toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error("Un autre compte est déjà connecté. Déconnectez-vous avant de créer ce club.");
      }
      if (!currentUser) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }

      // The server assigns roles and creates both records after verifying this session.
      const response = await apiFetch("/api/register-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubName, ownerName, accountType, inviteCode })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "La création du club a échoué.");
      setCreatedClubId(result.clubId);
    } catch (err: any) {
      console.error("Registration Error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Cette adresse email est déjà utilisée par un autre compte.");
      } else {
        setError(err.message || "Une erreur est survenue lors de l'inscription.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (createdClubId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-transparent">
        <div className="w-full max-w-[400px] space-y-8 py-12">
          <Card className="p-8 space-y-6  ring-1  text-center bg-zinc-50/60 backdrop-blur-3xl">
            <h2 className="text-2xl font-black text-zinc-900 italic tracking-tighter">FÉLICITATIONS !</h2>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Votre espace a été créé avec succès.</p>
            
            <div className="bg-white p-6 rounded-2xl border border-zinc-200">
              <p className="text-[10px] uppercase tracking-widest font-black text-emerald-500 mb-2">
                {accountType === 'coach' ? "VOTRE CODE D'ACCÈS COACH" : "VOTRE CODE D'ACCÈS CLUB"}
              </p>
              <p className="text-4xl font-black tracking-widest text-zinc-900">{createdClubId}</p>
            </div>
            
            <p className="text-xs text-zinc-500">
              {accountType === 'coach' 
                ? "Gardez ce code précieusement. Vos élèves/adhérents en auront besoin pour s'inscrire et vous rejoindre."
                : "Gardez ce code précieusement. Vos adhérents en auront besoin pour s'inscrire et rejoindre votre club."}
            </p>
            
            <Button fullWidth onClick={onSuccess} className="!py-4 shadow-xl mt-4">
              ACCÉDER À MON ESPACE
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-transparent">
      <div className="w-full max-w-[400px] space-y-8 py-12 animate-in fade-in duration-500">
        <div className="text-center">
          <h2 className="text-3xl font-black text-zinc-900 italic tracking-tighter uppercase">
            Créer votre <span className="text-emerald-500">{accountType === 'coach' ? "Espace Coach" : "Espace Club"}</span>
          </h2>
          <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest font-bold">Lancez votre plateforme SaaS Fitness</p>
          <div className="bg-red-500/10 text-red-500 p-2.5 text-[10px] uppercase font-bold mt-4 rounded-xl border border-red-500/20">
            Réservé au coach et club. Ne pas utiliser si vous êtes adhérent.
          </div>
        </div>

        <Card className="p-8 space-y-6  ring-1  bg-zinc-50/60 backdrop-blur-3xl">
          {/* Sélectionneur Coach / Club */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-200/50 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAccountType('coach');
                setError("");
              }}
              className={`py-2 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all ${
                accountType === 'coach'
                  ? 'bg-emerald-500 text-white shadow-sm font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Coach
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountType('club');
                setError("");
              }}
              className={`py-2 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all ${
                accountType === 'club'
                  ? 'bg-emerald-500 text-white shadow-sm font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Club / Association
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-zinc-500 ml-1">
                {accountType === 'coach' ? "Nom du Coach" : "Nom du Club / Studio"}
              </label>
              <Input 
                placeholder={accountType === 'coach' ? "Ex: Pierre L. Coaching" : "Ex: Elite Fitness Studio"} 
                value={clubName} 
                onChange={e => setClubName(e.target.value)} 
                required 
                className="!bg-white border-zinc-200" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-zinc-500 ml-1">Nom du Responsable</label>
              <Input placeholder="Votre nom complet" value={ownerName} onChange={e => setOwnerName(e.target.value)} required className="!bg-white border-zinc-200" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-zinc-500 ml-1">Email Professionnel</label>
              <Input type="email" placeholder="contact@votreclub.com" value={email} onChange={e => setEmail(e.target.value)} required className="!bg-zinc-50 border-zinc-200" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-zinc-500 ml-1">Mot de passe</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="!bg-zinc-50 border-zinc-200" />
            </div>

            <div className="space-y-1 relative group/tooltip">
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-[9px] uppercase tracking-widest font-black text-emerald-500 ml-1">
                  Code d'invitation (Bêta)
                </label>
                <button
                  type="button"
                  onClick={() => setShowBetaInfo(!showBetaInfo)}
                  className="text-emerald-500 hover:text-emerald-600 transition-colors p-0.5 rounded focus:outline-none"
                  title="Qu'est-ce que c'est ?"
                >
                  <Info size={11} className="inline-block shrink-0" />
                </button>
                
                {/* Desktop hover tooltip */}
                <span className="hidden md:inline-block pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-900 text-white text-[10px] p-2.5 rounded-xl shadow-lg leading-normal opacity-0 group-hover\/tooltip:opacity-100 transition-opacity duration-300 z-50">
                  Le code bêta valide votre participation exclusive à la phase de test Velatra. Contactez-nous pour en obtenir un.
                </span>
              </div>
              
              <Input 
                placeholder="Code requis" 
                value={inviteCode} 
                onChange={e => setInviteCode(e.target.value)} 
                required 
                className="!bg-white border-emerald-500/30 focus:border-emerald-500" 
              />
              
              {/* Mobile expansion tooltip info box */}
              {showBetaInfo && (
                <div className="p-3 bg-emerald-50 border border-emerald-100/50 rounded-xl text-[10px] text-emerald-800 leading-normal mt-1 animate-in fade-in duration-200">
                  <strong>Code Validation Bêta requise</strong><br />
                  Ce code sécurise l'accès de création de club/coach sur Velatra pendant notre programme pilote fermé. Entrez votre code d'activation fourni par notre équipe.
                </div>
              )}
            </div>

            {error && <p className="text-[10px] text-emerald-500 font-bold text-center bg-emerald-500/5 py-2 rounded-lg">{error}</p>}

            <Button type="submit" fullWidth disabled={loading} className="!py-4 shadow-xl">
              {loading ? "CRÉATION EN COURS..." : "CRÉER MON ESPACE"}
            </Button>
          </form>

          <button onClick={onCancel} className="w-full text-[9px] font-black text-zinc-500 hover:text-zinc-900 transition-colors tracking-widest uppercase text-center">
            Retour à la connexion
          </button>
        </Card>
      </div>
    </div>
  );
};
