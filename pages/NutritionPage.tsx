import React, { useState, useMemo, useEffect } from 'react';
import { AppState, User, NutritionPlan, ActivityLevel, Goal, Gender, Meal } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { AppleIcon, PlusIcon, SearchIcon, SaveIcon, UserIcon, TargetIcon, FlameIcon, ChevronLeftIcon, Trash2Icon } from '../components/Icons';
import { db, doc, setDoc } from '../firebase';
import { SparklesIcon, RefreshCwIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { MemberNutritionView } from '../components/MemberNutritionView';
import { motion, AnimatePresence } from 'framer-motion';

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

const containerVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const NutritionPage: React.FC<{ state: AppState, setState: any, showToast: (msg: string, type?: 'success' | 'error') => void }> = ({ state, setState, showToast }) => {
  if (state.user?.role === 'member') {
    return <MemberNutritionView state={state} showToast={showToast} />;
  }

  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('Tous');
  
  // Form state
  const [weight, setWeight] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [age, setAge] = useState<number>(0);
  const [gender, setGender] = useState<Gender>('M');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('Modérément actif');
  const [goal, setGoal] = useState<Goal>('Sport santé bien-être');
  const [dietPreference, setDietPreference] = useState<string>('Standard');
  const [durationWeeks, setDurationWeeks] = useState<number>(4);
  
  const [isSaving, setIsSaving] = useState(false);

  const members = useMemo(() => {
    return state.users.filter(u => {
      if (u.role !== 'member') return false;
      if (!u.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      const hasPlan = state.nutritionPlans.some(p => p.memberId === Number(u.id));
      if (filterPlan === 'Avec Plan' && !hasPlan) return false;
      if (filterPlan === 'Sans Plan' && hasPlan) return false;
      
      return true;
    });
  }, [state.users, searchTerm, filterPlan, state.nutritionPlans]);

  const [targetCalories, setTargetCalories] = useState<number>(0);
  const [protein, setProtein] = useState<number>(0);
  const [carbs, setCarbs] = useState<number>(0);
  const [fat, setFat] = useState<number>(0);

  const handleSelectMember = (member: User) => {
    setSelectedMember(member);
    
    // Load existing plan or initialize from user data
    const existingPlan = state.nutritionPlans.find(p => p.memberId === Number(member.id));
    
    if (existingPlan) {
      setWeight(existingPlan.weight || member.weight || 70);
      setHeight(existingPlan.height || member.height || 175);
      setAge(existingPlan.age || member.age || 30);
      setGender(existingPlan.gender || member.gender || 'M');
      setActivityLevel(existingPlan.activityLevel || 'Modérément actif');
      setGoal(existingPlan.goal || member.objectifs?.[0] || 'Sport santé bien-être');
      setDietPreference(existingPlan.dietPreference || 'Standard');
      setDurationWeeks(existingPlan.durationWeeks || 4);
      setTargetCalories(existingPlan.targetCalories || 0);
      setProtein(existingPlan.protein || 0);
      setCarbs(existingPlan.carbs || 0);
      setFat(existingPlan.fat || 0);
    } else {
      setWeight(member.weight || 70);
      setHeight(member.height || 175);
      setAge(member.age || 30);
      setGender(member.gender || 'M');
      setGoal(member.objectifs?.[0] || 'Sport santé bien-être');
      setDietPreference('Standard');
      setDurationWeeks(4);
      setTargetCalories(0);
      setProtein(0);
      setCarbs(0);
      setFat(0);
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
    return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.2));
  }, [bmr, activityLevel]);

  const handleRecalculate = () => {
    const newTargetCalories = tdee + (GOAL_ADJUSTMENTS[goal] || 0);
    setTargetCalories(newTargetCalories);

    let proteinMultiplier = 1.6;
    if (goal === 'Prise de masse' || goal === 'Renforcement musculaire') proteinMultiplier = 1.8;
    if (goal === 'Perte de poids') proteinMultiplier = 2.0;
    
    const newProtein = Math.round(weight * proteinMultiplier);
    const proteinCals = newProtein * 4;
    
    let fatPercentage = 0.30;
    if (goal === 'Perte de poids') fatPercentage = 0.35;
    
    const newFat = Math.round((newTargetCalories * fatPercentage) / 9);
    const fatCals = newFat * 9;
    
    const carbsCals = newTargetCalories - proteinCals - fatCals;
    const newCarbs = Math.max(0, Math.round(carbsCals / 4));

    setProtein(newProtein);
    setFat(newFat);
    setCarbs(newCarbs);
  };

  // Auto-calculate if 0
  useEffect(() => {
    if (targetCalories === 0 && tdee > 0) {
      handleRecalculate();
    }
  }, [tdee, targetCalories]);

  const handleSavePlan = async () => {
    if (!selectedMember || !state.user?.clubId) return;
    setIsSaving(true);
    
    try {
      const existingPlan = state.nutritionPlans.find(p => p.memberId === Number(selectedMember.id));
      const planId = existingPlan?.id?.toString() || Date.now().toString();
      
      let updatedMeals = existingPlan?.meals || [];
      if (updatedMeals.length > 0 && existingPlan) {
        const oldCals = existingPlan.targetCalories || 1;
        const oldProt = existingPlan.protein || 1;
        const oldCarbs = existingPlan.carbs || 1;
        const oldFat = existingPlan.fat || 1;

        updatedMeals = updatedMeals.map(m => ({
          ...m,
          calories: Math.round((m.calories / oldCals) * targetCalories),
          protein: Math.round((m.protein / oldProt) * protein),
          carbs: Math.round((m.carbs / oldCarbs) * carbs),
          fat: Math.round((m.fat / oldFat) * fat),
        }));
      }

      const planData: NutritionPlan = {
        id: planId,
        memberId: Number(selectedMember.id),
        clubId: state.user.clubId,
        createdAt: existingPlan?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        weight,
        height,
        age,
        gender,
        activityLevel,
        goal,
        dietPreference,
        durationWeeks,
        bmr,
        tdee,
        targetCalories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        meals: updatedMeals,
        liste_courses: existingPlan?.liste_courses || [],
        aiGenerated: existingPlan?.aiGenerated || false
      };
      
      await setDoc(doc(db, "nutritionPlans", planId.toString()), planData);
      
      // Update local state is handled by onSnapshot in App.tsx
      showToast("Plan nutritionnel enregistré avec succès !");
    } catch (error) {
      console.error("Error saving nutrition plan", error);
      showToast("Erreur lors de l'enregistrement du plan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const weeklyLogs = useMemo(() => {
    if (!selectedMember) return [];
    const today = new Date();
    const logs = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = state.nutritionLogs.find(l => l.userId === Number(selectedMember.id) && l.date === dateStr);
      
      const totalCals = log?.foods.reduce((sum, f) => sum + f.calories, 0) || 0;
      const totalProt = log?.foods.reduce((sum, f) => sum + f.protein, 0) || 0;
      const totalCarbs = log?.foods.reduce((sum, f) => sum + f.carbs, 0) || 0;
      const totalFat = log?.foods.reduce((sum, f) => sum + f.fat, 0) || 0;
      
      logs.push({
        date: dateStr,
        dayName: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        totalCals,
        totalProt,
        totalCarbs,
        totalFat,
        hasLog: !!log && log.foods.length > 0
      });
    }
    return logs;
  }, [selectedMember, state.nutritionLogs]);

  if (selectedMember) {
    const existingPlan = state.nutritionPlans.find(p => p.memberId === Number(selectedMember.id));

    return (
      <motion.div 
        className="space-y-8 pb-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-4 px-1 max-w-4xl mx-auto w-full">
          <button 
            onClick={() => setSelectedMember(null)}
            className="p-2 bg-white backdrop-blur-xl hover:bg-white rounded-full transition-colors text-zinc-500 border border-zinc-200 shadow-sm"
          >
            <ChevronLeftIcon size={20} />
          </button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-zinc-100 border border-zinc-200 flex items-center justify-center font-black text-lg text-emerald-500 shadow-sm overflow-hidden shrink-0">
            {selectedMember.avatar?.startsWith('http') ? (
              <img src={selectedMember.avatar} alt={selectedMember.name} className="w-full h-full object-cover" />
            ) : (
              selectedMember.avatar || selectedMember.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 leading-none">Plan Nutritionnel</h1>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[3px] mt-2">{selectedMember.name}</p>
          </div>
          <div className="ml-auto">
            <Button variant="success" onClick={handleSavePlan} disabled={isSaving} className="!rounded-full !py-2 !px-4 shadow-md hover:shadow-lg transition-shadow">
              <SaveIcon size={16} className="mr-2" /> {isSaving ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
            </Button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
          {/* Left Column: Metrics & Calculations */}
          <div className="space-y-6">
            <Card className="p-6 bg-white backdrop-blur-xl  shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-4 flex items-center gap-2">
                <UserIcon size={16} /> Profil Métabolique
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Poids (kg)</label>
                  <Input type="number" value={weight || ''} onChange={e => setWeight(Number(e.target.value) || 0)} className="!py-2 bg-white backdrop-blur-xl  text-zinc-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Taille (cm)</label>
                  <Input type="number" value={height || ''} onChange={e => setHeight(Number(e.target.value) || 0)} className="!py-2 bg-zinc-50 backdrop-blur-xl  text-zinc-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Âge</label>
                  <Input type="number" value={age || ''} onChange={e => setAge(Number(e.target.value) || 0)} className="!py-2 bg-zinc-50 backdrop-blur-xl  text-zinc-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Sexe</label>
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value as Gender)}
                    className="w-full bg-white backdrop-blur-xl border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Niveau d'activité</label>
                <select 
                  value={activityLevel} 
                  onChange={e => setActivityLevel(e.target.value as ActivityLevel)}
                  className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {Object.keys(ACTIVITY_MULTIPLIERS).map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Objectif</label>
                <select 
                  value={goal} 
                  onChange={e => setGoal(e.target.value as Goal)}
                  className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {Object.keys(GOAL_ADJUSTMENTS).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Régime Alimentaire</label>
                <select 
                  className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-emerald-500 transition-colors"
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

              <div className="space-y-1 pt-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Durée (semaines)</label>
                <Input 
                  type="number" 
                  value={durationWeeks} 
                  onChange={e => setDurationWeeks(Number(e.target.value))} 
                  className="bg-zinc-50 backdrop-blur-xl  text-zinc-900"
                  min={1}
                  max={52}
                />
              </div>
            </Card>

            <Card className="p-6 bg-zinc-50 backdrop-blur-xl border-emerald-500/30 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                <TargetIcon size={16} /> Objectifs Journaliers
              </h3>

              <div className="flex items-end justify-between border-b  pb-4">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Calories Cibles</div>
                  <Input 
                    type="number" 
                    value={targetCalories || ''} 
                    onChange={e => setTargetCalories(Number(e.target.value) || 0)} 
                    className="text-4xl font-black text-zinc-900 tabular-nums leading-none !p-0 !bg-transparent border-none focus:ring-0 w-32"
                  />
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Maintien (TDEE)</div>
                  <div className="text-xl font-bold text-zinc-600 tabular-nums">{tdee} kcal</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold items-center">
                    <span className="text-blue-400">Protéines</span>
                    <div className="flex items-center gap-1">
                      <Input 
                        type="number" 
                        value={protein || ''} 
                        onChange={e => setProtein(Number(e.target.value) || 0)} 
                        className="w-16 !py-1 !px-2 text-right text-zinc-900 bg-zinc-50 backdrop-blur-xl "
                      />
                      <span className="text-zinc-500">g</span>
                      <span className="text-zinc-500 text-[10px] w-8 text-right">({targetCalories > 0 ? Math.round((protein * 4 / targetCalories) * 100) : 0}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-50 backdrop-blur-xl rounded-full overflow-hidden border ">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${targetCalories > 0 ? (protein * 4 / targetCalories) * 100 : 0}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full bg-blue-500 rounded-full" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold items-center">
                    <span className="text-emerald-400">Glucides</span>
                    <div className="flex items-center gap-1">
                      <Input 
                        type="number" 
                        value={carbs || ''} 
                        onChange={e => setCarbs(Number(e.target.value) || 0)} 
                        className="w-16 !py-1 !px-2 text-right text-zinc-900 bg-zinc-50 backdrop-blur-xl "
                      />
                      <span className="text-zinc-500">g</span>
                      <span className="text-zinc-500 text-[10px] w-8 text-right">({targetCalories > 0 ? Math.round((carbs * 4 / targetCalories) * 100) : 0}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-50 backdrop-blur-xl rounded-full overflow-hidden border ">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${targetCalories > 0 ? (carbs * 4 / targetCalories) * 100 : 0}%` }}
                      transition={{ duration: 1, delay: 0.4 }}
                      className="h-full bg-emerald-500 rounded-full" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold items-center">
                    <span className="text-orange-400">Lipides</span>
                    <div className="flex items-center gap-1">
                      <Input 
                        type="number" 
                        value={fat || ''} 
                        onChange={e => setFat(Number(e.target.value) || 0)} 
                        className="w-16 !py-1 !px-2 text-right text-zinc-900 bg-zinc-50 backdrop-blur-xl "
                      />
                      <span className="text-zinc-500">g</span>
                      <span className="text-zinc-500 text-[10px] w-8 text-right">({targetCalories > 0 ? Math.round((fat * 9 / targetCalories) * 100) : 0}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-50 backdrop-blur-xl rounded-full overflow-hidden border ">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${targetCalories > 0 ? (fat * 9 / targetCalories) * 100 : 0}%` }}
                      transition={{ duration: 1, delay: 0.6 }}
                      className="h-full bg-orange-500 rounded-full" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t  flex justify-end">
                <Button variant="secondary" onClick={handleRecalculate} className="!py-2 !text-xs bg-zinc-50 backdrop-blur-xl  text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-500">
                  RECALCULER LES MACROS
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Weekly Summary */}
          <div className="space-y-6">
            <Card className="p-6 bg-zinc-50 backdrop-blur-xl  shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                <AppleIcon size={16} className="text-emerald-500" /> Résumé de la semaine
              </h3>
              
              <div className="space-y-3">
                {weeklyLogs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className="bg-zinc-50 backdrop-blur-xl p-3 rounded-xl border border-zinc-200 shadow-sm transition-transform hover:scale-[1.02]"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-bold text-sm text-zinc-900 capitalize">{log.dayName} <span className="text-xs text-zinc-500 font-normal">({log.date.split('-').reverse().join('/')})</span></div>
                      {log.hasLog ? (
                        <Badge variant="success">Complété</Badge>
                      ) : (
                        <Badge variant="dark">Vide</Badge>
                      )}
                    </div>
                    
                    {log.hasLog ? (
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-zinc-50 backdrop-blur-xl rounded-lg p-2 border border-zinc-200 shadow-sm">
                          <div className="text-[10px] uppercase font-bold text-zinc-500">Kcal</div>
                          <div className={`text-xs font-bold ${log.totalCals > targetCalories ? 'text-red-500' : 'text-zinc-900'}`}>{log.totalCals}</div>
                        </div>
                        <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/20 shadow-sm">
                          <div className="text-[10px] uppercase font-bold text-blue-400">Prot</div>
                          <div className="text-xs font-bold text-blue-400">{log.totalProt}g</div>
                        </div>
                        <div className="bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20 shadow-sm">
                          <div className="text-[10px] uppercase font-bold text-emerald-400">Gluc</div>
                          <div className="text-xs font-bold text-emerald-400">{log.totalCarbs}g</div>
                        </div>
                        <div className="bg-orange-500/10 rounded-lg p-2 border border-orange-500/20 shadow-sm">
                          <div className="text-[10px] uppercase font-bold text-orange-400">Lip</div>
                          <div className="text-xs font-bold text-orange-400">{log.totalFat}g</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500 text-center py-2 bg-zinc-50 backdrop-blur-xl rounded-lg border ">
                        Aucun repas enregistré
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </motion.div>

        {existingPlan && existingPlan.meals && existingPlan.meals.length > 0 && (
          <motion.div variants={itemVariants} className="max-w-4xl mx-auto space-y-6 w-full">
            <Card className="p-6 bg-zinc-50 backdrop-blur-xl  shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                <AppleIcon size={16} className="text-emerald-500" /> Plan Alimentaire Généré
              </h3>
              <div className="space-y-4">
                {existingPlan.meals.map((repas: any, idx: number) => {
                  const mealTotalCals = repas.calories || 0;
                  const mealTotalProt = repas.protein || 0;
                  const mealTotalCarbs = repas.carbs || 0;
                  const mealTotalFat = repas.fat || 0;
                  
                  return (
                    <div key={idx} className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-zinc-900">{repas.name}</h4>
                        <div className="text-xs font-bold text-zinc-500 bg-zinc-50 backdrop-blur-xl px-2 py-1 rounded-lg border ">
                          {mealTotalCals} kcal
                        </div>
                      </div>
                      
                      <div className="text-sm text-zinc-500 mb-4 whitespace-pre-wrap">
                        {repas.description}
                      </div>
                      
                      <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                        <div className="text-blue-400">Prot: {mealTotalProt}g</div>
                        <div className="text-emerald-400">Gluc: {mealTotalCarbs}g</div>
                        <div className="text-orange-400">Lip: {mealTotalFat}g</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {existingPlan.liste_courses && existingPlan.liste_courses.length > 0 && (
              <Card className="p-6 bg-zinc-50 backdrop-blur-xl  shadow-sm space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                  🛒 Liste de Courses
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-zinc-500">
                  {existingPlan.liste_courses.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </Card>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-8 pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Nutrition</h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[3px] mt-2">Plans Alimentaires</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        <div className="relative max-w-md">
          <SearchIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text"
            placeholder="Rechercher un membre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-2xl py-3 pl-14 pr-4 text-zinc-900 font-bold focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {["Tous", "Avec Plan", "Sans Plan"].map(f => (
            <button
              key={f}
              onClick={() => setFilterPlan(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shadow-sm ${filterPlan === f ? 'bg-emerald-500 text-zinc-900' : 'bg-zinc-50 backdrop-blur-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 border '}`}
            >
              {f}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <AnimatePresence>
          {members.map(member => {
            const hasPlan = state.nutritionPlans.some(p => p.memberId === Number(member.id));
            
            return (
              <motion.div 
                key={member.id} 
                variants={itemVariants} 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4 }} 
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className="p-5 cursor-pointer hover:border-emerald-500/50 transition-all group bg-zinc-50 backdrop-blur-xl  h-full shadow-sm hover:shadow-md"
                  onClick={() => handleSelectMember(member)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-zinc-100 border border-zinc-200 flex items-center justify-center font-black text-lg text-emerald-500 shadow-sm overflow-hidden">
                      {member.avatar?.startsWith('http') ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        member.avatar || member.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-zinc-900 group-hover:text-emerald-500 transition-colors">{member.name}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                        {hasPlan ? (
                          <span className="text-emerald-400 flex items-center gap-1"><AppleIcon size={10} /> Plan Actif</span>
                        ) : (
                          <span className="opacity-50">Aucun plan</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {members.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500">
            Aucun membre trouvé.
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
