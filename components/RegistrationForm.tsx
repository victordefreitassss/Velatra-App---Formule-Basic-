import React, { useState } from 'react';
import { Card, Button, Input } from './UI';
import { 
  auth, db, doc, setDoc, createUserWithEmailAndPassword 
} from '../firebase';
import { UserCheck, Mail, Lock, User as UserIcon, ShieldAlert } from 'lucide-react';

interface RegistrationFormProps {
  onRegister: () => void;
  onCancel: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onRegister,
  onCancel
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setLoading(true);
    setError("");

    try {
      // Create user credential in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Save user profile object in Firestore users collection
      const newUserDoc = {
        id: Date.now(),
        clubId: "velatra_default_club",
        code: Math.floor(1000 + Math.random() * 9000).toString(),
        pwd: password,
        name: name,
        email: email,
        phone: "",
        onboardingCompleted: false,
        paymentStatus: 'active' as const,
        role: 'member' as const,
        avatar: "",
        gender: "M" as const,
        age: Number(age),
        weight: 75,
        height: 178,
        objectifs: ["Sport santé bien-être"],
        notes: "",
        createdAt: new Date().toLocaleDateString(),
        xp: 0,
        streak: 1,
        pointsFidelite: 0,
        firebaseUid: uid
      };

      await setDoc(doc(db, "users", uid), newUserDoc);
      onRegister();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Impossible de compléter l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-6 bg-zinc-950/80 border border-zinc-900 mx-auto select-none">
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="text-center pb-2">
          <h2 className="text-lg font-bold text-white tracking-tight">Rejoindre l'Equipe</h2>
          <p className="text-xs text-zinc-500 mt-1">Crée ton profil athlète pour démarrer ton entraînement.</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 text-rose-400 border border-rose-500/15 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="leading-normal">{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Nom Complet</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
              <UserIcon className="w-4 h-4" />
            </span>
            <Input 
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Thomas Dubois"
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Adresse Email</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
              <Mail className="w-4 h-4" />
            </span>
            <Input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex. thomas@db.com"
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Mot de passe</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
                <Lock className="w-4 h-4" />
              </span>
              <Input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Âge actuel</label>
            <Input 
              type="number"
              required
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              min={12}
              max={100}
              disabled={loading}
            />
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-2">
          <Button 
            type="submit" 
            disabled={loading || !email || !password || !name}
            fullWidth
          >
            {loading ? "CRÉATION EN COURS..." : "S'INSCRIRE"}
          </Button>

          <Button 
            variant="ghost" 
            fullWidth 
            onClick={onCancel}
            disabled={loading}
          >
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  );
};
