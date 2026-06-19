import React, { useState, useEffect } from 'react';
import { AppState, NutritionLog } from '../types';
import { Card, Button, Input, Badge } from './UI';
import { db, doc, setDoc, updateDoc } from '../firebase';
import { 
  Apple, Flame, Pizza, Beef, Droplet, Plus, Trash2, Calendar, 
  ChevronRight, Sparkles, AlertCircle, TrendingUp, Check
} from 'lucide-react';

interface MemberNutritionViewProps {
  state: AppState;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  memberId?: number;
  readOnly?: boolean;
}

export const MemberNutritionView: React.FC<MemberNutritionViewProps> = ({
  state,
  showToast,
  memberId,
  readOnly = false
}) => {
  const targetUserId = memberId || Number(state.user?.id || 1);
  const selectedDate = new Date().toLocaleDateString('fr-FR').split('/').reverse().join('-'); // YYYY-MM-DD
  
  // Find logs for today
  const dailyLog = state.nutritionLogs?.find(l => l.userId === targetUserId && l.date === selectedDate) || null;

  // Local addition form
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState(250);
  const [protein, setProtein] = useState(20);
  const [carbs, setCarbs] = useState(30);
  const [fat, setFat] = useState(8);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [loading, setLoading] = useState(false);

  // Targets
  const calorieTarget = 2500;
  const proteinTarget = 150;
  const carbsTarget = 280;
  const fatTarget = 80;

  // Calculate totals
  const totalCalories = dailyLog?.foods?.reduce((sum, f) => sum + (f.calories || 0), 0) || 0;
  const totalProtein = dailyLog?.foods?.reduce((sum, f) => sum + (f.protein || 0), 0) || 0;
  const totalCarbs = dailyLog?.foods?.reduce((sum, f) => sum + (f.carbs || 0), 0) || 0;
  const totalFat = dailyLog?.foods?.reduce((sum, f) => sum + (f.fat || 0), 0) || 0;

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName || readOnly) return;

    setLoading(true);
    try {
      const newFood = {
        id: `food_${Date.now()}`,
        name: foodName,
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
        mealType
      };

      const logId = dailyLog?.id || `nutrilog_${targetUserId}_${selectedDate}`;
      const updatedFoods = dailyLog ? [...dailyLog.foods, newFood] : [newFood];

      const updatedLog: NutritionLog = {
        id: logId,
        clubId: state.user?.clubId || "velatra_default_club",
        userId: targetUserId,
        date: selectedDate,
        foods: updatedFoods
      };

      await setDoc(doc(db, "nutritionLogs", logId), updatedLog);
      
      // Clear inputs
      setFoodName("");
      setCalories(200);
      setProtein(15);
      setCarbs(25);
      setFat(5);
      
      showToast("Aliment ajouté !", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFood = async (foodId: string) => {
    if (!dailyLog || readOnly) return;

    const updatedFoods = dailyLog.foods.filter(f => f.id !== foodId);
    
    try {
      if (updatedFoods.length === 0) {
        // delete document if no foods remain
        await setDoc(doc(db, "nutritionLogs", dailyLog.id), {
          ...dailyLog,
          foods: []
        });
      } else {
        await updateDoc(doc(db, "nutritionLogs", dailyLog.id), {
          foods: updatedFoods
        } as any);
      }
      showToast("Aliment retiré !", "success");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <Apple className="w-5 h-5 text-emerald-400" />
            Suivi Nutritionnel & Calories
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Calculez précisément les macronutriments quotidiens pour atteindre l'objectif.</p>
        </div>
        <Badge variant="blue" className="text-xs">{selectedDate}</Badge>
      </div>

      {/* Progress Circles/Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1 relative">
          <div className="flex items-center justify-between text-zinc-550">
            <Flame className="w-4 h-4 text-rose-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Kcal</span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-white block mt-1">
            {totalCalories} / {calorieTarget}
          </span>
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-rose-500 h-full rounded-full" 
              style={{ width: `${Math.min(100, (totalCalories / calorieTarget) * 100)}%` }} 
            />
          </div>
        </Card>

        <Card className="p-4 space-y-1 relative">
          <div className="flex items-center justify-between text-zinc-550">
            <Beef className="w-4 h-4 text-emerald-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Protéines</span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-white block mt-1">
            {totalProtein}g / {proteinTarget}g
          </span>
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-emerald-400 h-full rounded-full" 
              style={{ width: `${Math.min(100, (totalProtein / proteinTarget) * 100)}%` }} 
            />
          </div>
        </Card>

        <Card className="p-4 space-y-1 relative">
          <div className="flex items-center justify-between text-zinc-550">
            <Pizza className="w-4 h-4 text-amber-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Glucides</span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-white block mt-1">
            {totalCarbs}g / {carbsTarget}g
          </span>
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-amber-500 h-full rounded-full" 
              style={{ width: `${Math.min(100, (totalCarbs / carbsTarget) * 100)}%` }} 
            />
          </div>
        </Card>

        <Card className="p-4 space-y-1 relative">
          <div className="flex items-center justify-between text-zinc-550">
            <Droplet className="w-4 h-4 text-blue-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Lipides</span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-white block mt-1">
            {totalFat}g / {fatTarget}g
          </span>
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-blue-400 h-full rounded-full" 
              style={{ width: `${Math.min(100, (totalFat / fatTarget) * 100)}%` }} 
            />
          </div>
        </Card>
      </div>

      {/* Main split work space */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input adding form */}
        {!readOnly && (
          <Card className="lg:col-span-4 h-fit p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Ajouter un Aliment</h3>
            <form onSubmit={handleAddFood} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Nom de l'aliment</label>
                <Input 
                  value={foodName} 
                  required
                  onChange={(e) => setFoodName(e.target.value)} 
                  placeholder="Ex. 150g de Blanc de Poulet"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Calories (kcal)</label>
                  <Input 
                    type="number" 
                    value={calories} 
                    required
                    onChange={(e) => setCalories(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Protéines (g)</label>
                  <Input 
                    type="number" 
                    value={protein} 
                    required
                    onChange={(e) => setProtein(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Glucides (g)</label>
                  <Input 
                    type="number" 
                    value={carbs} 
                    required
                    onChange={(e) => setCarbs(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Lipides (g)</label>
                  <Input 
                    type="number" 
                    value={fat} 
                    required
                    onChange={(e) => setFat(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Repas</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as any)}
                  className="w-full h-11 px-4 text-xs rounded-xl border border-zinc-850 bg-zinc-950 text-white focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="breakfast">Petit Déjeuner</option>
                  <option value="lunch">Déjeuner</option>
                  <option value="dinner">Dîner</option>
                  <option value="snack">Collation</option>
                </select>
              </div>

              <Button type="submit" disabled={loading} fullWidth className="h-10 mt-2">
                <Plus className="w-4 h-4 mr-1" />
                {loading ? "Ajout..." : "Valider"}
              </Button>
            </form>
          </Card>
        )}

        {/* List of items consumed */}
        <Card className={`${readOnly ? 'lg:col-span-12' : 'lg:col-span-8'} p-5 space-y-4`}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Journal d'alimentation d'aujourd'hui</h3>

          {!dailyLog || dailyLog.foods?.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs text-medium">
              Aucun aliment enregistré aujourd'hui.
            </div>
          ) : (
            <div className="space-y-3.5 pr-1 max-h-[420px] overflow-y-auto">
              {dailyLog.foods?.map((f) => (
                <div 
                  key={f.id} 
                  className="p-3 bg-zinc-900/30 border border-zinc-900 rounded-xl flex items-center justify-between gap-3 relative hover:border-zinc-800 transition-colors"
                >
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-150 block truncate">{f.name}</span>
                      <span className="text-[9px] bg-zinc-85c text-zinc-400 border border-zinc-800 px-1 py-0.5 rounded uppercase font-bold tracking-wider leading-none scale-[0.85]">
                        {f.mealType}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-semibold mt-1">
                      <span className="text-rose-400">{f.calories} kcal</span>
                      <span>P: {f.protein}g</span>
                      <span>G: {f.carbs}g</span>
                      <span>L: {f.fat}g</span>
                    </div>
                  </div>

                  {!readOnly && (
                    <button 
                      onClick={() => handleRemoveFood(f.id)}
                      className="text-zinc-650 hover:text-rose-400 p-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
};
