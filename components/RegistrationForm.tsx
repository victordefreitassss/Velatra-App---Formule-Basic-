
import React, { useState } from 'react';
import { Card, Input, Button } from './UI';
import { ChevronLeftIcon, TargetIcon, InfoIcon } from './Icons';
import { Goal, Gender, User } from '../types';
import { GOALS } from '../constants';
import { auth, db, createUserWithEmailAndPassword, doc, setDoc, getDoc } from '../firebase';

interface RegistrationFormProps {
  onRegister: () => void;
  onCancel: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister, onCancel }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    clubId: "",
    age: 25,
    weight: 70,
    height: 175,
    gender: "M" as Gender,
    objectifs: [] as Goal[],
    notes: "",
    experienceLevel: "Débutant" as 'Débutant' | 'Intermédiaire' | 'Avancé',
    trainingDays: 3,
    sessionDuration: 60,
    equipment: "Salle complète" as 'Salle complète' | 'Haltères/Kettlebells' | 'Poids du corps' | 'Élastiques',
    injuries: ""
  });

  const handleSubmit = async () => {
    if (!formData.email || !formData.password || !formData.name || !formData.clubId) {
      alert("Veuillez remplir tous les champs, y compris le code du club.");
      return;
    }
    setLoading(true);
    try {
      // 1. Check if club exists
      const clubDoc = await getDoc(doc(db, "clubs", formData.clubId));
      if (!clubDoc.exists()) {
        alert("Ce code de club n'existe pas.");
        setLoading(false);
        return;
      }

      // 2. Création du compte Auth
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // 3. Création du profil Firestore
      const newUser: User = {
        id: Date.now(),
        clubId: formData.clubId,
        code: formData.email.split('@')[0],
        pwd: "", 
        name: formData.name,
        role: "member", // Default to member for registration form
        avatar: formData.name.substring(0, 2).toUpperCase(),
        gender: formData.gender,
        age: formData.age,
        weight: formData.weight,
        height: formData.height,
        objectifs: formData.objectifs,
        notes: formData.notes,
        experienceLevel: formData.experienceLevel,
        trainingDays: formData.trainingDays,
        sessionDuration: formData.sessionDuration,
        equipment: formData.equipment,
        injuries: formData.injuries,
        createdAt: new Date().toISOString(),
        xp: 0,
        streak: 0,
        pointsFidelite: 0,
        firebaseUid: user.uid
      };
      
      await setDoc(doc(db, "users", user.uid), newUser);
      onRegister();
    } catch (error: any) {
      alert("Erreur lors de la création : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const toggleGoal = (goal: Goal) => {
    setFormData(prev => ({
      ...prev,
      objectifs: prev.objectifs.includes(goal) 
        ? prev.objectifs.filter(g => g !== goal)
        : [...prev.objectifs, goal]
    }));
  };

  return (
    <div className="max-w-[420px] mx-auto w-full page-transition py-10 px-4">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={step === 1 ? onCancel : prevStep} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
          <ChevronLeftIcon size={28} />
        </button>
        <div>
          <h2 className="text-2xl font-black tracking-tight">Inscription</h2>
          <p className="text-[10px] uppercase tracking-[3px] text-velatra-accent font-black">Étape {step} sur 4</p>
        </div>
      </div>

      <Card className="p-8 border-zinc-200 ring-1 ring-zinc-200 shadow-2xl">
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Nom Complet</label>
              <Input placeholder="Jean Dupont" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Email professionnel</label>
              <Input type="email" placeholder="votre@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Choisir un mot de passe</label>
              <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Code d'accès du club (6 chiffres)</label>
              <Input placeholder="Ex: 482910" value={formData.clubId} onChange={e => setFormData({...formData, clubId: e.target.value.toUpperCase()})} />
            </div>
            <Button fullWidth onClick={nextStep} className="!py-4" disabled={!formData.email || !formData.password || formData.password.length < 6 || !formData.name || !formData.clubId}>CONTINUER</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl text-[10px] flex items-start gap-2 border border-blue-100">
              <InfoIcon size={14} className="shrink-0 mt-0.5" />
              <p>Ces informations (âge, sexe, poids, taille) permettront à votre coach de calculer précisément vos besoins nutritionnels.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Âge</label>
                <Input type="number" value={formData.age || ''} onChange={e => setFormData({...formData, age: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Genre</label>
                <div className="flex gap-2">
                  <button onClick={() => setFormData({...formData, gender: 'M'})} className={`flex-1 py-3.5 rounded-xl border font-black text-[10px] tracking-widest transition-all ${formData.gender === 'M' ? 'bg-velatra-accent border-velatra-accent text-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}>HOMME</button>
                  <button onClick={() => setFormData({...formData, gender: 'F'})} className={`flex-1 py-3.5 rounded-xl border font-black text-[10px] tracking-widest transition-all ${formData.gender === 'F' ? 'bg-velatra-accent border-velatra-accent text-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}>FEMME</button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Poids (kg)</label>
                <Input type="number" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Taille (cm)</label>
                <Input type="number" value={formData.height || ''} onChange={e => setFormData({...formData, height: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <Button fullWidth onClick={nextStep} className="!py-4">CONTINUER</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1 flex items-center gap-2"><TargetIcon size={14} className="text-velatra-accent" /> Mes Objectifs</label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map(goal => (
                  <button key={goal} onClick={() => toggleGoal(goal)} className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-tighter border transition-all ${formData.objectifs.includes(goal) ? 'bg-velatra-accent border-velatra-accent text-zinc-900 shadow-lg' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}>{goal}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1 flex items-center gap-2"><InfoIcon size={14} className="text-velatra-accent" /> Antécédents / Santé</label>
              <textarea className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-900 focus:outline-none focus:border-velatra-accent h-24 resize-none" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Blessures, pathologies..." />
            </div>
            <Button fullWidth onClick={nextStep} className="!py-4">CONTINUER</Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Niveau d'expérience</label>
              <div className="flex gap-2">
                {['Débutant', 'Intermédiaire', 'Avancé'].map(level => (
                  <button key={level} onClick={() => setFormData({...formData, experienceLevel: level as any})} className={`flex-1 py-3 rounded-xl border font-black text-[10px] tracking-widest transition-all ${formData.experienceLevel === level ? 'bg-velatra-accent border-velatra-accent text-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}>{level}</button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Jours / Semaine</label>
                <Input type="number" min="1" max="7" value={formData.trainingDays || ''} onChange={e => setFormData({...formData, trainingDays: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Durée (min)</label>
                <Input type="number" step="15" value={formData.sessionDuration || ''} onChange={e => setFormData({...formData, sessionDuration: parseInt(e.target.value) || 0})} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1">Équipement disponible</label>
              <div className="grid grid-cols-2 gap-2">
                {['Salle complète', 'Haltères/Kettlebells', 'Poids du corps', 'Élastiques'].map(eq => (
                  <button key={eq} onClick={() => setFormData({...formData, equipment: eq as any})} className={`py-3 px-2 rounded-xl border font-black text-[9px] tracking-widest transition-all ${formData.equipment === eq ? 'bg-velatra-accent border-velatra-accent text-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}>{eq}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-900 tracking-widest ml-1 flex items-center gap-2"><InfoIcon size={14} className="text-velatra-accent" /> Blessures / Douleurs</label>
              <textarea className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-900 focus:outline-none focus:border-velatra-accent h-20 resize-none" value={formData.injuries} onChange={e => setFormData({...formData, injuries: e.target.value})} placeholder="Ex: Douleur épaule droite, genou fragile..." />
            </div>

            <Button fullWidth onClick={handleSubmit} variant="success" className="!py-4 shadow-xl shadow-emerald-500/20" disabled={loading}>
              {loading ? "CRÉATION EN COURS..." : "REJOINDRE LE CLUB"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
