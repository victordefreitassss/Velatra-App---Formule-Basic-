import React, { useState, useMemo } from 'react';
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
      
      const hasPlan = state.nutritionPlans.some(p => p.memberId === u.id);
      if (filterPlan === 'Avec Plan' && !hasPlan) return false;
      if (filterPlan === 'Sans Plan' && hasPlan) return false;
      
      return true;
    });
  }, [state.users, searchTerm, filterPlan, state.nutritionPlans]);

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
      setDurationWeeks(existingPlan.durationWeeks || 4);
    } else {
      setWeight(member.weight || 70);
      setHeight(member.height || 175);
      setAge(member.age || 30);
      setGender(member.gender || 'M');
      setGoal(member.objectifs?.[0] || 'Sport santé bien-être');
      setDietPreference('Standard');
      setDurationWeeks(4);
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
        durationWeeks,
        bmr,
        tdee,
        targetCalories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        meals: []
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

  const weeklyLogs = useMemo(() => {
    if (!selectedMember) return [];
    const today = new Date();
    const logs = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = state.nutritionLogs.find(l => l.userId === selectedMember.id && l.date === dateStr);
      
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
    return (
      <motion.div 
        className="space-y-8 pb-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-4 px-1">
          <button 
            onClick={() => setSelectedMember(null)}
            className="p-2 bg-white/60 backdrop-blur-xl hover:bg-white/80 rounded-full transition-colors text-zinc-900 border border-zinc-200/50 shadow-sm"
          >
            <ChevronLeftIcon size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 leading-none">Plan Nutritionnel</h1>
            <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px] mt-2">{selectedMember.name}</p>
          </div>
          <div className="ml-auto">
            <Button variant="success" onClick={handleSavePlan} disabled={isSaving} className="!rounded-full !py-2 !px-4 shadow-md hover:shadow-lg transition-shadow">
              <SaveIcon size={16} className="mr-2" /> {isSaving ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Left Column: Metrics & Calculations */}
          <motion.div variants={itemVariants} className="space-y-6">
            <Card className="p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-4 flex items-center gap-2">
                <UserIcon size={16} /> Profil Métabolique
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Poids (kg)</label>
                  <Input type="number" value={weight || ''} onChange={e => setWeight(Number(e.target.value) || 0)} className="!py-2 !bg-white/80" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Taille (cm)</label>
                  <Input type="number" value={height || ''} onChange={e => setHeight(Number(e.target.value) || 0)} className="!py-2 !bg-white/80" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Âge</label>
                  <Input type="number" value={age || ''} onChange={e => setAge(Number(e.target.value) || 0)} className="!py-2 !bg-white/80" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Sexe</label>
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value as Gender)}
                    className="w-full bg-white/80 border border-zinc-200/50 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
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
                  className="w-full bg-white/80 border border-zinc-200/50 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
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
                  className="w-full bg-white/80 border border-zinc-200/50 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
                >
                  {Object.keys(GOAL_ADJUSTMENTS).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Régime Alimentaire</label>
                <select 
                  className="w-full bg-white/80 border border-zinc-200/50 rounded-xl px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors"
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
                  className="bg-white/80 border-zinc-200/50"
                  min={1}
                  max={52}
                />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-velatra-accent/20 to-white/60 backdrop-blur-xl border-velatra-accent/30 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-velatra-accent flex items-center gap-2">
                <TargetIcon size={16} /> Objectifs Journaliers
              </h3>

              <div className="flex items-end justify-between border-b border-zinc-200/50 pb-4">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Calories Cibles</div>
                  <div className="text-4xl font-black text-zinc-900 tabular-nums leading-none">{targetCalories}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Maintien (TDEE)</div>
                  <div className="text-xl font-bold text-zinc-600 tabular-nums">{tdee} kcal</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-blue-500">Protéines</span>
                    <span className="text-zinc-900">{macros.protein}g <span className="text-zinc-900/30 text-[10px]">({Math.round((macros.protein * 4 / targetCalories) * 100)}%)</span></span>
                  </div>
                  <div className="h-2 bg-white/80 rounded-full overflow-hidden border border-zinc-100/50">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(macros.protein * 4 / targetCalories) * 100}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full bg-blue-500 rounded-full" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-green-500">Glucides</span>
                    <span className="text-zinc-900">{macros.carbs}g <span className="text-zinc-900/30 text-[10px]">({Math.round((macros.carbs * 4 / targetCalories) * 100)}%)</span></span>
                  </div>
                  <div className="h-2 bg-white/80 rounded-full overflow-hidden border border-zinc-100/50">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(macros.carbs * 4 / targetCalories) * 100}%` }}
                      transition={{ duration: 1, delay: 0.4 }}
                      className="h-full bg-green-500 rounded-full" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-yellow-500">Lipides</span>
                    <span className="text-zinc-900">{macros.fat}g <span className="text-zinc-900/30 text-[10px]">({Math.round((macros.fat * 9 / targetCalories) * 100)}%)</span></span>
                  </div>
                  <div className="h-2 bg-white/80 rounded-full overflow-hidden border border-zinc-100/50">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(macros.fat * 9 / targetCalories) * 100}%` }}
                      transition={{ duration: 1, delay: 0.6 }}
                      className="h-full bg-yellow-500 rounded-full" 
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Right Column: Weekly Summary */}
          <motion.div variants={itemVariants} className="space-y-6">
            <Card className="p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                <AppleIcon size={16} className="text-velatra-accent" /> Résumé de la semaine
              </h3>
              
              <div className="space-y-3">
                {weeklyLogs.map((log, idx) => (
                  <motion.div 
                    key={idx} 
                    variants={itemVariants}
                    className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-zinc-200/50 shadow-sm transition-transform hover:scale-[1.02]"
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
                        <div className="bg-white rounded-lg p-2 border border-zinc-100/50 shadow-sm">
                          <div className="text-[10px] uppercase font-bold text-zinc-500">Kcal</div>
                          <div className={`text-xs font-bold ${log.totalCals > targetCalories ? 'text-red-500' : 'text-zinc-900'}`}>{log.totalCals}</div>
                        </div>
                        <div className="bg-blue-50/50 rounded-lg p-2 border border-blue-100/50 shadow-sm">
                          <div className="text-[10px] uppercase font-bold text-blue-500">Prot</div>
                          <div className="text-xs font-bold text-blue-600">{log.totalProt}g</div>
                        </div>
                        <div className="bg-green-50/50 rounded-lg p-2 border border-green-100/50 shadow-sm">
                          <div className="text-[10px] uppercase font-bold text-green-500">Gluc</div>
                          <div className="text-xs font-bold text-green-600">{log.totalCarbs}g</div>
                        </div>
                        <div className="bg-yellow-50/50 rounded-lg p-2 border border-yellow-100/50 shadow-sm">
                          <div className="text-[10px] uppercase font-bold text-yellow-500">Lip</div>
                          <div className="text-xs font-bold text-yellow-600">{log.totalFat}g</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500 text-center py-2 bg-white/50 rounded-lg border border-zinc-100/50">
                        Aucun repas enregistré
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
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
          <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-[3px] mt-2">Plans Alimentaires</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        <div className="relative max-w-md">
          <SearchIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-900" />
          <input 
            type="text"
            placeholder="Rechercher un membre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/60 backdrop-blur-xl border border-zinc-200/50 rounded-2xl py-3 pl-14 pr-4 text-zinc-900 font-bold focus:outline-none focus:border-velatra-accent transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {["Tous", "Avec Plan", "Sans Plan"].map(f => (
            <button
              key={f}
              onClick={() => setFilterPlan(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shadow-sm ${filterPlan === f ? 'bg-velatra-accent text-white' : 'bg-white/60 backdrop-blur-xl text-zinc-500 hover:text-zinc-900 hover:bg-white/80 border border-zinc-200/50'}`}
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
            const hasPlan = state.nutritionPlans.some(p => p.memberId === member.id);
            
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
                  className="p-5 cursor-pointer hover:border-velatra-accent/50 transition-all group bg-white/60 backdrop-blur-xl border-zinc-200/50 h-full shadow-sm hover:shadow-md"
                  onClick={() => handleSelectMember(member)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-velatra-accent/20 to-zinc-100 border border-zinc-200/50 flex items-center justify-center font-black text-lg text-velatra-accent shadow-sm">
                      {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : member.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-zinc-900 group-hover:text-velatra-accent transition-colors">{member.name}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                        {hasPlan ? (
                          <span className="text-green-500 flex items-center gap-1"><AppleIcon size={10} /> Plan Actif</span>
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
