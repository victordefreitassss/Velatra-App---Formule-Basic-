import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Club, Subscription, Plan, Gender, Goal } from '../types';
import { Button, Input, Card } from './UI';
import { CheckIcon, ArrowRightIcon, ArrowLeftIcon, FileTextIcon, CreditCardIcon } from './Icons';
import { db, doc, updateDoc } from '../firebase';
import SignatureCanvas from 'react-signature-canvas';
import { GOALS } from '../constants';

interface OnboardingProps {
  user: User;
  club: Club | null;
  subscriptions?: Subscription[];
  plans?: Plan[];
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ user, club, subscriptions, plans, onComplete }) => {
  const [step, setStep] = useState(1);
  const [objectives, setObjectives] = useState<string[]>(user.objectifs || []);
  const [injuries, setInjuries] = useState(user.injuries || '');

  const [profile, setProfile] = useState({
    age: user.age === 30 ? '' : user.age?.toString() || '', // Coach default is often 30, leave blank if possible or keep
    gender: user.gender || 'M',
    weight: user.weight === 70 ? '' : user.weight?.toString() || '',
    height: user.height === 175 ? '' : user.height?.toString() || '',
    phone: user.phone || ''
  });

  const [training, setTraining] = useState({
    experienceLevel: user.experienceLevel || "Débutant",
    trainingDays: user.trainingDays || 3,
    sessionDuration: user.sessionDuration || 60,
    equipment: user.equipment || "Salle complète"
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleObjectiveToggle = (obj: string) => {
    if (objectives.includes(obj)) {
      setObjectives(objectives.filter(o => o !== obj));
    } else {
      setObjectives([...objectives, obj]);
    }
  };

  const finishOnboarding = async () => {
    setIsProcessing(true);
    try {
      if (user.firebaseUid) {
        await updateDoc(doc(db, "users", user.firebaseUid), {
          age: Number(profile.age) || 25,
          gender: profile.gender,
          weight: Number(profile.weight) || 70,
          height: Number(profile.height) || 175,
          phone: profile.phone,
          experienceLevel: training.experienceLevel,
          trainingDays: Number(training.trainingDays),
          sessionDuration: Number(training.sessionDuration),
          equipment: training.equipment,
          objectifs: objectives,
          blessures: injuries,
          injuries: injuries, // sync both fields for consistency
          onboardingCompleted: true,
          paymentStatus: 'active'
        });
      }
      onComplete();
    } catch (err) {
      console.error("Error saving onboarding data:", err);
      setError("Erreur lors de l'enregistrement.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-zinc-900 mb-2">Bienvenue {user.name} !</h2>
              <p className="text-zinc-500">Pour personnaliser votre expérience, complétons votre profil.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Sexe</label>
                <div className="flex gap-2">
                  <Button 
                    variant={profile.gender === 'M' ? 'primary' : 'secondary'} 
                    onClick={() => setProfile({...profile, gender: 'M'})} 
                    className="flex-1"
                  >
                    Homme
                  </Button>
                  <Button 
                    variant={profile.gender === 'F' ? 'primary' : 'secondary'} 
                    onClick={() => setProfile({...profile, gender: 'F'})} 
                    className="flex-1"
                  >
                    Femme
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Âge</label>
                <Input type="number" placeholder="Ex: 28" value={profile.age} onChange={(e) => setProfile({...profile, age: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Poids (kg)</label>
                <Input type="number" placeholder="Ex: 75" value={profile.weight} onChange={(e) => setProfile({...profile, weight: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Taille (cm)</label>
                <Input type="number" placeholder="Ex: 180" value={profile.height} onChange={(e) => setProfile({...profile, height: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-zinc-700 mb-1">Téléphone</label>
                <Input type="tel" placeholder="Votre numéro de téléphone" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} />
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-zinc-900 mb-2">Vos Objectifs</h2>
              <p className="text-zinc-500">Quels sont vos objectifs principaux avec Velatra ?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GOALS.map(obj => (
                <button
                  key={obj}
                  onClick={() => handleObjectiveToggle(obj)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left ${
                    objectives.includes(obj) 
                      ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500' 
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-500 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{obj}</span>
                    {objectives.includes(obj) && <CheckIcon size={20} />}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-zinc-900 mb-2">Condition Physique & Entraînement</h2>
              <p className="text-zinc-500">Aidez-nous à adapter vos séances.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Niveau d'expérience</label>
                <select 
                  value={training.experienceLevel}
                  onChange={(e) => setTraining({...training, experienceLevel: e.target.value as any})}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                >
                  <option value="Débutant">Débutant (Jamais pratiqué ou peu)</option>
                  <option value="Intermédiaire">Intermédiaire (Pratique régulière 1-2 ans)</option>
                  <option value="Avancé">Avancé (Pratique depuis plusieurs années)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Séances / Semaine</label>
                  <Input type="number" min="1" max="7" value={training.trainingDays} onChange={(e) => setTraining({...training, trainingDays: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Durée (min)</label>
                  <Input type="number" min="15" max="180" step="15" value={training.sessionDuration} onChange={(e) => setTraining({...training, sessionDuration: Number(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Équipement à disposition</label>
                <select 
                  value={training.equipment}
                  onChange={(e) => setTraining({...training, equipment: e.target.value as any})}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                >
                  <option value="Salle complète">Salle de sport complète</option>
                  <option value="Haltères/Kettlebells">Haltères et Kettlebells uniquement</option>
                  <option value="Élastiques">Élastiques de résistance</option>
                  <option value="Poids du corps">Poids du corps uniquement</option>
                </select>
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-zinc-900 mb-2">Santé & Antécédents</h2>
              <p className="text-zinc-500">Avez-vous des blessures ou des contraintes médicales dont votre coach doit avoir connaissance ?</p>
            </div>
            <textarea
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="Ex: Douleur à l'épaule droite, entorse cheville il y a 2 ans..."
              className="w-full h-40 p-4 rounded-2xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
            />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress Bar */}
      <div className="h-2 bg-zinc-100 w-full fixed top-0 left-0 z-50">
        <motion.div 
          className="h-full bg-emerald-500"
          initial={{ width: '0%' }}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 mt-8">
        <div className="w-full max-w-2xl bg-zinc-50 border border-zinc-200 rounded-[40px] shadow-xl p-8 md:p-12 relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          <div className="mt-12 flex items-center justify-between pt-6 border-t border-zinc-200">
            {step > 1 ? (
              <Button variant="secondary" onClick={handlePrev} disabled={isProcessing}>
                <ArrowLeftIcon size={20} className="mr-2" /> Retour
              </Button>
            ) : (
              <div></div>
            )}
            
            {step < totalSteps ? (
              <Button 
                onClick={handleNext} 
                disabled={(step === 2 && objectives.length === 0)}
              >
                Continuer <ArrowRightIcon size={20} className="ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={finishOnboarding} 
                disabled={isProcessing}
                className="bg-emerald-500 text-zinc-900 hover:bg-emerald-500/90"
              >
                {isProcessing ? 'Enregistrement...' : 'Terminer mon profil'} <CheckIcon size={20} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
