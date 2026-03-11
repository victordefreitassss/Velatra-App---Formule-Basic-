import React, { useState, useMemo } from 'react';
import { AppState, User, NutritionPlan, ActivityLevel, Goal, Gender, Meal } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { AppleIcon, PlusIcon, SearchIcon, SaveIcon, UserIcon, TargetIcon, FlameIcon, ChevronLeftIcon, Trash2Icon } from '../components/Icons';
import { db, doc, setDoc } from '../firebase';
import { SparklesIcon, RefreshCwIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  "Sédentaire": 1.2,
  "Légèrement actif": 1.375,
  "Modérément actif": 1.55,
  "Très actif": 1.725,
  "Extrêmement actif": 1.9
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  "Perte de poids": -400,
  "Prise de masse": 300,
  "Sport santé bien-être": 0,
  "Prépa physique": 0,
  "Remise en forme": -150,
  "Performance sportive": 0,
  "Renforcement musculaire": 150,
  "Souplesse et mobilité": 0,
  "Autre": 0
};

export const NutritionPage: React.FC<{ state: AppState, setState: any, showToast: (msg: string, type?: 'success' | 'error') => void }> = ({ state, setState, showToast }) => {
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [weight, setWeight] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [age, setAge] = useState<number>(0);
  const [gender, setGender] = useState<Gender>('M');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('Modérément actif');
  const [goal, setGoal] = useState<Goal>('Sport santé bien-être');
  const [dietPreference, setDietPreference] = useState<string>('Standard');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [generatingMealId, setGeneratingMealId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  const members = useMemo(() => {
    return state.users.filter(u => u.role === 'member' && u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [state.users, searchTerm]);

  const handleSelectMember = (member: User) => {
    setSelectedMember(member);
    
    // Load existing plan or initialize from user data
    const existingPlan = state.nutritionPlans.find(p => p.memberId === member.id);
    
    if (existingPlan) {
      setWeight(existingPlan.weight);
      setHeight(existingPlan.height);
      setAge(existingPlan.age);
      setGender(existingPlan.gender);
      setActivityLevel(existingPlan.activityLevel);
      setGoal(existingPlan.goal);
      setDietPreference(existingPlan.dietPreference || 'Standard');
      setMeals(existingPlan.meals || []);
    } else {
      setWeight(member.weight || 70);
      setHeight(member.height || 175);
      setAge(member.age || 30);
      setGender(member.gender || 'M');
      setGoal(member.objectifs?.[0] || 'Sport santé bien-être');
      setDietPreference('Standard');
      setMeals([
        { id: Date.now().toString() + '1', name: 'Petit-déjeuner', description: '', calories: 0, protein: 0, carbs: 0, fat: 0 },
        { id: Date.now().toString() + '2', name: 'Déjeuner', description: '', calories: 0, protein: 0, carbs: 0, fat: 0 },
        { id: Date.now().toString() + '3', name: 'Collation', description: '', calories: 0, protein: 0, carbs: 0, fat: 0 },
        { id: Date.now().toString() + '4', name: 'Dîner', description: '', calories: 0, protein: 0, carbs: 0, fat: 0 }
      ]);
    }
  };

  // Calculations
  const bmr = useMemo(() => {
    if (!weight || !height || !age) return 0;
    // Mifflin-St Jeor Equation
    let bmrCalc = (10 * weight) + (6.25 * height) - (5 * age);
    bmrCalc += gender === 'M' ? 5 : -161;
    return Math.round(bmrCalc);
  }, [weight, height, age, gender]);

  const tdee = useMemo(() => {
    return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
  }, [bmr, activityLevel]);

  const targetCalories = useMemo(() => {
    return tdee + GOAL_ADJUSTMENTS[goal];
  }, [tdee, goal]);

  const macros = useMemo(() => {
    // Basic macro split based on goal
    let proteinMultiplier = 1.6; // g per kg of bodyweight
    if (goal === 'Prise de masse' || goal === 'Renforcement musculaire') proteinMultiplier = 1.8;
    if (goal === 'Perte de poids') proteinMultiplier = 2.0; // Higher protein to preserve muscle
    
    const protein = Math.round(weight * proteinMultiplier);
    const proteinCals = protein * 4;
    
    let fatPercentage = 0.30; // 30% of total calories
    if (goal === 'Perte de poids') fatPercentage = 0.35; // Slightly higher fat for satiety
    
    const fat = Math.round((targetCalories * fatPercentage) / 9);
    const fatCals = fat * 9;
    
    const carbsCals = targetCalories - proteinCals - fatCals;
    const carbs = Math.max(0, Math.round(carbsCals / 4));
    
    return { protein, fat, carbs };
  }, [weight, targetCalories, goal]);

  const handleSavePlan = async () => {
    if (!selectedMember || !state.user?.clubId) return;
    setIsSaving(true);
    
    try {
      const planId = state.nutritionPlans.find(p => p.memberId === selectedMember.id)?.id || Date.now().toString();
      
      const planData: NutritionPlan = {
        id: planId,
        memberId: selectedMember.id,
        clubId: state.user.clubId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        weight,
        height,
        age,
        gender,
        activityLevel,
        goal,
        dietPreference,
        bmr,
        tdee,
        targetCalories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        meals
      };
      
      await setDoc(doc(db, "nutritionPlans", planId), planData);
      
      // Update local state is handled by onSnapshot in App.tsx
      showToast("Plan nutritionnel enregistré avec succès !");
    } catch (error) {
      console.error("Error saving nutrition plan", error);
      showToast("Erreur lors de l'enregistrement du plan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInitializeMeals = () => {
    const initializedMeals: Meal[] = [
      {
        id: Date.now().toString() + '1',
        name: 'Petit-déjeuner',
        description: '',
        calories: Math.round(targetCalories * 0.25),
        protein: Math.round(macros.protein * 0.25),
        carbs: Math.round(macros.carbs * 0.25),
        fat: Math.round(macros.fat * 0.25)
      },
      {
        id: Date.now().toString() + '2',
        name: 'Déjeuner',
        description: '',
        calories: Math.round(targetCalories * 0.35),
        protein: Math.round(macros.protein * 0.35),
        carbs: Math.round(macros.carbs * 0.35),
        fat: Math.round(macros.fat * 0.35)
      },
      {
        id: Date.now().toString() + '3',
        name: 'Collation',
        description: '',
        calories: Math.round(targetCalories * 0.10),
        protein: Math.round(macros.protein * 0.10),
        carbs: Math.round(macros.carbs * 0.10),
        fat: Math.round(macros.fat * 0.10)
      },
      {
        id: Date.now().toString() + '4',
        name: 'Dîner',
        description: '',
        calories: Math.round(targetCalories * 0.30),
        protein: Math.round(macros.protein * 0.30),
        carbs: Math.round(macros.carbs * 0.30),
        fat: Math.round(macros.fat * 0.30)
      }
    ];
    setMeals(initializedMeals);
  };

  const handleGenerateMeal = async (meal: Meal) => {
    setGeneratingMealId(meal.id);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const prompt = `Je suis un(e) ${gender === 'M' ? 'homme' : 'femme'} de ${age} ans, ${weight}kg. Mon objectif est: ${goal}.
Mon régime alimentaire est : ${dietPreference}.
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

      setMeals(meals.map(m => 
        m.id === meal.id ? { ...m, description: newDescription } : m
      ));
      showToast(`Repas "${meal.name}" généré !`, "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération du repas", "error");
    } finally {
      setGeneratingMealId(null);
    }
  };

  const updateMeal = (id: string, field: keyof Meal, value: any) => {
    setMeals(meals.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const addMeal = () => {
    setMeals([...meals, { id: Date.now().toString(), name: 'Nouveau Repas', description: '', calories: 0, protein: 0, carbs: 0, fat: 0 }]);
  };

  const removeMeal = (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  if (selectedMember) {
    return (
      <div className="space-y-8 page-transition pb-20">
        <div className="flex items-center gap-4 px-1">
          <button 
            onClick={() => setSelectedMember(null)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <ChevronLeftIcon size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-white leading-none">Plan Nutritionnel</h1>
            <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px] mt-2">{selectedMember.name}</p>
          </div>
          <div className="ml-auto">
            <Button variant="success" onClick={handleSavePlan} disabled={isSaving} className="!rounded-full !py-2 !px-4">
              <SaveIcon size={16} className="mr-2" /> {isSaving ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Metrics & Calculations */}
          <div className="space-y-6">
            <Card className="p-6 bg-white/[0.02] border-white/5 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-velatra-textDark mb-4 flex items-center gap-2">
                <UserIcon size={16} /> Profil Métabolique
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Poids (kg)</label>
                  <Input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} className="!py-2" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Taille (cm)</label>
                  <Input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="!py-2" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Âge</label>
                  <Input type="number" value={age} onChange={e => setAge(Number(e.target.value))} className="!py-2" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Sexe</label>
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value as Gender)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-velatra-accent"
                  >
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Niveau d'activité</label>
                <select 
                  value={activityLevel} 
                  onChange={e => setActivityLevel(e.target.value as ActivityLevel)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-velatra-accent"
                >
                  {Object.keys(ACTIVITY_MULTIPLIERS).map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Objectif</label>
                <select 
                  value={goal} 
                  onChange={e => setGoal(e.target.value as Goal)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-velatra-accent"
                >
                  {Object.keys(GOAL_ADJUSTMENTS).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Régime Alimentaire</label>
                <select 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-velatra-accent"
                  value={dietPreference}
                  onChange={(e) => setDietPreference(e.target.value)}
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

            <Card className="p-6 bg-gradient-to-br from-velatra-accent/20 to-black border-velatra-accent/30 space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-velatra-accent flex items-center gap-2">
                <TargetIcon size={16} /> Objectifs Journaliers
              </h3>

              <div className="flex items-end justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] uppercase font-bold text-velatra-textMuted mb-1">Calories Cibles</div>
                  <div className="text-4xl font-black text-white tabular-nums leading-none">{targetCalories}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-velatra-textMuted mb-1">Maintien (TDEE)</div>
                  <div className="text-xl font-bold text-white/70 tabular-nums">{tdee} kcal</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-blue-400">Protéines</span>
                    <span className="text-white">{macros.protein}g <span className="text-white/30 text-[10px]">({Math.round((macros.protein * 4 / targetCalories) * 100)}%)</span></span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(macros.protein * 4 / targetCalories) * 100}%` }} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-green-400">Glucides</span>
                    <span className="text-white">{macros.carbs}g <span className="text-white/30 text-[10px]">({Math.round((macros.carbs * 4 / targetCalories) * 100)}%)</span></span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(macros.carbs * 4 / targetCalories) * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-yellow-400">Lipides</span>
                    <span className="text-white">{macros.fat}g <span className="text-white/30 text-[10px]">({Math.round((macros.fat * 9 / targetCalories) * 100)}%)</span></span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(macros.fat * 9 / targetCalories) * 100}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Meals */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                <AppleIcon size={16} className="text-velatra-accent" /> Répartition des Repas
              </h3>
              <div className="flex gap-2">
                {(meals.length === 0 || meals.every(m => m.calories === 0)) && (
                  <Button onClick={handleInitializeMeals} variant="primary" className="!py-1.5 !px-3 !text-[10px]">
                    INITIALISER MES REPAS
                  </Button>
                )}
                <Button variant="glass" onClick={addMeal} className="!py-1.5 !px-3 !text-[10px]">
                  <PlusIcon size={14} className="mr-1" /> AJOUTER UN REPAS
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {meals.map((meal, index) => (
                <Card key={meal.id} className="p-5 bg-white/[0.02] border-white/5 relative group">
                  <button 
                    onClick={() => removeMeal(meal.id)}
                    className="absolute top-4 right-4 text-white/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2Icon size={16} />
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4 space-y-3">
                      <Input 
                        value={meal.name} 
                        onChange={e => updateMeal(meal.id, 'name', e.target.value)} 
                        className="!py-2 !font-bold"
                        placeholder="Nom du repas"
                      />
                      <div className="space-y-2">
                        <textarea
                          value={meal.description}
                          onChange={e => updateMeal(meal.id, 'description', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-velatra-accent h-20 resize-none"
                          placeholder="Exemples d'aliments, instructions..."
                        />
                        <Button 
                          variant={meal.description ? "secondary" : "primary"} 
                          className="w-full !py-1.5 !px-3 !text-[10px] flex items-center justify-center gap-2"
                          onClick={() => handleGenerateMeal(meal)}
                          disabled={generatingMealId === meal.id}
                        >
                          {generatingMealId === meal.id ? (
                            <RefreshCwIcon size={12} className="animate-spin" />
                          ) : meal.description ? (
                            <RefreshCwIcon size={12} />
                          ) : (
                            <SparklesIcon size={12} />
                          )}
                          {meal.description ? "AUTRE PROPOSITION" : "GÉNÉRER UN REPAS (IA)"}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3 content-start">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-velatra-textMuted">Calories</label>
                        <Input type="number" value={meal.calories} onChange={e => updateMeal(meal.id, 'calories', Number(e.target.value))} className="!py-2 !text-center" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-blue-400">Protéines (g)</label>
                        <Input type="number" value={meal.protein} onChange={e => updateMeal(meal.id, 'protein', Number(e.target.value))} className="!py-2 !text-center" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-green-400">Glucides (g)</label>
                        <Input type="number" value={meal.carbs} onChange={e => updateMeal(meal.id, 'carbs', Number(e.target.value))} className="!py-2 !text-center" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-yellow-400">Lipides (g)</label>
                        <Input type="number" value={meal.fat} onChange={e => updateMeal(meal.id, 'fat', Number(e.target.value))} className="!py-2 !text-center" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              
              {meals.length === 0 && (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                  <p className="text-velatra-textMuted text-sm">Aucun repas défini.</p>
                </div>
              )}
            </div>
            
            {/* Meal Totals vs Target */}
            {meals.length > 0 && (
              <Card className="p-4 bg-black border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
                  <div className="text-velatra-textMuted uppercase tracking-widest">Total Repas</div>
                  <div className="flex gap-6">
                    <div className={`${meals.reduce((sum, m) => sum + m.calories, 0) > targetCalories ? 'text-red-400' : 'text-white'}`}>
                      {meals.reduce((sum, m) => sum + m.calories, 0)} / {targetCalories} kcal
                    </div>
                    <div className="text-blue-400">{meals.reduce((sum, m) => sum + m.protein, 0)}g P</div>
                    <div className="text-green-400">{meals.reduce((sum, m) => sum + m.carbs, 0)}g G</div>
                    <div className="text-yellow-400">{meals.reduce((sum, m) => sum + m.fat, 0)}g L</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-white leading-none">Nutrition</h1>
          <p className="text-[10px] text-velatra-textDark font-bold uppercase tracking-[3px] mt-2">Plans Alimentaires</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-velatra-textDark" />
        <input 
          type="text"
          placeholder="Rechercher un membre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-velatra-accent transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(member => {
          const hasPlan = state.nutritionPlans.some(p => p.memberId === member.id);
          
          return (
            <Card 
              key={member.id} 
              className="p-5 cursor-pointer hover:border-velatra-accent/50 transition-all group bg-white/[0.02]"
              onClick={() => handleSelectMember(member)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-velatra-accent/20 to-black border border-white/10 flex items-center justify-center font-black text-lg text-velatra-accent">
                  {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : member.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white group-hover:text-velatra-accent transition-colors">{member.name}</div>
                  <div className="text-[10px] text-velatra-textMuted uppercase tracking-widest mt-1">
                    {hasPlan ? (
                      <span className="text-green-400 flex items-center gap-1"><AppleIcon size={10} /> Plan Actif</span>
                    ) : (
                      <span className="opacity-50">Aucun plan</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {members.length === 0 && (
          <div className="col-span-full py-12 text-center text-velatra-textMuted">
            Aucun membre trouvé.
          </div>
        )}
      </div>
    </div>
  );
};
