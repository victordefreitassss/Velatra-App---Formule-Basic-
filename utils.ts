
export function genCode(name: string): string {
  return name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "");
}

export function genAvatar(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function getCurrentWeek(completedWeeks: number[]): number {
  if (completedWeeks.length === 0) return 1;
  const max = Math.max(...completedWeeks);
  return max + 1;
}

export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function calculate8RM(oneRM: number): number {
  return Math.round(oneRM * 0.80 * 10) / 10;
}

export function calculate12RM(oneRM: number): number {
  return Math.round(oneRM * 0.70 * 10) / 10;
}

export function getLevel(xpPoints: number) {
  // 1000 XP par niveau
  const level = Math.floor(xpPoints / 10) || 1; 
  const currentLevelXp = xpPoints % 1000;
  const progress = (currentLevelXp / 1000) * 100;

  if (level >= 50) return { curr: "LÉGENDE", next: "MAX", progress: 100, icon: "👑" };
  if (level >= 25) return { curr: "ÉLITE", next: "LÉGENDE", progress, icon: "🔥" };
  if (level >= 10) return { curr: "VÉTÉRAN", next: "ÉLITE", progress, icon: "💪" };
  if (level >= 5) return { curr: "AVANCÉ", next: "VÉTÉRAN", progress, icon: "🏋️" };
  return { curr: "DÉBUTANT", next: "AVANCÉ", progress, icon: "🌱" };
}

export function formatDate(dateStr: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('fr-FR', options);
}

export function blobToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function calculateNutritionPlan(user: any, latestScan?: any, targets?: { calories: number, protein: number, carbs: number, fat: number }) {
  const weight = latestScan?.weight || user.weight || 70;
  const heightCm = user.height || 170;
  const heightM = heightCm / 100;
  const age = user.age || 30;
  const gender = user.gender || 'M';

  // Équation de Black et al. (1996)
  const wFactor = Math.pow(weight, 0.48);
  const hFactor = Math.pow(heightM, 0.50);
  const aFactor = Math.pow(age, -0.13);

  let bmr = 0;
  if (gender === 'M') {
    bmr = 259 * wFactor * hFactor * aFactor;
  } else {
    bmr = 230 * wFactor * hFactor * aFactor;
  }

  // TDEE avec facteur d'activité modéré par défaut
  const tdee = bmr * 1.55;

  let targetCalories = Math.round(tdee);
  const goal = (user.objectifs && user.objectifs[0]) ? user.objectifs[0].toLowerCase() : '';

  if (goal.includes('perte') || goal.includes('mincir')) {
    targetCalories -= 500;
  } else if (goal.includes('masse') || goal.includes('muscle')) {
    targetCalories += 300;
  }

  let protein = 0;
  let fat = 0;
  let carbs = 0;

  if (targets) {
    targetCalories = targets.calories;
    protein = targets.protein;
    carbs = targets.carbs;
    fat = targets.fat;
  } else {
    // Macros standard
    protein = Math.round(weight * 2.0); // 2g par kg
    fat = Math.round(weight * 1.0); // 1g par kg
    const remainingCalories = targetCalories - (protein * 4) - (fat * 9);
    carbs = Math.max(0, Math.round(remainingCalories / 4));
  }

  const meals = [
    {
      type: 'Petit-déjeuner',
      calories: Math.round(targetCalories * 0.25),
      proteines: Math.round(protein * 0.25),
      glucides: Math.round(carbs * 0.25),
      lipides: Math.round(fat * 0.25)
    },
    {
      type: 'Déjeuner',
      calories: Math.round(targetCalories * 0.30),
      proteines: Math.round(protein * 0.30),
      glucides: Math.round(carbs * 0.30),
      lipides: Math.round(fat * 0.30)
    },
    {
      type: 'Collation',
      calories: Math.round(targetCalories * 0.15),
      proteines: Math.round(protein * 0.15),
      glucides: Math.round(carbs * 0.15),
      lipides: Math.round(fat * 0.15)
    },
    {
      type: 'Dîner',
      calories: Math.round(targetCalories * 0.30),
      proteines: Math.round(protein * 0.30),
      glucides: Math.round(carbs * 0.30),
      lipides: Math.round(fat * 0.30)
    }
  ];

  return {
    calories_totales: targetCalories,
    macros: {
      proteines_g: protein,
      glucides_g: carbs,
      lipides_g: fat
    },
    repas: meals,
    liste_courses: []
  };
}

export function updateNutritionPlanForWeight(plan: any, newWeight: number): any {
  if (!plan || !newWeight) return plan;
  
  const { height, age, gender, activityLevel, goal } = plan;
  if (!height || !age || !gender || !activityLevel || !goal) return plan;

  // Recalculate BMR
  let bmrCalc = (10 * newWeight) + (6.25 * height) - (5 * age);
  bmrCalc += gender === 'M' ? 5 : -161;
  const bmr = Math.round(bmrCalc);

  // Recalculate TDEE
  const ACTIVITY_MULTIPLIERS: Record<string, number> = {
    "Sédentaire": 1.2,
    "Légèrement actif": 1.375,
    "Modérément actif": 1.55,
    "Très actif": 1.725,
    "Extrêmement actif": 1.9
  };
  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.2));

  // Recalculate Target Calories
  const GOAL_ADJUSTMENTS: Record<string, number> = {
    "Perte de poids": -500,
    "Recomposition corporelle": 0,
    "Renforcement musculaire": 300,
    "Prise de masse": 500
  };
  const targetCalories = tdee + (GOAL_ADJUSTMENTS[goal] || 0);

  // Recalculate Macros
  let proteinMultiplier = 1.6;
  if (goal === 'Prise de masse' || goal === 'Renforcement musculaire') proteinMultiplier = 1.8;
  if (goal === 'Perte de poids') proteinMultiplier = 2.0;
  
  const protein = Math.round(newWeight * proteinMultiplier);
  const proteinCals = protein * 4;
  
  let fatPercentage = 0.30;
  if (goal === 'Perte de poids') fatPercentage = 0.35;
  
  const fat = Math.round((targetCalories * fatPercentage) / 9);
  const fatCals = fat * 9;
  
  const carbsCals = targetCalories - proteinCals - fatCals;
  const carbs = Math.max(0, Math.round(carbsCals / 4));

  // Recalculate meals if they exist
  let updatedMeals = plan.meals || [];
  if (updatedMeals.length > 0) {
    // Basic distribution: Breakfast 25%, Lunch 35%, Snack 10%, Dinner 30%
    const distributions: Record<string, number> = {
      'breakfast': 0.25,
      'lunch': 0.35,
      'snack': 0.10,
      'dinner': 0.30
    };
    
    updatedMeals = updatedMeals.map((meal: any) => {
      const dist = distributions[meal.id] || (1 / updatedMeals.length);
      return {
        ...meal,
        calories: Math.round(targetCalories * dist),
        protein: Math.round(protein * dist),
        carbs: Math.round(carbs * dist),
        fat: Math.round(fat * dist)
      };
    });
  }

  return {
    ...plan,
    weight: newWeight,
    bmr,
    tdee,
    targetCalories,
    protein,
    carbs,
    fat,
    meals: updatedMeals,
    updatedAt: new Date().toISOString()
  };
}
