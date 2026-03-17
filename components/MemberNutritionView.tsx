import React, { useState, useMemo } from 'react';
import { AppState, NutritionLog } from '../types';
import { Card, Button, Input } from './UI';
import { AppleIcon, PlusIcon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { db, doc, setDoc } from '../firebase';
import { SparklesIcon, RefreshCwIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export const MemberNutritionView: React.FC<{ state: AppState, showToast: (msg: string, type?: 'success' | 'error') => void }> = ({ state, showToast }) => {
  const user = state.user!;
  const plan = state.nutritionPlans.find(p => p.memberId === user.id);
  
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newFood, setNewFood] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const currentLog = useMemo(() => {
    return state.nutritionLogs.find(l => l.userId === user.id && l.date === currentDate) || {
      id: `${user.id}-${currentDate}`,
      clubId: user.clubId,
      userId: user.id,
      date: currentDate,
      foods: []
    };
  }, [state.nutritionLogs, user.id, currentDate]);

  const totalCalories = currentLog.foods.reduce((sum, f) => sum + f.calories, 0);
  const totalProtein = currentLog.foods.reduce((sum, f) => sum + f.protein, 0);
  const totalCarbs = currentLog.foods.reduce((sum, f) => sum + f.carbs, 0);
  const totalFat = currentLog.foods.reduce((sum, f) => sum + f.fat, 0);

  const targetCalories = plan?.targetCalories || 2000;
  const targetProtein = plan?.protein || 150;
  const targetCarbs = plan?.carbs || 200;
  const targetFat = plan?.fat || 70;

  const handleAddFood = async () => {
    if (!newFood.name) return;
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

  const handleDeleteFood = async (foodId: string) => {
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

  const handleGenerateIdea = async () => {
    if (!newFood.calories || !newFood.protein || !newFood.carbs || !newFood.fat) {
      showToast("Veuillez remplir toutes les macros pour générer une idée", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const prompt = `Propose un repas (juste le nom et les ingrédients principaux) qui correspond EXACTEMENT à ces macros :
- Calories : ${newFood.calories} kcal
- Protéines : ${newFood.protein}g
- Glucides : ${newFood.carbs}g
- Lipides : ${newFood.fat}g

Réponds UNIQUEMENT avec le nom du plat et les ingrédients principaux en une phrase courte. Ne mets pas d'introduction ou de conclusion.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const idea = response.text?.trim() || "Repas généré";
      setNewFood({ ...newFood, name: idea });
      showToast("Idée de repas générée !", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!plan) {
    return (
      <div className="space-y-8 page-transition pb-20 p-6 max-w-2xl mx-auto text-center">
        <div className="inline-block p-4 bg-zinc-100 rounded-full mb-4">
          <AppleIcon size={48} className="text-zinc-400" />
        </div>
        <h1 className="text-2xl font-black text-zinc-900">Nutrition</h1>
        <p className="text-zinc-500">Votre coach n'a pas encore défini vos objectifs nutritionnels.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-transition pb-20 p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 leading-none">Journal</h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[3px] mt-2">Suivi Nutritionnel</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-50 rounded-xl p-1 border border-zinc-200">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-zinc-200 rounded-lg transition-colors"><ChevronLeftIcon size={16} /></button>
          <span className="text-sm font-bold px-2">{new Date(currentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-zinc-200 rounded-lg transition-colors"><ChevronRightIcon size={16} /></button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-zinc-900 text-white border-none">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Calories Restantes</div>
          <div className="text-2xl font-black">{targetCalories - totalCalories}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Objectif: {targetCalories}</div>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-100">
          <div className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1">Protéines</div>
          <div className="text-2xl font-black text-blue-600">{targetProtein - totalProtein}g</div>
          <div className="text-[10px] text-blue-400/70 mt-1">Objectif: {targetProtein}g</div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-100">
          <div className="text-[10px] uppercase tracking-widest text-green-400 font-bold mb-1">Glucides</div>
          <div className="text-2xl font-black text-green-600">{targetCarbs - totalCarbs}g</div>
          <div className="text-[10px] text-green-400/70 mt-1">Objectif: {targetCarbs}g</div>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-100">
          <div className="text-[10px] uppercase tracking-widest text-yellow-500 font-bold mb-1">Lipides</div>
          <div className="text-2xl font-black text-yellow-600">{targetFat - totalFat}g</div>
          <div className="text-[10px] text-yellow-500/70 mt-1">Objectif: {targetFat}g</div>
        </Card>
      </div>

      {/* Food List */}
      <Card className="p-6 bg-white border-zinc-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black uppercase">Repas du jour</h2>
          <Button variant="secondary" onClick={() => setIsAdding(!isAdding)} className="!py-2 !px-4 !text-[10px]">
            <PlusIcon size={12} className="mr-2" /> AJOUTER
          </Button>
        </div>

        {isAdding && (
          <div className="bg-zinc-50 p-4 rounded-2xl mb-6 space-y-4 border border-zinc-200">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Aliment / Repas</label>
              <Input type="text" placeholder="Ex: Poulet, Riz, Brocolis..." value={newFood.name} onChange={e => setNewFood({...newFood, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Kcal</label>
                <Input type="number" value={newFood.calories || ''} onChange={e => setNewFood({...newFood, calories: Number(e.target.value)})} className="!text-center" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-blue-400 ml-1">Prot (g)</label>
                <Input type="number" value={newFood.protein || ''} onChange={e => setNewFood({...newFood, protein: Number(e.target.value)})} className="!text-center" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-green-400 ml-1">Gluc (g)</label>
                <Input type="number" value={newFood.carbs || ''} onChange={e => setNewFood({...newFood, carbs: Number(e.target.value)})} className="!text-center" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-yellow-500 ml-1">Lip (g)</label>
                <Input type="number" value={newFood.fat || ''} onChange={e => setNewFood({...newFood, fat: Number(e.target.value)})} className="!text-center" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-2 pt-2">
              <Button 
                variant="secondary" 
                onClick={handleGenerateIdea} 
                disabled={isGenerating || !newFood.calories || !newFood.protein || !newFood.carbs || !newFood.fat} 
                className="!py-2 flex items-center justify-center gap-2"
              >
                {isGenerating ? <RefreshCwIcon size={14} className="animate-spin" /> : <SparklesIcon size={14} />}
                Suggérer un plat (IA)
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsAdding(false)} className="!py-2">Annuler</Button>
                <Button variant="primary" onClick={handleAddFood} disabled={isSaving || !newFood.name} className="!py-2">
                  {isSaving ? "Ajout..." : "Valider"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {currentLog.foods.map(food => (
            <div key={food.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <div>
                <div className="font-bold text-zinc-900">{food.name}</div>
                <div className="text-xs text-zinc-500 mt-1 flex gap-3">
                  <span className="text-zinc-900 font-bold">{food.calories} kcal</span>
                  <span className="text-blue-500">{food.protein}g P</span>
                  <span className="text-green-500">{food.carbs}g G</span>
                  <span className="text-yellow-600">{food.fat}g L</span>
                </div>
              </div>
              <button onClick={() => handleDeleteFood(food.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2Icon size={16} />
              </button>
            </div>
          ))}
          
          {currentLog.foods.length === 0 && !isAdding && (
            <div className="text-center py-8 text-zinc-400 text-sm italic">
              Aucun aliment enregistré aujourd'hui.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
