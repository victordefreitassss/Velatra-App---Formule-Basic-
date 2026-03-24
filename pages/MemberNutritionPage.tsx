import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AppState, Meal, NutritionLog } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { AppleIcon, TargetIcon, UserIcon, PlusIcon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';
import { SparklesIcon, RefreshCwIcon, CameraIcon, Wand2Icon } from 'lucide-react';
import { db, doc, updateDoc, setDoc } from '../firebase';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { estimateFoodMacros } from '../services/aiService';

const containerVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const MemberNutritionPage: React.FC<{ state: AppState, showToast: (msg: string, type?: 'success' | 'error') => void }> = ({ state, showToast }) => {
  const [dietPreference, setDietPreference] = useState<string>("Standard");
  
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [newFood, setNewFood] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);

  const plan = useMemo(() => {
    return state.nutritionPlans.find(p => p.memberId === Number(state.user?.id));
  }, [state.nutritionPlans, state.user]);

  const planMeals = plan?.meals || [];

  const currentLog = useMemo(() => {
    if (!state.user) return null;
    return state.nutritionLogs.find(l => l.userId === Number(state.user!.id) && l.date === currentDate) || {
      id: `${state.user.id}-${currentDate}`,
      clubId: state.user.clubId,
      userId: Number(state.user.id),
      date: currentDate,
      foods: []
    };
  }, [state.nutritionLogs, state.user, currentDate]);

  const totalCalories = currentLog?.foods.reduce((sum, f) => sum + f.calories, 0) || 0;
  const totalProtein = currentLog?.foods.reduce((sum, f) => sum + f.protein, 0) || 0;
  const totalCarbs = currentLog?.foods.reduce((sum, f) => sum + f.carbs, 0) || 0;
  const totalFat = currentLog?.foods.reduce((sum, f) => sum + f.fat, 0) || 0;

  useEffect(() => {
    if (plan && planMeals.length === 0) {
      handleInitializeMeals();
    }
  }, [plan, planMeals.length]);

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

  const handleAddFood = async () => {
    if (!newFood.name || !currentLog) return;
    setIsSaving(true);
    try {
      const updatedLog: NutritionLog = {
        ...currentLog,
        foods: [...currentLog.foods, { ...newFood, id: Date.now().toString() }]
      };
      await setDoc(doc(db, "nutritionLogs", updatedLog.id), updatedLog);
      setNewFood({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
      setIsAdding(false);
      showToast("Aliment ajouté");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'ajout", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoCalculate = async () => {
    if (!newFood.name) {
      showToast("Entrez d'abord le nom de l'aliment", "error");
      return;
    }
    setIsEstimating(true);
    try {
      const result = await estimateFoodMacros(newFood.name);
      setNewFood({
        name: result.name,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat
      });
      showToast("Macros estimées avec succès !");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'estimation", "error");
    } finally {
      setIsEstimating(false);
    }
  };

  const handleDeleteFood = async (foodId: string) => {
    if (!currentLog) return;
    try {
      const updatedLog: NutritionLog = {
        ...currentLog,
        foods: currentLog.foods.filter(f => f.id !== foodId)
      };
      await setDoc(doc(db, "nutritionLogs", updatedLog.id), updatedLog);
      showToast("Aliment supprimé");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la suppression", "error");
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(d.toISOString().split('T')[0]);
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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-velatra-accent flex items-center gap-2">
                <TargetIcon size={16} /> Suivi Journalier
              </h3>
              <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-zinc-200">
                <button onClick={() => changeDate(-1)} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"><ChevronLeftIcon size={14} /></button>
                <span className="text-xs font-bold px-1">{new Date(currentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                <button onClick={() => changeDate(1)} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"><ChevronRightIcon size={14} /></button>
              </div>
            </div>

            <div className="flex items-end justify-between border-b border-zinc-200 pb-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Calories Restantes</div>
                <div className="text-4xl font-black text-zinc-900 tabular-nums leading-none">
                  {Math.max(0, (state.user?.integrations?.appleHealth ? plan.targetCalories + 350 : plan.targetCalories) - totalCalories)}
                  {state.user?.integrations?.appleHealth && <span className="text-sm font-medium text-[#FF2D55] ml-2">+350</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Consommées</div>
                <div className="text-xl font-bold text-zinc-600 tabular-nums">{totalCalories} / {state.user?.integrations?.appleHealth ? plan.targetCalories + 350 : plan.targetCalories}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-blue-400">Protéines</span>
                  <span className="text-zinc-900">{totalProtein}g / {plan.protein}g</span>
                </div>
                <div className="h-2 bg-zinc-50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (totalProtein / plan.protein) * 100)}%` }} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-green-400">Glucides</span>
                  <span className="text-zinc-900">{totalCarbs}g / {plan.carbs}g</span>
                </div>
                <div className="h-2 bg-zinc-50 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (totalCarbs / plan.carbs) * 100)}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-yellow-400">Lipides</span>
                  <span className="text-zinc-900">{totalFat}g / {plan.fat}g</span>
                </div>
                <div className="h-2 bg-zinc-50 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(100, (totalFat / plan.fat) * 100)}%` }} />
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

            <div className="space-y-1 pt-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500">Durée (semaines)</label>
              <div className="text-zinc-900 font-bold">{plan.durationWeeks || 4} semaines</div>
            </div>
          </Card>
        </div>

        {/* Right Column: Meals */}
        <div className="lg:col-span-2 space-y-4">
          


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

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {planMeals.map((meal) => (
              <motion.div key={meal.id} variants={itemVariants}>
                <Card className="p-5 bg-white/60 backdrop-blur-xl border-zinc-200/50 hover:shadow-lg transition-all duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4 space-y-2">
                      <div className="font-bold text-zinc-900 text-lg">{meal.name}</div>
                      <Button 
                        variant="primary" 
                        className="!py-2 !px-4 !text-[10px] flex items-center gap-2 mt-4"
                        onClick={() => {
                          setNewFood({ name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat });
                          setIsAdding(true);
                          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        }}
                      >
                        <AppleIcon size={14} />
                        CE QUE J'AI MANGÉ
                      </Button>
                    </div>
                    
                    <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3 content-start">
                      <div className="space-y-1 bg-white/50 rounded-xl p-3 text-center border border-zinc-200/50">
                        <label className="text-[9px] uppercase font-black text-zinc-500 tracking-widest block">Calories</label>
                        <span className="font-bold text-zinc-900">{meal.calories}</span>
                      </div>
                      <div className="space-y-1 bg-white/50 rounded-xl p-3 text-center border border-zinc-200/50">
                        <label className="text-[9px] uppercase font-black text-blue-400 tracking-widest block">Protéines</label>
                        <span className="font-bold text-zinc-900">{meal.protein}g</span>
                      </div>
                      <div className="space-y-1 bg-white/50 rounded-xl p-3 text-center border border-zinc-200/50">
                        <label className="text-[9px] uppercase font-black text-green-400 tracking-widest block">Glucides</label>
                        <span className="font-bold text-zinc-900">{meal.carbs}g</span>
                      </div>
                      <div className="space-y-1 bg-white/50 rounded-xl p-3 text-center border border-zinc-200/50">
                        <label className="text-[9px] uppercase font-black text-yellow-400 tracking-widest block">Lipides</label>
                        <span className="font-bold text-zinc-900">{meal.fat}g</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
            
            {planMeals.length === 0 && (
              <motion.div variants={itemVariants} className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl">
                <p className="text-zinc-500 text-sm">Aucun repas défini dans ce plan.</p>
              </motion.div>
            )}
          </motion.div>
          
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

          {/* Daily Log */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                <AppleIcon size={16} className="text-velatra-accent" /> Ce que j'ai mangé
              </h3>
              <Button onClick={() => setIsAdding(true)} variant="primary" className="!py-1.5 !px-3 !text-[10px] flex items-center gap-1">
                <PlusIcon size={12} /> AJOUTER
              </Button>
            </div>

            <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <Card className="p-4 bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-xl">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1 block">Nom de l'aliment / repas</label>
                      <div className="flex gap-2">
                        <Input 
                          value={newFood.name}
                          onChange={e => setNewFood({...newFood, name: e.target.value})}
                          placeholder="Ex: Poulet au riz, Pomme..."
                          autoFocus
                          className="flex-1"
                        />
                        <Button 
                          variant="secondary" 
                          onClick={handleAutoCalculate}
                          disabled={isEstimating || !newFood.name}
                          className="!px-3 !py-0 h-[42px] flex items-center justify-center bg-velatra-accent/10 border-velatra-accent/20 text-velatra-accent hover:bg-velatra-accent/20"
                          title="Calculer les macros automatiquement"
                        >
                          {isEstimating ? <RefreshCwIcon size={18} className="animate-spin" /> : <Wand2Icon size={18} />}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1 block">Kcal</label>
                        <Input type="number" value={newFood.calories || ''} onChange={e => setNewFood({...newFood, calories: parseInt(e.target.value) || 0})} placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-black text-blue-400 tracking-widest mb-1 block">Prot (g)</label>
                        <Input type="number" value={newFood.protein || ''} onChange={e => setNewFood({...newFood, protein: parseInt(e.target.value) || 0})} placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-black text-green-400 tracking-widest mb-1 block">Gluc (g)</label>
                        <Input type="number" value={newFood.carbs || ''} onChange={e => setNewFood({...newFood, carbs: parseInt(e.target.value) || 0})} placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-black text-yellow-400 tracking-widest mb-1 block">Lip (g)</label>
                        <Input type="number" value={newFood.fat || ''} onChange={e => setNewFood({...newFood, fat: parseInt(e.target.value) || 0})} placeholder="0" />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 w-full">
                      <Button variant="secondary" fullWidth onClick={() => setIsAdding(false)} className="!py-2 !text-xs">Annuler</Button>
                      <Button variant="primary" fullWidth onClick={handleAddFood} disabled={!newFood.name || isSaving} className="!py-2 !text-xs">
                        {isSaving ? <RefreshCwIcon size={14} className="animate-spin" /> : 'Enregistrer'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
            </AnimatePresence>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              <AnimatePresence>
              {currentLog?.foods.map((food) => (
                <motion.div 
                  key={food.id} 
                  variants={itemVariants}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-xl border border-zinc-200/50 rounded-xl hover:border-zinc-300 transition-colors shadow-sm"
                >
                  <div>
                    <div className="font-bold text-zinc-900 text-sm">{food.name}</div>
                    <div className="flex gap-3 text-[10px] font-bold mt-1">
                      <span className="text-zinc-500">{food.calories} kcal</span>
                      <span className="text-blue-400">{food.protein}g P</span>
                      <span className="text-green-400">{food.carbs}g G</span>
                      <span className="text-yellow-400">{food.fat}g L</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteFood(food.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2Icon size={16} />
                  </button>
                </motion.div>
              ))}
              </AnimatePresence>

              {(!currentLog?.foods || currentLog.foods.length === 0) && !isAdding && (
                <motion.div variants={itemVariants} className="text-center py-8 border border-dashed border-zinc-200 rounded-2xl">
                  <p className="text-zinc-500 text-sm">Aucun aliment enregistré aujourd'hui.</p>
                </motion.div>
              )}
            </motion.div>
          </div>

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
