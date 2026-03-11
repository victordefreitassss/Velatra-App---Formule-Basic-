
import React, { useState } from 'react';
import { Card, Input, Button } from './UI';
import { auth, db, createUserWithEmailAndPassword, setDoc, doc, getDoc } from '../firebase';
import { Club, User } from '../types';

interface ClubRegistrationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const ClubRegistration: React.FC<ClubRegistrationProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [clubName, setClubName] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName || !clubCode || !email || !password || !ownerName) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formattedClubCode = clubCode.toUpperCase().replace(/\s+/g, '');
      
      // Check if club code already exists
      const clubDoc = await getDoc(doc(db, "clubs", formattedClubCode));
      if (clubDoc.exists()) {
        setError("Ce code de club est déjà utilisé. Veuillez en choisir un autre.");
        setLoading(false);
        return;
      }

      // 1. Create Firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUid = userCredential.user.uid;

      // 2. Create Club Document
      const clubId = formattedClubCode;
      const newClub: Club = {
        id: clubId,
        name: clubName,
        ownerId: firebaseUid,
        email: email,
        phone: "",
        address: "",
        description: `Bienvenue chez ${clubName}`,
        horaires: "",
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "clubs", clubId), newClub);

      // 3. Create User Document (Owner)
      const newUser: User = {
        id: Date.now(),
        clubId: clubId,
        code: email.split('@')[0],
        pwd: "", // We use Firebase Auth
        name: ownerName,
        role: "owner",
        avatar: ownerName.substring(0, 2).toUpperCase(),
        gender: "M",
        age: 30,
        weight: 80,
        height: 180,
        objectifs: ["Performance sportive"],
        notes: "Propriétaire du club",
        createdAt: new Date().toISOString(),
        xp: 0,
        streak: 0,
        pointsFidelite: 0,
        firebaseUid: firebaseUid
      };
      await setDoc(doc(db, "users", firebaseUid), newUser);

      onSuccess();
    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#050505]">
      <div className="w-full max-w-[400px] space-y-8 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white italic tracking-tighter">CRÉER VOTRE <span className="text-velatra-accent">CLUB</span></h2>
          <p className="text-velatra-textMuted text-xs mt-2 uppercase tracking-widest font-bold">Lancez votre plateforme SaaS Fitness</p>
        </div>

        <Card className="p-8 space-y-6 border-white/5 ring-1 ring-white/10">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-velatra-textDark ml-1">Nom du Club / Studio</label>
              <Input placeholder="Ex: Elite Fitness Studio" value={clubName} onChange={e => setClubName(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-velatra-textDark ml-1">Code d'accès du club (pour vos membres)</label>
              <Input placeholder="Ex: ELITEFIT" value={clubCode} onChange={e => setClubCode(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-velatra-textDark ml-1">Nom du Responsable</label>
              <Input placeholder="Votre nom complet" value={ownerName} onChange={e => setOwnerName(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-velatra-textDark ml-1">Email Professionnel</label>
              <Input type="email" placeholder="contact@votreclub.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-velatra-textDark ml-1">Mot de passe</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && <p className="text-[10px] text-velatra-accent font-bold text-center bg-velatra-accent/5 py-2 rounded-lg">{error}</p>}

            <Button type="submit" fullWidth disabled={loading} className="!py-4 shadow-xl">
              {loading ? "CRÉATION EN COURS..." : "CRÉER MON ESPACE"}
            </Button>
          </form>

          <button onClick={onCancel} className="w-full text-[9px] font-black text-velatra-textDark hover:text-white transition-colors tracking-widest uppercase text-center">
            Retour à la connexion
          </button>
        </Card>
      </div>
    </div>
  );
};
