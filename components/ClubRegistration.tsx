
import React, { useState } from 'react';
import { Card, Input, Button } from './UI';
import { auth, db, createUserWithEmailAndPassword, setDoc, doc, getDoc, getDocs, query, collection, where } from '../firebase';
import { Club, User } from '../types';

interface ClubRegistrationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const ClubRegistration: React.FC<ClubRegistrationProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
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

    if (inviteCode.toLowerCase() !== "velatra2026") {
      setError("Code d'invitation invalide. L'inscription est actuellement sur invitation uniquement.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Generate a unique 6-digit club code
      let generatedClubCode = "";
      let isUnique = false;
      while (!isUnique) {
        generatedClubCode = Math.floor(100000 + Math.random() * 900000).toString();
        const clubDoc = await getDoc(doc(db, "clubs", generatedClubCode));
        if (!clubDoc.exists()) {
          isUnique = true;
        }
      }

      // 1. Create Firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUid = userCredential.user.uid;

      // 2. Create Club Document
      const clubId = generatedClubCode;
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
        code: "", // Not used anymore
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

      setCreatedClubId(clubId);
    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  if (createdClubId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-50">
        <div className="w-full max-w-[400px] space-y-8 py-12">
          <Card className="p-8 space-y-6 border-zinc-200 ring-1 ring-zinc-200 text-center">
            <h2 className="text-2xl font-black text-zinc-900 italic tracking-tighter">FÉLICITATIONS !</h2>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Votre espace a été créé avec succès.</p>
            
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200">
              <p className="text-[10px] uppercase tracking-widest font-black text-velatra-accent mb-2">VOTRE CODE D'ACCÈS CLUB</p>
              <p className="text-4xl font-black tracking-widest text-zinc-900">{createdClubId}</p>
            </div>
            
            <p className="text-xs text-zinc-500">Gardez ce code précieusement. Vos adhérents en auront besoin pour s'inscrire et rejoindre votre club.</p>
            
            <Button fullWidth onClick={onSuccess} className="!py-4 shadow-xl mt-4">
              ACCÉDER À MON ESPACE
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-50">
      <div className="w-full max-w-[400px] space-y-8 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-black text-zinc-900 italic tracking-tighter">CRÉER VOTRE <span className="text-velatra-accent">CLUB</span></h2>
          <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest font-bold">Lancez votre plateforme SaaS Fitness</p>
        </div>

        <Card className="p-8 space-y-6 border-zinc-200 ring-1 ring-zinc-200">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-zinc-900 ml-1">Nom du Club / Studio</label>
              <Input placeholder="Ex: Elite Fitness Studio" value={clubName} onChange={e => setClubName(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-zinc-900 ml-1">Nom du Responsable</label>
              <Input placeholder="Votre nom complet" value={ownerName} onChange={e => setOwnerName(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-zinc-900 ml-1">Email Professionnel</label>
              <Input type="email" placeholder="contact@votreclub.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-zinc-900 ml-1">Mot de passe</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-black text-velatra-accent ml-1">Code d'invitation (Bêta)</label>
              <Input placeholder="Code requis" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required className="border-velatra-accent/30 focus:border-velatra-accent" />
            </div>

            {error && <p className="text-[10px] text-velatra-accent font-bold text-center bg-velatra-accent/5 py-2 rounded-lg">{error}</p>}

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
