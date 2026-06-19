import React, { useState } from 'react';
import { Card, Button, Input } from './UI';
import { db, setDoc, doc, auth, createUserWithEmailAndPassword } from '../firebase';
import { ShieldAlert, Club as ClubIcon, Mail, User, Lock, MapPin } from 'lucide-react';

interface ClubRegistrationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const ClubRegistration: React.FC<ClubRegistrationProps> = ({
  onSuccess,
  onCancel
}) => {
  const [clubName, setClubName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClubRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName || !ownerName || !email || !password) return;

    setLoading(true);
    setError("");

    try {
      // 1. Create coach account in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const clubId = `club_${Date.now()}`;

      // 2. Create club entry in Firestore
      const newClub = {
        id: clubId,
        name: clubName,
        ownerId: uid,
        email: email,
        phone: "",
        address: address,
        description: "Enregistrement de club en ligne",
        horaires: "Lun-Dim: 06:00 - 23:00",
        createdAt: new Date().toLocaleDateString(),
        plan: 'basic'
      };

      await setDoc(doc(db, "clubs", clubId), newClub);

      // 3. Create coach user linked to club
      const newCoachUser = {
        id: Date.now(),
        clubId: clubId,
        code: "COACH",
        pwd: password,
        name: ownerName,
        email: email,
        phone: "",
        role: "owner" as const,
        avatar: "",
        gender: "M" as const,
        age: 30,
        weight: 80,
        height: 180,
        objectifs: ["Performance sportive"],
        notes: "Propriétaire fondateur",
        createdAt: new Date().toLocaleDateString(),
        xp: 100,
        streak: 1,
        pointsFidelite: 0,
        firebaseUid: uid
      };

      await setDoc(doc(db, "users", uid), newCoachUser);
      onSuccess();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Impossible d'enregistrer le club.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-6 bg-zinc-950/80 border border-zinc-900 mx-auto select-none">
      <form onSubmit={handleClubRegister} className="space-y-4">
        <div className="text-center pb-2">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <ClubIcon className="w-5 h-5 text-emerald-400" />
            Créer un espace Club
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Configurez votre club et commencez à encadrer vos athlètes.</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 text-rose-400 border border-rose-500/15 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="leading-normal">{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Nom du Club / de la Salle</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
              <ClubIcon className="w-4 h-4" />
            </span>
            <Input 
              type="text"
              required
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Ex. Elite Performance Center"
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Adresse Physique</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
              <MapPin className="w-4 h-4" />
            </span>
            <Input 
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex. 14 Rue de la Paix, Paris"
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Nom du Gérant / Coach En Chef</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
              <User className="w-4 h-4" />
            </span>
            <Input 
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ex. Jean Dupont"
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Email Manager</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
                <Mail className="w-4 h-4" />
              </span>
              <Input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex. manager@club.com"
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

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
        </div>

        <div className="pt-4 flex flex-col gap-2">
          <Button 
            type="submit" 
            disabled={loading || !clubName || !ownerName || !email || !password}
            fullWidth
          >
            {loading ? "ENREGISTREMENT EN COURS..." : "CRÉER MON CLUB"}
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
