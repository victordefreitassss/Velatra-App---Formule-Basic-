
import React, { useState } from 'react';
import { Card, Input, Button } from './UI';
import { ChevronLeftIcon, TargetIcon, InfoIcon } from './Icons';
import { Goal, Gender } from '../types';
import { GOALS } from '../constants';
import { apiFetch, auth, createUserWithEmailAndPassword } from '../firebase';

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
    if (!formData.email.trim() || !formData.password || !formData.name.trim() || !formData.clubId) {
      alert("Veuillez remplir tous les champs, y compris le code du club.");
      return;
    }

    if (!/^\d{6}$/.test(formData.clubId)) {
      alert("Le code du club doit contenir exactement 6 chiffres.");
      return;
    }

    setLoading(true);
    try {
      // Create the Auth account first, then let the trusted server validate the
      // club and create a profile with a server-controlled member ID.
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email?.toLowerCase() !== formData.email.trim().toLowerCase()) {
        throw new Error("Un autre compte est déjà connecté. Déconnectez-vous avant de vous inscrire.");
      }
      if (!currentUser) {
        await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      }
      const response = await apiFetch('/api/register-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: formData.clubId,
          name: formData.name,
          age: formData.age,
          weight: formData.weight,
          height: formData.height,
          gender: formData.gender,
          objectifs: formData.objectifs,
          notes: formData.notes,
          experienceLevel: formData.experienceLevel,
          trainingDays: formData.trainingDays,
          sessionDuration: formData.sessionDuration,
          equipment: formData.equipment,
          injuries: formData.injuries
        })
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "L'inscription n'a pas pu être finalisée.");
      }
      onRegister();
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        alert("Cette adresse email est déjà utilisée par un autre compte.");
      } else {
        alert(error.message || "Une erreur est survenue lors de la création du compte.");
      }
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
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Inscription</h2>
          <p className="text-[10px] uppercase tracking-[3px] text-emerald-500 font-black">Étape {step} sur 4</p>
        </div>
      </div>

      <Card className="p-8  ring-1  shadow-2xl bg-zinc-50/60 backdrop-blur-3xl">
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Nom Complet</label>
              <Input placeholder="Jean Dupont" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Email professionnel</label>
              <Input type="email" placeholder="votre@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Choisir un mot de passe</label>
              <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 ml-1">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Code d'accès du club (6 chiffres)</label>
                <div className="relative group flex items-center">
                  <div className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-500 flex items-center justify-center text-[10px] font-black cursor-help hover:bg-emerald-500 hover:text-white transition-colors">i</div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-zinc-900 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-center shadow-xl pointer-events-none">
                    Demandez ce code à 6 caractères à votre coach ou à l'accueil de votre club pour lier votre compte.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900"></div>
                  </div>
                </div>
              </div>
              <Input placeholder="Ex: 482910" value={formData.clubId} onChange={e => setFormData({...formData, clubId: e.target.value.toUpperCase()})} />
            </div>
            <Button fullWidth onClick={nextStep} className="!py-4" disabled={!formData.email || !formData.password || formData.password.length < 6 || !formData.name || !formData.clubId}>CONTINUER</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl text-[10px] flex items-start gap-2 border border-blue-500/20">
              <InfoIcon size={14} className="shrink-0 mt-0.5" />
              <p>Ces informations (âge, sexe, poids, taille) permettront à votre coach de calculer précisément vos besoins nutritionnels.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Âge</label>
                <Input type="number" value={formData.age || ''} onChange={e => setFormData({...formData, age: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Genre</label>
                <div className="flex gap-2">
                  <button onClick={() => setFormData({...formData, gender: 'M'})} className={`flex-1 py-3.5 rounded-xl border font-black text-[10px] tracking-widest transition-all ${formData.gender === 'M' ? 'bg-emerald-500 border-emerald-500 text-zinc-900' : 'bg-white border-zinc-200 text-zinc-500'}`}>HOMME</button>
                  <button onClick={() => setFormData({...formData, gender: 'F'})} className={`flex-1 py-3.5 rounded-xl border font-black text-[10px] tracking-widest transition-all ${formData.gender === 'F' ? 'bg-emerald-500 border-emerald-500 text-zinc-900' : 'bg-white border-zinc-200 text-zinc-500'}`}>FEMME</button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Poids (kg)</label>
                <Input type="number" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Taille (cm)</label>
                <Input type="number" value={formData.height || ''} onChange={e => setFormData({...formData, height: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <Button fullWidth onClick={nextStep} className="!py-4">CONTINUER</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1 flex items-center gap-2"><TargetIcon size={14} className="text-emerald-500" /> Mes Objectifs</label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map(goal => (
                  <button key={goal} onClick={() => toggleGoal(goal)} className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-tighter border transition-all ${formData.objectifs.includes(goal) ? 'bg-emerald-500 border-emerald-500 text-zinc-900 shadow-lg' : 'bg-white border-zinc-200 text-zinc-500'}`}>{goal}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1 flex items-center gap-2"><InfoIcon size={14} className="text-emerald-500" /> Antécédents / Santé</label>
              <textarea className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500 h-24 resize-none shadow-sm" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Blessures, pathologies..." />
            </div>
            <Button fullWidth onClick={nextStep} className="!py-4">CONTINUER</Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Niveau d'expérience</label>
              <div className="flex gap-2">
                {['Débutant', 'Intermédiaire', 'Avancé'].map(level => (
                  <button key={level} onClick={() => setFormData({...formData, experienceLevel: level as any})} className={`flex-1 py-3 rounded-xl border font-black text-[10px] tracking-widest transition-all ${formData.experienceLevel === level ? 'bg-emerald-500 border-emerald-500 text-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-500'}`}>{level}</button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Jours / Semaine</label>
                <Input type="number" min="1" max="7" value={formData.trainingDays || ''} onChange={e => setFormData({...formData, trainingDays: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Durée (min)</label>
                <Input type="number" step="15" value={formData.sessionDuration || ''} onChange={e => setFormData({...formData, sessionDuration: parseInt(e.target.value) || 0})} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Équipement disponible</label>
              <div className="grid grid-cols-2 gap-2">
                {['Salle complète', 'Haltères/Kettlebells', 'Poids du corps', 'Élastiques'].map(eq => (
                  <button key={eq} onClick={() => setFormData({...formData, equipment: eq as any})} className={`py-3 px-2 rounded-xl border font-black text-[9px] tracking-widest transition-all ${formData.equipment === eq ? 'bg-emerald-500 border-emerald-500 text-zinc-900' : 'bg-white border-zinc-200 text-zinc-500'}`}>{eq}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1 flex items-center gap-2"><InfoIcon size={14} className="text-emerald-500" /> Blessures / Douleurs</label>
              <textarea className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500 h-20 resize-none shadow-sm" value={formData.injuries} onChange={e => setFormData({...formData, injuries: e.target.value})} placeholder="Ex: Douleur épaule droite, genou fragile..." />
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
