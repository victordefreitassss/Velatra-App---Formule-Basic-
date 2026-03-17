import React, { useMemo, useState, useRef } from 'react';
import { AppState, Meal } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { AppleIcon, TargetIcon, UserIcon } from '../components/Icons';
import { SparklesIcon, RefreshCwIcon, CameraIcon } from 'lucide-react';
import { db, doc, updateDoc } from '../firebase';
import { GoogleGenAI } from '@google/genai';

export const MemberNutritionPage: React.FC<{ state: AppState, showToast: (msg: string, type?: 'success' | 'error') => void }> = ({ state, showToast }) => {
  const [generatingMealId, setGeneratingMealId] = useState<string | null>(null);
  const [dietPreference, setDietPreference] = useState<string>("Standard");
  const [scanning, setScanning] = useState(false);
  const [scannedMeal, setScannedMeal] = useState<{mealName: string, calories: number, protein: number, carbs: number, fat: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { inlineData: { mimeType: file.type, data: base64String } },
              { text: "Analyse ce repas. Estime les calories totales, et les macronutriments (protéines, glucides, lipides) en grammes. Réponds uniquement au format JSON avec les clés exactes: mealName, calories, protein, carbs, fat. Ne renvoie que le JSON, sans markdown." }
            ]
          },
          config: {
            responseMimeType: "application/json",
          }
        });

        try {
          const result = JSON.parse(response.text || "{}");
          setScannedMeal(result);
          showToast("Repas analysé avec succès !", "success");
        } catch (parseErr) {
          console.error("Failed to parse JSON:", response.text);
          showToast("Impossible d'analyser le repas. Réessayez.", "error");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de l'analyse du repas", "error");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!plan) {
    return (
      <div className="space-y-8 page-transition pb-20">
        <div className="flex items-center gap-4 px-1">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 leading-none">Nutrition</h1>
            <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px] mt-2">Mon Plan Alimentaire</p>
          </div>
        </div>
        <Card className="p-12 text-center bg-zinc-50 border-zinc-200">
          <AppleIcon size={48} className="mx-auto text-zinc-500 mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-zinc-900 mb-2">Aucun plan nutritionnel</h3>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
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
          <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 leading-none">Nutrition</h1>
          <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px] mt-2">Mon Plan Alimentaire</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metrics & Calculations */}
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-velatra-accent/20 to-zinc-100 border-velatra-accent/30 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-velatra-accent flex items-center gap-2">
              <TargetIcon size={16} /> Objectifs Journaliers
            </h3>

            <div className="flex items-end justify-between border-b border-zinc-200 pb-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Calories Cibles</div>
                <div className="text-4xl font-black text-zinc-900 tabular-nums leading-none">
                  {state.user?.integrations?.appleHealth ? plan.targetCalories + 350 : plan.targetCalories}
                  {state.user?.integrations?.appleHealth && <span className="text-sm font-medium text-[#FF2D55] ml-2">+350</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Maintien (TDEE)</div>
                <div className="text-xl font-bold text-zinc-600 tabular-nums">{plan.tdee} kcal</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-blue-400">Protéines</span>
                  <span className="text-zinc-900">{plan.protein}g <span className="text-zinc-900/30 text-[10px]">({Math.round((plan.protein * 4 / plan.targetCalories) * 100)}%)</span></span>
                </div>
                <div className="h-2 bg-zinc-50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(plan.protein * 4 / plan.targetCalories) * 100}%` }} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-green-400">Glucides</span>
                  <span className="text-zinc-900">{plan.carbs}g <span className="text-zinc-900/30 text-[10px]">({Math.round((plan.carbs * 4 / plan.targetCalories) * 100)}%)</span></span>
                </div>
                <div className="h-2 bg-zinc-50 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${(plan.carbs * 4 / plan.targetCalories) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-yellow-400">Lipides</span>
                  <span className="text-zinc-900">{plan.fat}g <span className="text-zinc-900/30 text-[10px]">({Math.round((plan.fat * 9 / plan.targetCalories) * 100)}%)</span></span>
                </div>
                <div className="h-2 bg-zinc-50 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(plan.fat * 9 / plan.targetCalories) * 100}%` }} />
                </div>
              </div>
            </div>
          </Card>

          {state.user?.integrations?.appleHealth && (
            <Card className="p-6 bg-white border-[#FF2D55]/20 shadow-[0_4px_20px_rgba(255,45,85,0.05)] space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#FF2D55]/10 rounded-lg flex items-center justify-center text-[#FF2D55]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900">Apple Santé</h3>
              </div>
              
              <div className="flex items-end justify-between border-b border-zinc-100 pb-4">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Activité du jour</div>
                  <div className="text-2xl font-black text-[#FF2D55] tabular-nums leading-none">350 <span className="text-sm text-zinc-400 font-medium">kcal brûlées</span></div>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Calories restantes ajustées</div>
                <div className="text-xl font-bold text-zinc-900 tabular-nums">{plan.targetCalories + 350} kcal</div>
                <p className="text-xs text-zinc-400 mt-2 italic">Les calories brûlées ont été ajoutées à votre objectif journalier.</p>
              </div>
            </Card>
          )}

          <Card className="p-6 bg-zinc-50 border-zinc-200 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-4 flex items-center gap-2">
              <UserIcon size={16} /> Mon Profil
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Poids</label>
                <div className="text-zinc-900 font-bold">{plan.weight} kg</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Taille</label>
                <div className="text-zinc-900 font-bold">{plan.height} cm</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Âge</label>
                <div className="text-zinc-900 font-bold">{plan.age} ans</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Sexe</label>
                <div className="text-zinc-900 font-bold">{plan.gender === 'M' ? 'Homme' : 'Femme'}</div>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500">Niveau d'activité</label>
              <div className="text-zinc-900 font-bold">{plan.activityLevel}</div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500">Régime Alimentaire</label>
              <select 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 text-sm focus:outline-none focus:border-velatra-accent"
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
          
          {/* AI Meal Scanner */}
          <Card className="p-6 bg-gradient-to-br from-velatra-accent to-velatra-accentDark text-white border-none shadow-[0_10px_40px_rgba(99,102,241,0.3)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 mb-2">
                  <CameraIcon size={20} /> Scanner un repas (IA)
                </h3>
                <p className="text-sm opacity-80 max-w-sm">
                  Prenez votre assiette en photo, notre IA estime instantanément les calories et les macros.
                </p>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <Button 
                variant="secondary" 
                className="!bg-white !text-velatra-accent hover:!bg-zinc-50 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
              >
                {scanning ? (
                  <><RefreshCwIcon size={16} className="animate-spin mr-2" /> ANALYSE...</>
                ) : (
                  <><CameraIcon size={16} className="mr-2" /> PRENDRE EN PHOTO</>
                )}
              </Button>
            </div>

            {scannedMeal && (
              <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg">{scannedMeal.mealName || 'Repas analysé'}</h4>
                  <Badge variant="success" className="!bg-white !text-velatra-accent">
                    {scannedMeal.calories} kcal
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Protéines</div>
                    <div className="font-bold text-xl">{scannedMeal.protein}g</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Glucides</div>
                    <div className="font-bold text-xl">{scannedMeal.carbs}g</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Lipides</div>
                    <div className="font-bold text-xl">{scannedMeal.fat}g</div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="secondary" className="!py-1.5 !px-3 !text-xs !bg-white/20 hover:!bg-white/30 text-white border-none" onClick={() => setScannedMeal(null)}>
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between px-2 pt-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
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
              <Card key={meal.id} className="p-5 bg-zinc-50 border-zinc-200">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-2">
                    <div className="font-bold text-zinc-900 text-lg">{meal.name}</div>
                    {meal.description ? (
                      <div className="space-y-3">
                        <p className="text-sm text-zinc-500 whitespace-pre-wrap">{meal.description}</p>
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
                    <div className="space-y-1 bg-zinc-50 rounded-xl p-3 text-center">
                      <label className="text-[9px] uppercase font-bold text-zinc-500 block">Calories</label>
                      <span className="font-bold text-zinc-900">{meal.calories}</span>
                    </div>
                    <div className="space-y-1 bg-zinc-50 rounded-xl p-3 text-center">
                      <label className="text-[9px] uppercase font-bold text-blue-400 block">Protéines</label>
                      <span className="font-bold text-zinc-900">{meal.protein}g</span>
                    </div>
                    <div className="space-y-1 bg-zinc-50 rounded-xl p-3 text-center">
                      <label className="text-[9px] uppercase font-bold text-green-400 block">Glucides</label>
                      <span className="font-bold text-zinc-900">{meal.carbs}g</span>
                    </div>
                    <div className="space-y-1 bg-zinc-50 rounded-xl p-3 text-center">
                      <label className="text-[9px] uppercase font-bold text-yellow-400 block">Lipides</label>
                      <span className="font-bold text-zinc-900">{meal.fat}g</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            
            {planMeals.length === 0 && (
              <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl">
                <p className="text-zinc-500 text-sm">Aucun repas défini dans ce plan.</p>
              </div>
            )}
          </div>
          
          {/* Meal Totals vs Target */}
          {planMeals.length > 0 && (
            <Card className="p-4 bg-white border-zinc-200">
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
                <div className="text-zinc-500 uppercase tracking-widest">Total Repas</div>
                <div className="flex gap-6">
                  <div className={`${planMeals.reduce((sum, m) => sum + m.calories, 0) > plan.targetCalories ? 'text-red-400' : 'text-zinc-900'}`}>
                    {planMeals.reduce((sum, m) => sum + m.calories, 0)} / {plan.targetCalories} kcal
                  </div>
                  <div className="text-blue-400">{planMeals.reduce((sum, m) => sum + m.protein, 0)}g P</div>
                  <div className="text-green-400">{planMeals.reduce((sum, m) => sum + m.carbs, 0)}g G</div>
                  <div className="text-yellow-400">{planMeals.reduce((sum, m) => sum + m.fat, 0)}g L</div>
                </div>
              </div>
            </Card>
          )}

          {/* Shopping List */}
          {plan.liste_courses && plan.liste_courses.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                <SparklesIcon size={16} className="text-velatra-accent" /> Liste de Courses
              </h3>
              <Card className="p-6 bg-zinc-50 border-zinc-200">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plan.liste_courses.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm text-zinc-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-velatra-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
