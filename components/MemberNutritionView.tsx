import React, { useState, useMemo } from 'react';
import { AppState, NutritionLog } from '../types';
import { Card, Button, Input } from './UI';
import { AppleIcon, PlusIcon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon, CameraIcon } from './Icons';
import { db, doc, setDoc } from '../firebase';
import { SparklesIcon, RefreshCwIcon, Wand2Icon, ChefHatIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { estimateFoodMacros, analyzeMealImage, generateRecipeFromFridge } from '../services/aiService';
import Markdown from 'react-markdown';

const getApiKey = () => {
  return process.env.GEMINI_API_KEY || '';
};

export const MemberNutritionView: React.FC<{ state: AppState, showToast: (msg: string, type?: 'success' | 'error') => void, memberId?: number, readOnly?: boolean }> = ({ state, showToast, memberId, readOnly }) => {
  const user = memberId ? state.users.find(u => Number(u.id) === memberId) : state.user!;
  if (!user) return null;
  const plan = state.nutritionPlans.find(p => p.memberId === Number(user.id));
  
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [addingMealType, setAddingMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | null>(null);
  const [newFood, setNewFood] = useState({ name: '', quantity: 100, unit: 'g', calories: 0, protein: 0, carbs: 0, fat: 0, mealType: 'breakfast' as 'breakfast' | 'lunch' | 'dinner' | 'snack' });
  const [isSaving, setIsSaving] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isScanningMeal, setIsScanningMeal] = useState(false);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recipeResult, setRecipeResult] = useState<string | null>(null);

  const mealInputRef = React.useRef<HTMLInputElement>(null);
  const fridgeInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'meal' | 'fridge') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const mimeType = file.type;

      if (type === 'meal') {
        setIsScanningMeal(true);
        try {
          const result = await analyzeMealImage(base64String, mimeType);
          setNewFood({
            ...newFood,
            name: result.name,
            calories: result.calories,
            protein: result.protein,
            carbs: result.carbs,
            fat: result.fat,
            quantity: result.quantity || 1,
            unit: result.unit || 'portion'
          });
          showToast("Repas analysé avec succès !", "success");
        } catch (err) {
          console.error(err);
          showToast("Erreur lors de l'analyse du repas", "error");
        } finally {
          setIsScanningMeal(false);
        }
      } else {
        setIsGeneratingRecipe(true);
        setRecipeResult(null);
        try {
          const result = await generateRecipeFromFridge(base64String, mimeType);
          setRecipeResult(result);
          showToast("Recette générée avec succès !", "success");
        } catch (err) {
          console.error(err);
          showToast("Erreur lors de la génération de la recette", "error");
        } finally {
          setIsGeneratingRecipe(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const currentLog = useMemo(() => {
    return state.nutritionLogs.find(l => l.userId === Number(user.id) && l.date === currentDate) || {
      id: `${user.id}-${currentDate}`,
      clubId: user.clubId,
      userId: Number(user.id),
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
      let foodToAdd = { ...newFood, id: Date.now().toString() };
      
      // Auto-calculate if all macros are 0
      if (newFood.calories === 0 && newFood.protein === 0 && newFood.carbs === 0 && newFood.fat === 0) {
        showToast("Calcul automatique des macros en cours...", "success");
        const query = newFood.quantity && newFood.unit ? `${newFood.quantity}${newFood.unit} de ${newFood.name}` : newFood.name;
        const result = await estimateFoodMacros(query);
        foodToAdd = {
          ...foodToAdd,
          name: result.name,
          quantity: result.quantity || newFood.quantity,
          unit: result.unit || newFood.unit,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat
        };
      }

      const updatedLog: NutritionLog = {
        ...currentLog,
        foods: [...currentLog.foods, { ...foodToAdd, mealType: addingMealType || 'breakfast' }]
      };
      await setDoc(doc(db, "nutritionLogs", updatedLog.id), updatedLog);
      setNewFood({ name: '', quantity: 100, unit: 'g', calories: 0, protein: 0, carbs: 0, fat: 0, mealType: addingMealType || 'breakfast' });
      setAddingMealType(null);
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
      const query = newFood.quantity && newFood.unit ? `${newFood.quantity}${newFood.unit} de ${newFood.name}` : newFood.name;
      const result = await estimateFoodMacros(query);
      setNewFood({
        ...newFood,
        name: result.name,
        quantity: result.quantity || newFood.quantity,
        unit: result.unit || newFood.unit,
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
      const rawApiKey = getApiKey();
      const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Propose un repas (juste le nom et les ingrédients principaux) qui correspond EXACTEMENT à ces macros :
- Calories : ${newFood.calories} kcal
- Protéines : ${newFood.protein}g
- Glucides : ${newFood.carbs}g
- Lipides : ${newFood.fat}g

Réponds UNIQUEMENT avec le nom du plat et les ingrédients principaux en une phrase courte. Ne mets pas d'introduction ou de conclusion.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt
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
          <AppleIcon size={48} className="text-zinc-500" />
        </div>
        <h1 className="text-2xl font-black text-zinc-900">Nutrition</h1>
        <p className="text-zinc-500">Votre coach n'a pas encore défini vos objectifs nutritionnels.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-transition pb-20 p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        {!readOnly ? (
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 leading-none">Journal</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[3px] mt-2">Suivi Nutritionnel</p>
          </div>
        ) : (
          <div></div>
        )}
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 border ">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><ChevronLeftIcon size={16} /></button>
          <span className="text-sm font-bold px-2">{new Date(currentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><ChevronRightIcon size={16} /></button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-zinc-50 text-zinc-900 border-none">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Calories Restantes</div>
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

      {/* AI Assistants */}
      {!readOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4 bg-zinc-50  flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
              <CameraIcon size={24} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Scanner un repas</h3>
              <p className="text-xs text-zinc-500 mt-1">Prenez votre assiette en photo, l'IA estime les macros.</p>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              ref={mealInputRef} 
              onChange={(e) => handleImageUpload(e, 'meal')} 
            />
            <Button 
              variant="primary" 
              className="w-full mt-2 !py-2 text-xs" 
              onClick={() => mealInputRef.current?.click()}
              disabled={isScanningMeal}
            >
              {isScanningMeal ? <RefreshCwIcon size={14} className="animate-spin mr-2" /> : <CameraIcon size={14} className="mr-2" />}
              {isScanningMeal ? "Analyse en cours..." : "Prendre une photo"}
            </Button>
          </Card>

          <Card className="p-4 bg-zinc-50  flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
              <ChefHatIcon size={24} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Recette Anti-Gaspi</h3>
              <p className="text-xs text-zinc-500 mt-1">Prenez votre frigo en photo, l'IA crée une recette saine.</p>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fridgeInputRef} 
              onChange={(e) => handleImageUpload(e, 'fridge')} 
            />
            <Button 
              variant="primary" 
              className="w-full mt-2 !py-2 text-xs" 
              onClick={() => fridgeInputRef.current?.click()}
              disabled={isGeneratingRecipe}
            >
              {isGeneratingRecipe ? <RefreshCwIcon size={14} className="animate-spin mr-2" /> : <ChefHatIcon size={14} className="mr-2" />}
              {isGeneratingRecipe ? "Génération..." : "Photo des ingrédients"}
            </Button>
          </Card>
        </div>
      )}

      {recipeResult && (
        <Card className="p-6 bg-zinc-50 border-emerald-500/30 shadow-md shadow-emerald-500/10 relative">
          <button 
            onClick={() => setRecipeResult(null)}
            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <Trash2Icon size={16} />
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <ChefHatIcon size={24} />
            </div>
            <h2 className="text-xl font-display font-bold text-zinc-900">Votre Recette IA</h2>
          </div>
          <div className="prose prose-sm max-w-none prose-headings:font-display prose-a:text-emerald-500 prose-p:leading-relaxed">
            <Markdown>{recipeResult}</Markdown>
          </div>
        </Card>
      )}



      {/* Food List */}
      <Card className="p-6 bg-zinc-50 ">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-black uppercase">Repas du jour</h2>
        </div>

        <div className="space-y-6">
          {[
            { id: 'breakfast', label: 'Petit-déjeuner' },
            { id: 'lunch', label: 'Déjeuner' },
            { id: 'snack', label: 'Collation' },
            { id: 'dinner', label: 'Dîner' }
          ].map((mealType) => {
            const mealFoods = currentLog.foods.filter(f => (f.mealType || 'breakfast') === mealType.id);
            const mealCalories = mealFoods.reduce((sum, f) => sum + f.calories, 0);

            return (
              <div key={mealType.id} className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-xs font-bold text-zinc-600 flex items-center gap-2">
                    {mealType.label}
                    {mealCalories > 0 && <span className="text-zinc-500 font-normal">({mealCalories} kcal)</span>}
                  </h4>
                  {!readOnly && (
                    <Button 
                      variant="secondary" 
                      onClick={() => setAddingMealType(mealType.id as any)} 
                      className="!py-1 !px-2 !text-[10px] flex items-center gap-1 bg-zinc-50  text-zinc-600 hover:bg-white"
                    >
                      <PlusIcon size={12} /> AJOUTER
                    </Button>
                  )}
                </div>

                {addingMealType === mealType.id && (
                  <div className="bg-white p-4 rounded-2xl mb-4 space-y-4 border ">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900">Ajouter à {mealType.label.toLowerCase()}</h4>
                      <button onClick={() => setAddingMealType(null)} className="text-zinc-500 hover:text-zinc-600">
                        <Trash2Icon size={16} />
                      </button>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Aliment / Repas</label>
                      <div className="flex gap-2">
                        <Input 
                          type="text" 
                          placeholder="Ex: Poulet, Riz, Brocolis..." 
                          value={newFood.name} 
                          onChange={e => setNewFood({...newFood, name: e.target.value})} 
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newFood.name) {
                              e.preventDefault();
                              handleAddFood();
                            }
                          }}
                          className="flex-1"
                        />
                        <Button 
                          variant="secondary" 
                          onClick={handleAutoCalculate}
                          disabled={isEstimating || !newFood.name}
                          className="!px-3 !py-0 h-[42px] flex items-center justify-center bg-zinc-100  text-zinc-600 hover:bg-zinc-100"
                          title="Calculer les macros automatiquement"
                        >
                          {isEstimating ? <RefreshCwIcon size={18} className="animate-spin" /> : <Wand2Icon size={18} />}
                        </Button>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          ref={mealInputRef} 
                          onChange={(e) => handleImageUpload(e, 'meal')} 
                          className="hidden" 
                        />
                        <Button 
                          variant="secondary" 
                          onClick={() => mealInputRef.current?.click()}
                          disabled={isScanningMeal}
                          className="!px-3 !py-0 h-[42px] flex items-center justify-center bg-zinc-100  text-zinc-600 hover:bg-zinc-100"
                          title="Prendre en photo"
                        >
                          {isScanningMeal ? <RefreshCwIcon size={18} className="animate-spin" /> : <CameraIcon size={18} />}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Quantité</label>
                        <Input 
                          type="number" 
                          value={newFood.quantity || ''} 
                          onChange={e => setNewFood({...newFood, quantity: parseFloat(e.target.value) || 0})} 
                          placeholder="100" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Unité</label>
                        <select 
                          value={newFood.unit} 
                          onChange={e => setNewFood({...newFood, unit: e.target.value})}
                          className="w-full h-[42px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                          <option value="portion">portion</option>
                          <option value="unité">unité</option>
                        </select>
                      </div>
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
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button variant="secondary" onClick={() => setAddingMealType(null)} className="!py-2">Annuler</Button>
                        <Button variant="primary" onClick={handleAddFood} disabled={isSaving || !newFood.name} className="!py-2">
                          {isSaving ? "Ajout..." : "Valider"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {mealFoods.map(food => (
                    <div key={food.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border ">
                      <div>
                        <div className="font-bold text-zinc-900">
                          {food.name}
                          {food.quantity && food.unit && <span className="text-zinc-500 font-normal text-xs ml-1">({food.quantity} {food.unit})</span>}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1 flex gap-3">
                          <span className="text-zinc-900 font-bold">{food.calories} kcal</span>
                          <span className="text-blue-500">{food.protein}g P</span>
                          <span className="text-green-500">{food.carbs}g G</span>
                          <span className="text-yellow-600">{food.fat}g L</span>
                        </div>
                      </div>
                      {!readOnly && (
                        <button onClick={() => handleDeleteFood(food.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2Icon size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {mealFoods.length === 0 && addingMealType !== mealType.id && (
                    <div className="text-center py-4 border border-dashed  rounded-xl bg-zinc-50/50">
                      <p className="text-zinc-500 text-xs italic">Aucun aliment</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Generated Plan */}
      {plan.meals && plan.meals.length > 0 && (
        <Card className="p-6 bg-zinc-50 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
            <AppleIcon size={16} className="text-emerald-500" /> Plan Alimentaire
          </h3>
          <div className="space-y-4">
            {plan.meals.map((repas: any, idx: number) => (
              <div key={idx} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-zinc-900">{repas.name}</h4>
                  <div className="text-xs font-bold text-zinc-500 bg-zinc-50 px-2 py-1 rounded-lg border">
                    {repas.calories || 0} kcal
                  </div>
                </div>
                
                <div className="text-sm text-zinc-500 mb-4 whitespace-pre-wrap">
                  {repas.description}
                </div>
                
                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                  <div className="text-blue-400">Prot: {repas.protein || 0}g</div>
                  <div className="text-emerald-400">Gluc: {repas.carbs || 0}g</div>
                  <div className="text-orange-400">Lip: {repas.fat || 0}g</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Shopping List */}
      {plan.liste_courses && plan.liste_courses.length > 0 && (
        <Card className="p-6 bg-zinc-50 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
              🛒 Liste de Courses
            </h3>
            {!readOnly && (
              <Button
                variant="ghost"
                onClick={async () => {
                  const allChecked = plan.liste_courses.every((i: any) => i.checked);
                  const newList = plan.liste_courses.map((i: any) => ({ ...i, checked: !allChecked }));
                  try {
                    const { doc, setDoc } = await import('firebase/firestore');
                    const { db } = await import('../firebase');
                    await setDoc(doc(db, "nutritionPlans", plan.id.toString()), {
                      ...plan,
                      liste_courses: newList
                    });
                  } catch (err) {
                    console.error(err);
                    showToast("Erreur lors de la mise à jour de la liste", "error");
                  }
                }}
                className="!py-1 !px-3 !text-xs text-emerald-600 hover:bg-emerald-50"
              >
                {plan.liste_courses.every((i: any) => i.checked) ? "Tout décocher" : "Tout cocher"}
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {plan.liste_courses.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-zinc-200">
                <input 
                  type="checkbox" 
                  checked={item.checked} 
                  disabled={readOnly}
                  onChange={async (e) => {
                    if (readOnly) return;
                    const newList = [...(plan.liste_courses || [])];
                    newList[idx].checked = e.target.checked;
                    try {
                      const { doc, setDoc } = await import('firebase/firestore');
                      const { db } = await import('../firebase');
                      await setDoc(doc(db, "nutritionPlans", plan.id.toString()), {
                        ...plan,
                        liste_courses: newList
                      });
                    } catch (err) {
                      console.error(err);
                      showToast("Erreur lors de la mise à jour de la liste", "error");
                    }
                  }}
                  className="w-5 h-5 text-emerald-500 rounded border-zinc-300 focus:ring-emerald-500"
                />
                <span className={`text-sm ${item.checked ? 'text-zinc-400 line-through' : 'text-zinc-900 font-medium'}`}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
