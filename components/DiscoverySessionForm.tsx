import React, { useState } from 'react';
import { Card, Input, Button } from './UI';
import { ChevronLeftIcon, CheckIcon } from './Icons';
import { AddressAutocomplete } from './AddressAutocomplete';
import { addDoc, collection, doc, getDoc, db } from '../firebase';

interface Props {
  onCancel: () => void;
  onSuccess: () => void;
}

export const DiscoverySessionForm: React.FC<Props> = ({ onCancel, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clubCode, setClubCode] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    phone: "",
    age: "",
    gender: "",
    profession: "",
    condition: "",
    weight: "",
    height: "",
    ailments: [] as string[],
    medicalTreatments: "",
    goals: [] as string[],
    obj1: "",
    obj2: "",
    whenResults: "",
    trigger: "",
    vision6Months: [] as string[],
    determination: 0,
    supporter: "",
    sleep: "",
    stress: "",
    water: "",
    habits: [] as string[],
    currentSport: "",
    diet: "",
    dietConstraints: "",
    frequency: "",
    whenStart: "",
    availability: {} as Record<string, boolean>,
    source: ""
  });

  const GOALS_LIST = [
    "Perte de poids - Amincissement", "Renforcement musculaire",
    "Tonification musculaire", "Prendre soin de moi - Sport santé bien-être",
    "Préparation physique", "Traiter ma posture", "Musculature profonde",
    "Prévenir le stress / pression pro", "Retrouver confiance en moi",
    "Me dépasser", "M'éclater", "Augmenter mon endurance",
    "Augmenter mon énergie / vitalité", "Améliorer mon souffle et mon cœur",
    "Me transformer physiquement"
  ];

  const updateForm = (key: keyof typeof formData, val: any) => {
    setFormData(p => ({ ...p, [key]: val }));
  };

  const toggleArray = (field: 'ailments' | 'goals' | 'vision6Months' | 'habits', val: string) => {
    setFormData(p => {
       const arr = p[field];
       if (arr.includes(val)) return { ...p, [field]: arr.filter(x => x !== val) };
       return { ...p, [field]: [...arr, val] };
    });
  };

  const handleSubmit = async () => {
    if (!clubCode || !/^\d{6}$/.test(clubCode)) {
      alert("Veuillez saisir un code club valide (6 chiffres).");
      return;
    }
    if (!formData.name || !formData.email) {
      alert("Le nom et l'email sont obligatoires.");
      return;
    }

    setLoading(true);
    try {
      const clubDoc = await getDoc(doc(db, "clubs", clubCode));
      if (!clubDoc.exists()) {
        alert("Ce code de club n'existe pas.");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "prospects"), {
        clubId: clubCode,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        date: new Date().toISOString(),
        status: 'pending',
        answers: { ...formData }
      });
      alert("Demande envoyée ! Le club prendra contact avec vous rapidement.");
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#0D1117] p-3 sm:p-4 pb-20 items-center animate-in fade-in">
      <div className="w-full max-w-md md:max-w-lg bg-[#161B22] rounded-2xl md:rounded-3xl p-5 md:p-8 border border-zinc-800 shadow-2xl mt-4 md:mt-10 mb-8">
        <div className="flex justify-between items-center bg-[#0D1117]/80 p-3 sm:p-4 rounded-xl border border-zinc-800/80 mb-6 sm:mb-8 sticky top-4 z-10 backdrop-blur-md">
           <div className="flex gap-2 sm:gap-4 items-center min-w-0">
             <button type="button" onClick={step === 1 ? onCancel : () => setStep(step - 1)} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition shrink-0">
               <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
             </button>
             <div className="min-w-0">
                <h1 className="text-white font-bold tracking-wider uppercase text-[10px] sm:text-sm truncate">Séance Découverte</h1>
                <div className="flex items-center gap-2 mt-1 sm:mt-2">
                  <div className="w-20 sm:w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}></div>
                  </div>
                </div>
             </div>
           </div>
           <div className="px-2 sm:px-3 py-1 bg-emerald-500/10 text-emerald-400 font-bold rounded-lg text-[9px] sm:text-xs uppercase tracking-wider whitespace-nowrap ml-2 shrink-0">
             Étape {step} / 5
           </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h2 className="text-xl md:text-2xl text-white font-bold mb-5">Ton Identité</h2>
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-4">
               <label className="text-sm font-medium text-orange-400 block mb-2">Code accès de votre Club</label>
               <Input placeholder="Ex: 123456" value={clubCode} onChange={e => setClubCode(e.target.value)} type="text" className="bg-[#0D1117] border-orange-500/30 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:!border-orange-500/50 focus:!ring-orange-500/20" />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Nom Complet</label>
                <Input placeholder="Jean Dupont" value={formData.name} onChange={e => updateForm('name', e.target.value)} type="text" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Ton Email</label>
                <Input placeholder="jean@exemple.fr" value={formData.email} onChange={e => updateForm('email', e.target.value)} type="email" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Adresse Postale</label>
                <AddressAutocomplete placeholder="Tapez votre adresse..." value={formData.address} onChange={(val) => updateForm('address', val)} className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Ton Téléphone</label>
                <Input placeholder="06 12 34 56 78" value={formData.phone} onChange={e => updateForm('phone', e.target.value)} type="tel" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 <div>
                   <label className="text-sm font-medium text-zinc-300 block mb-2">Ton Âge</label>
                   <Input placeholder="ex: 30" value={formData.age} onChange={e => updateForm('age', e.target.value)} type="number" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
                 </div>
                 <div>
                   <label className="text-sm font-medium text-zinc-300 block mb-2">Sexe</label>
                   <select className="w-full bg-[#0D1117] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 appearance-none outline-none" value={formData.gender} onChange={e => updateForm('gender', e.target.value)}>
                      <option value="">Sélectionner...</option>
                      <option value="Homme">Homme</option>
                      <option value="Femme">Femme</option>
                      <option value="Autre">Autre</option>
                   </select>
                 </div>
                 <div className="col-span-2 md:col-span-1">
                   <label className="text-sm font-medium text-zinc-300 block mb-2">Ta Profession</label>
                   <Input placeholder="Designer" value={formData.profession} onChange={e => updateForm('profession', e.target.value)} type="text" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
                 </div>
              </div>
            </div>
            <div className="pt-6">
              <Button fullWidth onClick={() => setStep(2)}>Suivant</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h2 className="text-xl md:text-2xl text-white font-bold mb-5">Condition Physique</h2>
            <div>
               <label className="text-sm font-medium text-zinc-300 block mb-2">Comment est ta condition physique actuellement ?</label>
               <div className="grid grid-cols-3 gap-2">
                 {['Mauvaise', 'Moyenne', 'Excellente'].map(c => (
                   <button key={c} type="button" onClick={() => updateForm('condition', c)} className={`py-3 rounded-xl border transition-all text-sm ${formData.condition === c ? 'bg-zinc-800 border-zinc-700 text-white font-bold' : 'bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>{c}</button>
                 ))}
               </div>
            </div>
            
            <h2 className="text-xl md:text-2xl text-white font-bold mb-5 mt-8">Morphologie & Santé</h2>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium text-zinc-300 block mb-2">Ton Poids (kg)</label>
                   <Input placeholder="ex: 75" value={formData.weight} onChange={e => updateForm('weight', e.target.value)} type="number" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
                 </div>
                 <div>
                   <label className="text-sm font-medium text-zinc-300 block mb-2">Ta Taille (cm)</label>
                   <Input placeholder="ex: 180" value={formData.height} onChange={e => updateForm('height', e.target.value)} type="number" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
                 </div>
            </div>
            <div>
               <label className="text-sm font-medium text-zinc-300 block mb-2">Tes Antécédents / Contraintes physiques</label>
               <div className="flex flex-wrap gap-2">
                 {['Douleur dos', 'Opération récente', 'Tendinite', 'Arthrose', 'Autre'].map(c => (
                   <button key={c} type="button" onClick={() => toggleArray('ailments', c)} className={`px-4 py-2 rounded-xl border text-sm transition-all ${formData.ailments.includes(c) ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}>{c}</button>
                 ))}
               </div>
            </div>
            <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Médicaments / Traitements en cours</label>
                <textarea placeholder="Indiquez vos traitements..." value={formData.medicalTreatments} onChange={e => updateForm('medicalTreatments', e.target.value)} className="w-full bg-[#0D1117] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none placeholder-zinc-600"></textarea>
            </div>
            <div className="pt-6">
              <Button fullWidth onClick={() => setStep(3)}>Suivant</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h2 className="text-xl md:text-2xl text-white font-bold mb-5">Objectifs</h2>
            <div>
               <label className="text-sm font-medium text-zinc-300 block mb-2">Résultats recherchés (plusieurs sélections possibles)</label>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                 {GOALS_LIST.map(c => (
                   <button key={c} type="button" onClick={() => toggleArray('goals', c)} className={`py-3 px-4 rounded-xl border text-left flex justify-between items-center text-sm transition-all ${formData.goals.includes(c) ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}>
                     <span className="truncate">{c}</span>
                     {formData.goals.includes(c) && <CheckIcon className="w-4 h-4 shrink-0 text-emerald-500" />}
                   </button>
                 ))}
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label className="text-sm font-medium text-zinc-300 block mb-2">Objectif n°1</label>
                 <select className="w-full bg-[#0D1117] border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500 appearance-none" value={formData.obj1} onChange={e => updateForm('obj1', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {formData.goals.map(g => <option key={g} value={g}>{g}</option>)}
                 </select>
              </div>
              <div>
                 <label className="text-sm font-medium text-zinc-300 block mb-2">Objectif n°2 (Optionnel)</label>
                 <select className="w-full bg-[#0D1117] border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500 appearance-none" value={formData.obj2} onChange={e => updateForm('obj2', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {formData.goals.map(g => <option key={g} value={g}>{g}</option>)}
                 </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-2">Quand veux-tu voir les premiers résultats ?</label>
              <Input placeholder="Ex: Dans 1 mois..." value={formData.whenResults} onChange={e => updateForm('whenResults', e.target.value)} type="text" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-2">Quel a été le déclic pour venir nous voir ?</label>
              <textarea placeholder="Racontez-nous..." value={formData.trigger} onChange={e => updateForm('trigger', e.target.value)} className="w-full bg-[#0D1117] border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none placeholder-zinc-600"></textarea>
            </div>
            <div>
               <label className="text-sm font-medium text-zinc-300 block mb-2">Où te vois-tu dans 6 mois ?</label>
               <div className="flex flex-wrap gap-2">
                 {['Silhouette affinée', 'Physique athlétique', 'Plus de masse musculaire', 'Meilleure santé générale', 'Autre'].map(c => (
                   <button key={c} type="button" onClick={() => toggleArray('vision6Months', c)} className={`px-4 py-2 rounded-xl border text-sm transition-all ${formData.vision6Months.includes(c) ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}>{c}</button>
                 ))}
               </div>
            </div>
            <div>
               <label className="text-sm font-medium text-zinc-300 block mb-2">Détermination (1 à 10)</label>
               <div className="flex gap-2 w-full justify-between overflow-x-auto pb-2 scrollbar-none">
                  {[1,2,3,4,5,6,7,8,9,10].map(v => (
                    <button key={v} type="button" onClick={() => updateForm('determination', v)} className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border font-bold transition-all ${formData.determination === v ? 'bg-zinc-700 text-white border-zinc-600' : 'bg-[#0D1117] border-zinc-800 text-zinc-500 hover:text-zinc-300'} `}>{v}</button>
                  ))}
               </div>
            </div>
            <div>
               <label className="text-sm font-medium text-zinc-300 block mb-2">Qui t'encourage dans cette démarche ?</label>
               <div className="flex gap-2">
                 {['Moi', 'Les autres'].map(c => (
                   <button key={c} type="button" onClick={() => updateForm('supporter', c)} className={`px-6 py-3 rounded-xl border text-sm transition-all ${formData.supporter === c ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}>{c}</button>
                 ))}
               </div>
            </div>
            <div className="pt-6">
              <Button fullWidth onClick={() => setStep(4)}>Suivant</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h2 className="text-xl md:text-2xl text-white font-bold mb-5">Mode de vie</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                   <label className="text-sm font-medium text-zinc-300 block mb-2">Sommeil (moy/nuit)</label>
                   <select className="w-full bg-[#0D1117] border border-zinc-800 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:ring-2 focus:ring-emerald-500" value={formData.sleep} onChange={e => updateForm('sleep', e.target.value)}>
                      <option value="">Sélectionner...</option>
                      <option value="< 6h">&lt; 6h</option>
                      <option value="6-8h">6-8h</option>
                      <option value="> 8h">&gt; 8h</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-zinc-300 block mb-2">Stress (1-10)</label>
                   <Input placeholder="ex: 5" value={formData.stress} onChange={e => updateForm('stress', e.target.value)} type="number" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
                 </div>
                 <div>
                   <label className="text-sm font-medium text-zinc-300 block mb-2">Eau (L/jour)</label>
                   <Input placeholder="ex: 1.5" value={formData.water} onChange={e => updateForm('water', e.target.value)} type="number" step="0.1" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
                 </div>
            </div>
            <div>
               <label className="text-sm font-medium text-zinc-300 block mb-2">Habitudes (Tabac, Alcool, etc.)</label>
               <div className="flex flex-wrap gap-2">
                 {['Aucune', 'Tabac', 'Alcool', 'Autre'].map(c => (
                   <button key={c} type="button" onClick={() => toggleArray('habits', c)} className={`px-4 py-2 rounded-xl border text-sm transition-all ${formData.habits.includes(c) ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}>{c}</button>
                 ))}
               </div>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-2">Sport actuel / Activité physique</label>
              <Input placeholder="Ex: Course à pied 1x/semaine" value={formData.currentSport} onChange={e => updateForm('currentSport', e.target.value)} type="text" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label className="text-sm font-medium text-zinc-300 block mb-2">Alimentation actuelle</label>
                 <select className="w-full bg-[#0D1117] border border-zinc-800 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:ring-2 focus:ring-emerald-500" value={formData.diet} onChange={e => updateForm('diet', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    <option value="Équilibrée">Équilibrée</option>
                    <option value="Irrégulière">Irrégulière</option>
                    <option value="Beaucoup de grignotage">Beaucoup de grignotage</option>
                    <option value="Régime spécifique">Régime spécifique</option>
                 </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Contraintes alimentaires</label>
                <Input placeholder="Ex: Allergies, intolérances..." value={formData.dietConstraints} onChange={e => updateForm('dietConstraints', e.target.value)} type="text" className="bg-[#0D1117] border-zinc-800 text-white placeholder-zinc-600 focus:!bg-[#0D1117] focus:!text-white focus:ring-emerald-500/20" />
              </div>
            </div>
            <div className="pt-6">
              <Button fullWidth onClick={() => setStep(5)}>Suivant</Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h2 className="text-xl md:text-2xl text-white font-bold mb-5">Logistique</h2>
            <div>
               <label className="text-sm font-medium text-zinc-300 block mb-2">Fréquence souhaitée (séances/semaine)</label>
               <select className="w-full bg-[#0D1117] border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500 appearance-none" value={formData.frequency} onChange={e => updateForm('frequency', e.target.value)}>
                  <option value="">Sélectionner...</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4+">4+</option>
               </select>
            </div>
            <div>
               <label className="text-sm font-medium text-zinc-300 block mb-2">Si les formules te conviennent, tu souhaites commencer :</label>
               <div className="flex flex-wrap gap-2">
                 {["Aujourd'hui", "Demain", "Semaine prochaine"].map(c => (
                   <button key={c} type="button" onClick={() => updateForm('whenStart', c)} className={`px-4 py-2 rounded-xl text-sm border transition-all ${formData.whenStart === c ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}>{c}</button>
                 ))}
               </div>
            </div>
            <div>
               <label className="text-sm font-medium text-zinc-300 block mb-2">Tes disponibilités</label>
               <div className="bg-[#0D1117] border border-zinc-800 rounded-xl overflow-hidden p-2 sm:p-4">
                 <div className="grid grid-cols-8 gap-1 md:gap-2 text-center text-[10px] md:text-xs font-bold text-zinc-500 mb-2">
                   <div className="text-left">Créneau</div>
                   <div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div><div>D</div>
                 </div>
                 {['Matin', 'Midi', 'A-M', 'Soir'].map(time => (
                   <div key={time} className="grid grid-cols-8 gap-1 md:gap-2 mb-2 items-center">
                     <div className="text-[10px] md:text-xs text-zinc-400 font-medium truncate">{time}</div>
                     {['L','Ma','Me','J','V','S','D'].map(day => {
                       const key = `${day}-${time}`;
                       return (
                         <button 
                           key={key} 
                           type="button" 
                           onClick={() => setFormData(p => ({...p, availability: {...p.availability, [key]: !p.availability[key]}}))}
                           className={`w-full aspect-square rounded-md border transition-colors ${formData.availability[key] ? 'bg-zinc-700 border-zinc-600' : 'bg-[#161B22] border-zinc-800 hover:bg-zinc-800'}`}
                         ></button>
                       )
                     })}
                   </div>
                 ))}
               </div>
            </div>
            <div>
               <label className="text-sm font-medium text-zinc-300 block mb-2">Comment nous as-tu connus ?</label>
               <select className="w-full bg-[#0D1117] border border-zinc-800 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:ring-2 focus:ring-emerald-500" value={formData.source} onChange={e => updateForm('source', e.target.value)}>
                  <option value="">Sélectionner...</option>
                  <option value="Google">Google</option>
                  <option value="Instagram / Facebook">Instagram / Facebook</option>
                  <option value="Bouche à oreille">Bouche à oreille</option>
                  <option value="Je passe devant">Je passe devant</option>
                  <option value="Autre">Autre</option>
               </select>
            </div>
            <div className="pt-6">
              <Button fullWidth onClick={handleSubmit} disabled={loading} className="!py-4 shadow-xl">
                {loading ? "ENVOI EN COURS..." : "VOILÀ C'EST TERMINÉ"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
