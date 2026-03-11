import React, { useMemo, useState } from 'react';
import { AppState, Meal } from '../types';
import { Card, Button, Input } from '../components/UI';
import { AppleIcon, TargetIcon, UserIcon } from '../components/Icons';
import { SparklesIcon, RefreshCwIcon } from 'lucide-react';
import { db, doc, updateDoc } from '../firebase';
import { GoogleGenAI } from '@google/genai';

export const MemberNutritionPage: React.FC<{ state: AppState, showToast: (msg: string, type?: 'success' | 'error') => void }> = ({ state, showToast }) => {
  const [generatingMealId, setGeneratingMealId] = useState<string | null>(null);
  const [dietPreference, setDietPreference] = useState<string>("Standard");

  const plan = useMemo(() => {
    return state.nutritionPlans.find(p => p.memberId === state.user?.id);
  }, [state.nutritionPlans, state.user]);

  const planMeals = plan?.meals || [];

  const handleInitializeMeals = async () => {
    if (!plan) return;
    
    // Calculate macros per meal
    // Breakfast: 25%, Lunch: 35%, Snack: 10%, Dinner: 30%
    const meals: Meal[] = [
      {
        id: 'breakfast',
        name: 'Petit-déjeuner',
        description: '',
        calories: Math.round(plan.targetCalories * 0.25),
        protein: Math.round(plan.protein * 0.25),
        carbs: Math.round(plan.carbs * 0.25),
        fat: Math.round(plan.fat * 0.25)
      },
      {
        id: 'lunch',
        name: 'Déjeuner',
        description: '',
        calories: Math.round(plan.targetCalories * 0.35),
        protein: Math.round(plan.protein * 0.35),
        carbs: Math.round(plan.carbs * 0.35),
        fat: Math.round(plan.fat * 0.35)
      },
      {
        id: 'snack',
        name: 'Collation',
        description: '',
        calories: Math.round(plan.targetCalories * 0.10),
        protein: Math.round(plan.protein * 0.10),
        carbs: Math.round(plan.carbs * 0.10),
        fat: Math.round(plan.fat * 0.10)
      },
      {
        id: 'dinner',
        name: 'Dîner',
        description: '',
        calories: Math.round(plan.targetCalories * 0.30),
        protein: Math.round(plan.protein * 0.30),
        carbs: Math.round(plan.carbs * 0.30),
        fat: Math.round(plan.fat * 0.30)
      }
    ];

    try {
      await updateDoc(doc(db, "nutritionPlans", plan.id), { meals, dietPreference });
      showToast("Repas initialisés avec succès !", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'initialisation des repas", "error");
    }
  };

  const handleGenerateMeal = async (meal: Meal) => {
    if (!plan) return;
    setGeneratingMealId(meal.id);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const prompt = `Je suis un(e) ${plan.gender === 'M' ? 'homme' : 'femme'} de ${plan.age} ans, ${plan.weight}kg. Mon objectif est: ${plan.goal}.
Mon régime alimentaire est : ${plan.dietPreference || dietPreference}.
Génère-moi UNE idée de repas pour mon "${meal.name}" qui respecte EXACTEMENT ces macros :
- Calories : ${meal.calories} kcal
- Protéines : ${meal.protein}g
- Glucides : ${meal.carbs}g
- Lipides : ${meal.fat}g

Donne-moi le nom du plat et la recette courte avec les quantités exactes des ingrédients. Ne mets pas de texte d'introduction ou de conclusion, juste le nom du plat en gras, suivi des ingrédients et des instructions rapides.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const newDescription = response.text || "";

      const updatedMeals = planMeals.map(m => 
        m.id === meal.id ? { ...m, description: newDescription } : m
      );

      await updateDoc(doc(db, "nutritionPlans", plan.id), { meals: updatedMeals });
      showToast(`Repas "${meal.name}" généré !`, "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération du repas", "error");
    } finally {
      setGeneratingMealId(null);
    }
  };

  if (!plan) {
    return (
      <div className="space-y-8 page-transition pb-20">
        <div className="flex items-center gap-4 px-1">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-white leading-none">Nutrition</h1>
            <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px] mt-2">Mon Plan Alimentaire</p>
          </div>
        </div>
        <Card className="p-12 text-center bg-white/[0.02] border-white/5">
          <AppleIcon size={48} className="mx-auto text-velatra-textMuted mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">Aucun plan nutritionnel</h3>
          <p className="text-velatra-textMuted text-sm max-w-md mx-auto">
            Votre coach n'a pas encore défini de plan alimentaire pour vous. N'hésitez pas à lui en parler lors de votre prochaine séance.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex items-center gap-4 px-1">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white leading-none">Nutrition</h1>
          <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px] mt-2">Mon Plan Alimentaire</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metrics & Calculations */}
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-velatra-accent/20 to-black border-velatra-accent/30 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-velatra-accent flex items-center gap-2">
              <TargetIcon size={16} /> Objectifs Journaliers
            </h3>

            <div className="flex items-end justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-velatra-textMuted mb-1">Calories Cibles</div>
                <div className="text-4xl font-black text-white tabular-nums leading-none">{plan.targetCalories}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-velatra-textMuted mb-1">Maintien (TDEE)</div>
                <div className="text-xl font-bold text-white/70 tabular-nums">{plan.tdee} kcal</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-blue-400">Protéines</span>
                  <span className="text-white">{plan.protein}g <span className="text-white/30 text-[10px]">({Math.round((plan.protein * 4 / plan.targetCalories) * 100)}%)</span></span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(plan.protein * 4 / plan.targetCalories) * 100}%` }} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-green-400">Glucides</span>
                  <span className="text-white">{plan.carbs}g <span className="text-white/30 text-[10px]">({Math.round((plan.carbs * 4 / plan.targetCalories) * 100)}%)</span></span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${(plan.carbs * 4 / plan.targetCalories) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-yellow-400">Lipides</span>
                  <span className="text-white">{plan.fat}g <span className="text-white/30 text-[10px]">({Math.round((plan.fat * 9 / plan.targetCalories) * 100)}%)</span></span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(plan.fat * 9 / plan.targetCalories) * 100}%` }} />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/[0.02] border-white/5 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-velatra-textDark mb-4 flex items-center gap-2">
              <UserIcon size={16} /> Mon Profil
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Poids</label>
                <div className="text-white font-bold">{plan.weight} kg</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Taille</label>
                <div className="text-white font-bold">{plan.height} cm</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Âge</label>
                <div className="text-white font-bold">{plan.age} ans</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Sexe</label>
                <div className="text-white font-bold">{plan.gender === 'M' ? 'Homme' : 'Femme'}</div>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Niveau d'activité</label>
              <div className="text-white font-bold">{plan.activityLevel}</div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Régime Alimentaire</label>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-velatra-accent"
                value={plan.dietPreference || dietPreference}
                onChange={async (e) => {
                  const newDiet = e.target.value;
                  setDietPreference(newDiet);
                  await updateDoc(doc(db, "nutritionPlans", plan.id), { dietPreference: newDiet });
                }}
              >
                <option value="Standard">Standard</option>
                <option value="Végétarien">Végétarien</option>
                <option value="Vegan">Vegan</option>
                <option value="Sans gluten">Sans gluten</option>
                <option value="Cétogène">Cétogène</option>
                <option value="Pescétarien">Pescétarien</option>
              </select>
            </div>
          </Card>
        </div>

        {/* Right Column: Meals */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
              <AppleIcon size={16} className="text-velatra-accent" /> Mes Repas
            </h3>
            {(planMeals.length === 0 || planMeals.every(m => m.calories === 0)) && (
              <Button onClick={handleInitializeMeals} variant="primary" className="!py-2 !px-4 !text-[10px]">
                INITIALISER MES REPAS
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {planMeals.map((meal) => (
              <Card key={meal.id} className="p-5 bg-white/[0.02] border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-2">
                    <div className="font-bold text-white text-lg">{meal.name}</div>
                    {meal.description ? (
                      <div className="space-y-3">
                        <p className="text-sm text-velatra-textMuted whitespace-pre-wrap">{meal.description}</p>
                        <Button 
                          variant="secondary" 
                          className="!py-1.5 !px-3 !text-[10px] flex items-center gap-1"
                          onClick={() => handleGenerateMeal(meal)}
                          disabled={generatingMealId === meal.id}
                        >
                          {generatingMealId === meal.id ? (
                            <RefreshCwIcon size={12} className="animate-spin" />
                          ) : (
                            <RefreshCwIcon size={12} />
                          )}
                          AUTRE PROPOSITION
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="primary" 
                        className="!py-2 !px-4 !text-[10px] flex items-center gap-2"
                        onClick={() => handleGenerateMeal(meal)}
                        disabled={generatingMealId === meal.id}
                      >
                        {generatingMealId === meal.id ? (
                          <RefreshCwIcon size={14} className="animate-spin" />
                        ) : (
                          <SparklesIcon size={14} />
                        )}
                        GÉNÉRER UN REPAS (IA)
                      </Button>
                    )}
                  </div>
                  
                  <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3 content-start">
                    <div className="space-y-1 bg-black/40 rounded-xl p-3 text-center">
                      <label className="text-[9px] uppercase font-bold text-velatra-textMuted block">Calories</label>
                      <span className="font-bold text-white">{meal.calories}</span>
                    </div>
                    <div className="space-y-1 bg-black/40 rounded-xl p-3 text-center">
                      <label className="text-[9px] uppercase font-bold text-blue-400 block">Protéines</label>
                      <span className="font-bold text-white">{meal.protein}g</span>
                    </div>
                    <div className="space-y-1 bg-black/40 rounded-xl p-3 text-center">
                      <label className="text-[9px] uppercase font-bold text-green-400 block">Glucides</label>
                      <span className="font-bold text-white">{meal.carbs}g</span>
                    </div>
                    <div className="space-y-1 bg-black/40 rounded-xl p-3 text-center">
                      <label className="text-[9px] uppercase font-bold text-yellow-400 block">Lipides</label>
                      <span className="font-bold text-white">{meal.fat}g</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            
            {planMeals.length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                <p className="text-velatra-textMuted text-sm">Aucun repas défini dans ce plan.</p>
              </div>
            )}
          </div>
          
          {/* Meal Totals vs Target */}
          {planMeals.length > 0 && (
            <Card className="p-4 bg-black border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
                <div className="text-velatra-textMuted uppercase tracking-widest">Total Repas</div>
                <div className="flex gap-6">
                  <div className={`${planMeals.reduce((sum, m) => sum + m.calories, 0) > plan.targetCalories ? 'text-red-400' : 'text-white'}`}>
                    {planMeals.reduce((sum, m) => sum + m.calories, 0)} / {plan.targetCalories} kcal
                  </div>
                  <div className="text-blue-400">{planMeals.reduce((sum, m) => sum + m.protein, 0)}g P</div>
                  <div className="text-green-400">{planMeals.reduce((sum, m) => sum + m.carbs, 0)}g G</div>
                  <div className="text-yellow-400">{planMeals.reduce((sum, m) => sum + m.fat, 0)}g L</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
