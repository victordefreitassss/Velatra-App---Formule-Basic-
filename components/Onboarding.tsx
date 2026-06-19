import React, { useState } from 'react';
import { User, Club, Subscription, Plan } from '../types';
import { Card, Button, Input, Badge } from './UI';
import { doc, updateDoc, db } from '../firebase';
import { Sparkles, Trophy, Dumbbell, Calendar, ChevronRight, UserCheck } from 'lucide-react';

interface OnboardingProps {
  user: User | null;
  club: Club | null;
  subscriptions: Subscription[];
  plans: Plan[];
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({
  user,
  club,
  subscriptions,
  plans,
  onComplete
}) => {
  const [step, setStep] = useState(1);
  const [weight, setWeight] = useState(user?.weight || 70);
  const [height, setHeight] = useState(user?.height || 175);
  const [age, setAge] = useState(user?.age || 25);
  const [selectedGoal, setSelectedGoal] = useState<string>('Sport santé bien-être');
  const [equipment, setEquipment] = useState<'Salle complète' | 'Haltères/Kettlebells' | 'Poids du corps' | 'Élastiques'>('Salle complète');
  const [experience, setExperience] = useState<'Débutant' | 'Intermédiaire' | 'Avancé'>('Débutant');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleFinishOnboarding();
    }
  };

  const handleFinishOnboarding = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const userRef = doc(db, "users", (user as any).firebaseUid || user.id.toString());
      await updateDoc(userRef, {
        onboardingCompleted: true,
        weight: Number(weight),
        height: Number(height),
        age: Number(age),
        objectifs: [selectedGoal],
        equipment,
        experienceLevel: experience,
      });

      onComplete();
    } catch (e) {
      console.error("Error writing onboarding details:", e);
      // Fallback completion even if firestore fails (network loss)
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070709] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl">
        <Card className="p-6 md:p-8 space-y-6 relative overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.8)] border border-zinc-900 bg-zinc-950/90 backdrop-blur-lg">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {/* STEP 1: WELCOME & PRIMARY PHYSICAL DATA */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white leading-none">
                  Bienvenue chez <span className="text-emerald-400">{club?.name || "VELATRA"}</span> !
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Faisons d'abord connaissance. Renseigne tes mensurations actuelles pour que ton programme soit parfaitement calibré.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Âge</label>
                  <Input 
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    min={1}
                    max={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Poids (kg)</label>
                  <Input 
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    min={30}
                    max={250}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Taille (cm)</label>
                  <Input 
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    min={100}
                    max={250}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: GOAL SELECTOR */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white leading-none">Quel est ton objectif ?</h2>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Choisis l'axe prioritaire vers lequel tu souhaites orienter tes efforts sportifs et nutritionnels.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {[
                  "Perte de poids",
                  "Prise de masse",
                  "Sport santé bien-être",
                  "Prépa physique",
                  "Remise en forme",
                  "Performance sportive"
                ].map((g) => {
                  const selected = selectedGoal === g;
                  return (
                    <button
                      key={g}
                      onClick={() => setSelectedGoal(g)}
                      className={`text-left px-4 py-3 rounded-xl border text-xs font-semibold select-none flex items-center justify-between transition-all ${
                        selected 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                          : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      <span>{g}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: WORKOUT LEVEL & EQUIPMENTS */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
                <Dumbbell className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white leading-none">Ton équipement & niveau</h2>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Dernière étape. Indique sur quel type de matériel tu as accès pour générer tes entraînements.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Matériel Disponible</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "Salle complète" as const, label: "Salle de sport" },
                      { id: "Haltères/Kettlebells" as const, label: "Poids Libres" },
                      { id: "Poids du corps" as const, label: "Poids du Corps" },
                      { id: "Élastiques" as const, label: "Bandes Élastiques" }
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setEquipment(item.id)}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          equipment === item.id 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                            : 'bg-zinc-904 border-zinc-800 text-zinc-450 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Expérience en Musculation</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Débutant", "Intermédiaire", "Avancé"].map((level) => (
                      <button
                        type="button"
                        key={level}
                        onClick={() => setExperience(level as any)}
                        className={`px-3 py-2 rounded-xl border text-[11px] font-semibold text-center transition-all ${
                          experience === level 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold' 
                            : 'bg-zinc-904 border-zinc-800 text-zinc-450 hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-900 gap-4">
            {step > 1 ? (
              <Button 
                variant="outline" 
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
              >
                Retour
              </Button>
            ) : (
              <div /> // placeholder to align next button right
            )}

            <Button 
              disabled={isSubmitting}
              onClick={handleNextStep}
              className="px-6"
            >
              <span>{step === 3 ? (isSubmitting ? "Finalisation..." : "C'est parti !") : "Suivant"}</span>
              <ChevronRight className="w-4 h-4 ml-1.5 shrink-0" />
            </Button>
          </div>

        </Card>
      </div>
    </div>
  );
};
