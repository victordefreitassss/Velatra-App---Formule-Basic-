/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import { User, BodyData } from "../types";

const getApiKey = () => {
  return process.env.GEMINI_API_KEY || '';
};

export const generateSportsProgram = async (user: User, availableExercises: any[]) => {
  const rawApiKey = getApiKey();
  const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
  if (!apiKey) {
    throw new Error("Clé API Gemini introuvable. Veuillez configurer GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const exercisesList = availableExercises.map(ex => `- ID: ${ex.id} | Nom: ${ex.name} | Catégorie: ${ex.cat} | Équipement: ${ex.equip}`).join('\n');

  const prompt = `
Tu es un expert en préparation physique et en musculation.

Ta mission est de générer un programme sportif personnalisé pour un utilisateur en fonction de son profil détaillé.

Voici les données de l'utilisateur :
- Âge : ${user.age}
- Sexe : ${user.gender === 'M' ? 'Homme' : user.gender === 'F' ? 'Femme' : 'Autre'}
- Objectif principal : ${(user.objectifs || []).join(', ')}
- Niveau d'expérience : ${user.experienceLevel || 'Non spécifié'}
- Jours d'entraînement par semaine : ${user.trainingDays || 3} jours
- Durée par séance : ${user.sessionDuration || 60} minutes
- Équipement disponible : ${user.equipment || 'Non spécifié'}
- Blessures ou limitations : ${user.injuries || 'Aucune'}

Voici la liste des exercices disponibles dans la base de données :
${exercisesList}

Tu dois créer un programme sur ${user.trainingDays || 3} jours.
Pour chaque jour, définis un nom (ex: "Push", "Haut du corps", "Jambes"), et sélectionne les exercices appropriés parmi la liste fournie.
Utilise UNIQUEMENT les ID des exercices fournis dans la liste.

Contraintes pour chaque exercice :
- sets : nombre de séries (ex: "3" ou "4")
- reps : nombre de répétitions (ex: "8-12" ou "15")
- rest : temps de repos (ex: "90s" ou "2min")
- tempo : tempo d'exécution (ex: "2010" ou "Contrôlé")
- duration : durée (pour le cardio ou gainage, ex: "10min" ou "")
- notes : conseils d'exécution
- setType : type de série ("normal", "superset", "biset", "triset", "giantset", "dropset", "custom")
- setGroup : numéro de groupe pour les supersets (ex: 1 pour le premier superset, 0 sinon)

Format de sortie obligatoire (JSON) :
{
  "name": "Nom du programme (ex: Programme Hypertrophie 4 Jours)",
  "nbDays": ${user.trainingDays || 3},
  "days": [
    {
      "name": "Nom de la séance (ex: Push)",
      "isCoaching": false,
      "exercises": [
        {
          "exId": 1,
          "sets": "4",
          "reps": "8-12",
          "rest": "90s",
          "tempo": "2010",
          "duration": "",
          "notes": "Bien descendre",
          "setType": "normal",
          "setGroup": 0
        }
      ]
    }
  ]
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          nbDays: { type: Type.INTEGER },
          days: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                isCoaching: { type: Type.BOOLEAN },
                exercises: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      exId: { type: Type.INTEGER },
                      sets: { type: Type.STRING },
                      reps: { type: Type.STRING },
                      rest: { type: Type.STRING },
                      tempo: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      notes: { type: Type.STRING },
                      setType: { type: Type.STRING },
                      setGroup: { type: Type.INTEGER }
                    },
                    required: ["exId", "sets", "reps", "rest", "tempo", "duration", "notes", "setType", "setGroup"]
                  }
                }
              },
              required: ["name", "isCoaching", "exercises"]
            }
          }
        },
        required: ["name", "nbDays", "days"]
      }
    }
  });

  const jsonStr = response.text?.trim() || "{}";
  return JSON.parse(jsonStr);
};

export const generateNutritionPlan = async (user: User, latestScan?: BodyData, targets?: { calories: number, protein: number, carbs: number, fat: number }) => {
  const rawApiKey = getApiKey();
  const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
  if (!apiKey) {
    throw new Error("Clé API Gemini introuvable. Veuillez configurer GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const currentWeight = latestScan?.weight || user.weight;
  const fatInfo = latestScan?.fat ? `\nmasse grasse : ${latestScan.fat}%` : '';
  const muscleInfo = latestScan?.muscle ? `\nmasse musculaire : ${latestScan.muscle} kg` : '';

  const targetInstructions = targets 
    ? `
ÉTAPE 1 à 4 — CIBLES IMPOSÉES
Tu DOIS utiliser EXACTEMENT les cibles suivantes pour générer le plan :
Calories totales : ${targets.calories} kcal
Protéines : ${targets.protein} g
Glucides : ${targets.carbs} g
Lipides : ${targets.fat} g
Ne recalcule pas ces valeurs, utilise-les directement pour répartir les repas.
`
    : `
ÉTAPE 1 — Calcul du métabolisme de base (BMR)
Utilise la formule Mifflin-St Jeor.
Homme : BMR = (10 × poids) + (6.25 × taille) − (5 × âge) + 5
Femme : BMR = (10 × poids) + (6.25 × taille) − (5 × âge) − 161

ÉTAPE 2 — Calcul du TDEE (Total Daily Energy Expenditure)
Multiplie le BMR par le facteur d’activité :
* sédentaire : 1.2
* activité légère : 1.375
* activité modérée : 1.55
* activité élevée : 1.725
* athlète : 1.9
TDEE = BMR × facteur activité

ÉTAPE 3 — Ajustement calorique selon l’objectif
Objectifs possibles :
Perte de poids : déficit léger : -300 kcal, déficit modéré : -500 kcal, déficit agressif : -700 kcal
Prise de masse : lean bulk : +200 kcal, prise modérée : +300 kcal, prise rapide : +500 kcal
Recomposition corporelle : calories ≈ TDEE

ÉTAPE 4 — Calcul des macronutriments
Protéines : perte de poids : 2.0 à 2.4 g/kg, recomposition : 2 g/kg, prise de masse : 1.6 à 2.2 g/kg
Lipides : 0.8 à 1 g/kg
Glucides : Le reste des calories.
Rappels énergétiques : 1 g protéines = 4 kcal, 1 g glucides = 4 kcal, 1 g lipides = 9 kcal
`;

  const prompt = `
Tu es un expert en nutrition sportive et en diététique appliquée au fitness.

Ta mission est de générer un plan nutritionnel personnalisé pour un utilisateur en fonction de ses données physiques, de son objectif sportif et de ses préférences alimentaires.

Tu dois suivre strictement les étapes ci-dessous.
${targetInstructions}
ÉTAPE 5 — Répartition des repas
Distribue les calories et les macros sur plusieurs repas :
3 repas : petit-déjeuner 30%, déjeuner 40%, dîner 30%
4 repas : petit-déjeuner 25%, déjeuner 30%, collation 15%, dîner 30%
5 repas : petit-déjeuner 25%, collation 10%, déjeuner 30%, collation 10%, dîner 25%

ÉTAPE 6 — Format de sortie obligatoire
Retourner uniquement un objet JSON structuré avec :
{
"calories_totales": 0,
"macros": {
"proteines_g": 0,
"glucides_g": 0,
"lipides_g": 0
},
"repas": [
{
"type": "Petit-déjeuner",
"description": "Exemple de repas avec aliments et quantités",
"calories": 0,
"proteines": 0,
"glucides": 0,
"lipides": 0
},
{
"type": "Déjeuner",
"description": "Exemple de repas avec aliments et quantités",
"calories": 0,
"proteines": 0,
"glucides": 0,
"lipides": 0
},
{
"type": "Collation",
"description": "Exemple de repas avec aliments et quantités",
"calories": 0,
"proteines": 0,
"glucides": 0,
"lipides": 0
},
{
"type": "Dîner",
"description": "Exemple de repas avec aliments et quantités",
"calories": 0,
"proteines": 0,
"glucides": 0,
"lipides": 0
}
],
"liste_courses": ["Aliment 1", "Aliment 2"]
}

ÉTAPE 7 — Contraintes importantes
* Les macros doivent correspondre aux calories totales.
* Propose des aliments spécifiques et des idées de repas pour chaque repas dans le champ "description". Le plan doit être concret et facile à suivre.

Voici les données utilisateur :
âge : ${user.age}
sexe : ${user.gender === 'M' ? 'Homme' : user.gender === 'F' ? 'Femme' : 'Autre'}
taille : ${user.height} cm
poids : ${currentWeight} kg${fatInfo}${muscleInfo}
objectif : ${(user.objectifs || []).join(', ')}
niveau activité : activité modérée
type de régime : standard
allergies : aucune
aliments préférés : aucun
aliments refusés : aucun
nombre de repas : 4
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "Tu es un expert en nutrition sportive. Tu dois calculer les macros et calories avec précision et retourner UNIQUEMENT un objet JSON valide. Ne retourne aucun texte explicatif, aucune formule de calcul dans les champs. Les noms des repas doivent être simples (ex: 'Petit-déjeuner', 'Déjeuner', 'Collation', 'Dîner'). Les valeurs de calories et macros doivent être des nombres entiers.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          calories_totales: { type: Type.NUMBER },
          macros: {
            type: Type.OBJECT,
            properties: {
              proteines_g: { type: Type.NUMBER },
              glucides_g: { type: Type.NUMBER },
              lipides_g: { type: Type.NUMBER }
            },
            required: ["proteines_g", "glucides_g", "lipides_g"]
          },
          repas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "Nom du repas (ex: Petit-déjeuner)" },
                description: { type: Type.STRING, description: "Description des aliments et quantités" },
                calories: { type: Type.NUMBER },
                proteines: { type: Type.NUMBER },
                glucides: { type: Type.NUMBER },
                lipides: { type: Type.NUMBER }
              },
              required: ["type", "description", "calories", "proteines", "glucides", "lipides"]
            }
          },
          liste_courses: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["calories_totales", "macros", "repas", "liste_courses"]
      }
    }
  });

  const jsonStr = response.text?.trim();
  if (!jsonStr) throw new Error("Réponse vide de l'IA");
  
  return JSON.parse(jsonStr);
};

export const estimateFoodMacros = async (foodName: string) => {
  const rawApiKey = getApiKey();
  const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
  if (!apiKey) {
    throw new Error("Clé API Gemini introuvable. Veuillez configurer GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Estime les valeurs nutritionnelles pour l'aliment suivant : "${foodName}".
Donne les valeurs exactes pour la quantité demandée. Si aucune quantité n'est précisée, donne pour une portion standard.
Retourne uniquement un objet JSON avec les champs suivants :
{
  "name": "Nom de l'aliment",
  "quantity": nombre (ex: 150, 1),
  "unit": "unité" (ex: "g", "ml", "portion", "unité"),
  "calories": nombre,
  "protein": nombre (en g),
  "carbs": nombre (en g),
  "fat": nombre (en g)
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER }
        },
        required: ["name", "quantity", "unit", "calories", "protein", "carbs", "fat"]
      }
    }
  });

  const jsonStr = response.text?.trim();
  if (!jsonStr) throw new Error("Réponse vide de l'IA");
  
  return JSON.parse(jsonStr);
};

export const generateAutoReport = async (user: User, bodyData: BodyData[], performances: any[]) => {
  const rawApiKey = getApiKey();
  const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
  if (!apiKey) {
    throw new Error("Clé API Gemini introuvable. Veuillez configurer GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const recentBodyData = bodyData.slice(-3).map(b => `Date: ${b.date}, Poids: ${b.weight}kg, Masse grasse: ${b.fat}%, Muscle: ${b.muscle}kg`).join('\n');
  const recentPerfs = performances.slice(-5).map(p => `Exo ID: ${p.exId}, Poids: ${p.weight}kg, Reps: ${p.reps}`).join('\n');

  const prompt = `
Tu es un coach sportif expert. Rédige un bilan de progression court et motivant (environ 100 mots) pour l'adhérent nommé ${user.name}.
Objectif de l'adhérent : ${(user.objectifs || []).join(', ')}.

Voici ses dernières données corporelles :
${recentBodyData || "Aucune donnée corporelle récente."}

Voici ses dernières performances :
${recentPerfs || "Aucune performance récente."}

Le bilan doit être professionnel, encourageant, et prêt à être envoyé par message à l'adhérent.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text?.trim() || "Impossible de générer le rapport.";
};

export const detectStagnation = async (user: User, performances: any[], exercises: any[]) => {
  const rawApiKey = getApiKey();
  const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
  if (!apiKey) {
    throw new Error("Clé API Gemini introuvable. Veuillez configurer GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const perfsWithNames = performances.slice(-20).map(p => {
    const ex = exercises.find(e => e.id === p.exId);
    return `Date: ${p.date}, Exercice: ${ex?.name || p.exId}, Poids: ${p.weight}kg, Reps: ${p.reps}`;
  }).join('\n');

  const prompt = `
Tu es un expert en biomécanique et en entraînement sportif.
Analyse les performances récentes de l'adhérent ${user.name} pour détecter d'éventuelles stagnations (plateaux) sur ses exercices.

Performances récentes :
${perfsWithNames || "Aucune performance récente."}

Retourne uniquement un objet JSON avec :
{
  "hasStagnation": boolean,
  "stagnatingExercises": ["Nom de l'exercice 1", "Nom de l'exercice 2"],
  "advice": "Conseil court (max 30 mots) pour surmonter la stagnation."
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasStagnation: { type: Type.BOOLEAN },
          stagnatingExercises: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          advice: { type: Type.STRING }
        },
        required: ["hasStagnation", "stagnatingExercises", "advice"]
      }
    }
  });

  const jsonStr = response.text?.trim();
  if (!jsonStr) throw new Error("Réponse vide de l'IA");
  
  return JSON.parse(jsonStr);
};

export const analyzeMealImage = async (base64Image: string, mimeType: string) => {
  const rawApiKey = getApiKey();
  const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
  if (!apiKey) {
    throw new Error("Clé API Gemini introuvable. Veuillez configurer GEMINI_API_KEY.");
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: "Analyse ce repas. Renvoie UNIQUEMENT un objet JSON avec les clés suivantes : 'name' (nom du plat, ex: 'Poulet Riz Brocolis'), 'quantity' (nombre estimé, ex: 300), 'unit' (unité, ex: 'g', 'portion', 'ml'), 'calories' (nombre entier), 'protein' (nombre entier), 'carbs' (nombre entier), 'fat' (nombre entier). Ne mets pas de texte autour, juste le JSON."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nom du plat" },
            quantity: { type: Type.NUMBER, description: "Quantité estimée" },
            unit: { type: Type.STRING, description: "Unité (g, portion, ml, unité)" },
            calories: { type: Type.NUMBER, description: "Calories estimées" },
            protein: { type: Type.NUMBER, description: "Protéines en grammes" },
            carbs: { type: Type.NUMBER, description: "Glucides en grammes" },
            fat: { type: Type.NUMBER, description: "Lipides en grammes" }
          },
          required: ["name", "quantity", "unit", "calories", "protein", "carbs", "fat"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erreur analyse repas image:", error);
    throw error;
  }
};

export const generateRecipeFromFridge = async (base64Image: string, mimeType: string) => {
  const rawApiKey = getApiKey();
  const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
  if (!apiKey) {
    throw new Error("Clé API Gemini introuvable. Veuillez configurer GEMINI_API_KEY.");
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: "Voici une photo de mon frigo ou de mes ingrédients. Génère une recette saine, sportive et anti-gaspillage avec ces ingrédients. Renvoie la réponse en Markdown, en incluant un titre accrocheur, la liste des ingrédients, les étapes de préparation, et une estimation des macros (Calories, Protéines, Glucides, Lipides)."
          }
        ]
      }
    });

    return response.text || "Désolé, je n'ai pas pu générer de recette.";
  } catch (error) {
    console.error("Erreur génération recette:", error);
    throw error;
  }
};
