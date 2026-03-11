import React, { useMemo } from 'react';
import { AppState } from '../types';
import { Card } from '../components/UI';
import { AppleIcon, TargetIcon, UserIcon } from '../components/Icons';

export const MemberNutritionPage: React.FC<{ state: AppState }> = ({ state }) => {
  const plan = useMemo(() => {
    return state.nutritionPlans.find(p => p.memberId === state.user?.id);
  }, [state.nutritionPlans, state.user]);

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
              <label className="text-[10px] uppercase font-bold text-velatra-textMuted">Objectif</label>
              <div className="text-white font-bold">{plan.goal}</div>
            </div>
          </Card>
        </div>

        {/* Right Column: Meals */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
              <AppleIcon size={16} className="text-velatra-accent" /> Mes Repas
            </h3>
          </div>

          <div className="space-y-4">
            {plan.meals.map((meal) => (
              <Card key={meal.id} className="p-5 bg-white/[0.02] border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-2">
                    <div className="font-bold text-white text-lg">{meal.name}</div>
                    {meal.description && (
                      <p className="text-sm text-velatra-textMuted whitespace-pre-wrap">{meal.description}</p>
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
            
            {plan.meals.length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                <p className="text-velatra-textMuted text-sm">Aucun repas défini dans ce plan.</p>
              </div>
            )}
          </div>
          
          {/* Meal Totals vs Target */}
          {plan.meals.length > 0 && (
            <Card className="p-4 bg-black border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
                <div className="text-velatra-textMuted uppercase tracking-widest">Total Repas</div>
                <div className="flex gap-6">
                  <div className={`${plan.meals.reduce((sum, m) => sum + m.calories, 0) > plan.targetCalories ? 'text-red-400' : 'text-white'}`}>
                    {plan.meals.reduce((sum, m) => sum + m.calories, 0)} / {plan.targetCalories} kcal
                  </div>
                  <div className="text-blue-400">{plan.meals.reduce((sum, m) => sum + m.protein, 0)}g P</div>
                  <div className="text-green-400">{plan.meals.reduce((sum, m) => sum + m.carbs, 0)}g G</div>
                  <div className="text-yellow-400">{plan.meals.reduce((sum, m) => sum + m.fat, 0)}g L</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
