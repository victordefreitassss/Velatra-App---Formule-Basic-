/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import { User, BodyData } from "../types";

const getApiKey = () => {
  return process.env.GEMINI_API_KEY || '';
};

export interface AIGenerationParams {
  nbDays?: number;
  goals?: string;
  intensity?: string;
  extraNotes?: string;
  includeWarmup?: boolean;
  includeCardioFinisher?: boolean;
  includeCoreFocus?: boolean;
  timeConstraint?: string;
}

export const generateSportsProgram = async (user: User, availableExercises: any[], params?: AIGenerationParams) => {
  const rawApiKey = getApiKey();
  const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
  if (!apiKey) {
    throw new Error("Clé API Gemini introuvable. Veuillez configurer GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const exercisesList = availableExercises.map(ex => `- ID: ${ex.id} | Nom: ${ex.name} | Catégorie: ${ex.cat} | Équipement: ${ex.equip}`).join('\n');

  const trainingDays = params?.nbDays || user.trainingDays || 3;
  const userGoals = params?.goals || (user.objectifs || []).join(', ') || 'Non spécifiés';

  const warmupInstruction = params?.includeWarmup ? "\n- INCLURE UN ÉCHAUFFEMENT / MOBILITÉ : Ajoute 2-3 exercices d'activation ou mobilité très légers en tout début de chaque séance." : "";
  const cardioInstruction = params?.includeCardioFinisher ? "\n- FINISHER CARDIO / HIIT : Ajoute un exercice cardio intense ou un circuit finisher de 5-15 min à la fin de chaque séance." : "";
  const coreInstruction = params?.includeCoreFocus ? "\n- FOCUS ABDOMINAUX : Intègre systématiquement des exercices dédiés à la sangle abdominale / gainage à la fin de chaque séance." : "";
  
  let timeInstruction = "";
  if (params?.timeConstraint === '30') {
    timeInstruction = "\n- SÉANCE FLASH (-30m) : CONTRAINTE STRICTE DE TEMPS. Utilise au maximum des Supersets/Bisets, garde un temps de repos très court. Maximum 4-5 exercices au total dans la séance.";
  } else if (params?.timeConstraint === '45') {
    timeInstruction = "\n- SÉANCE EXPRESS (-45m) : Contrainte stricte de temps. Limite le nombre d'exercices à l'essentiel (polyarticulaires), réduis les temps de repos ou utilise des supersets pour garantir une séance de moins de 45 minutes.";
  } else if (params?.timeConstraint === '60') {
    timeInstruction = "\n- SÉANCE CLASSIQUE (~60m) : Ajuste le volume global (nombre d'exercices, séries et temps de repos) pour que la séance dure environ 1 heure.";
  } else if (params?.timeConstraint === '90') {
    timeInstruction = "\n- SÉANCE LONGUE / VOLUME HAUT (+90m) : Applique un volume important ou des temps de repos très longs (axé Force par exemple) pour une durée qui peut excéder 1h30.";
  }

  const additionalOptionsInstruction = (warmupInstruction || cardioInstruction || coreInstruction || timeInstruction) 
    ? `\n===== OPTIONS SUPPLÉMENTAIRES COCHÉES PAR LE COACH =====${warmupInstruction}${cardioInstruction}${coreInstruction}${timeInstruction}\n` 
    : '';

  const prompt = `
Tu es le MEILLEUR COACH et GÉNÉRATEUR DE PROGRAMME SPORTIF IA au monde, reconnu pour ton expertise scientifique en hypertrophie, force, et conditionnement physique.
Ta mission est de créer un programme sportif 100% personnalisé et optimisé pour cet adhérent, en te basant EXCLUSIVEMENT sur ses données. Ce programme sera ensuite ouvert dans l'éditeur de l'application pour que le coach puisse le modifier, l'ajuster et le valider. Il doit donc être d'un niveau d'expertise irréprochable et parfaitement structuré dès la génération.

Voici le profil DÉTAILLÉ de l'adhérent :
- Âge : ${user.age} ans
- Sexe : ${user.gender === 'M' ? 'Homme' : user.gender === 'F' ? 'Femme' : 'Autre'}
- Poids : ${user.weight} kg
- Taille : ${user.height} cm
- Objectifs principaux : ${userGoals}
- Niveau d'expérience : ${user.experienceLevel || 'Non spécifié'}
- Fréquence visée : ${trainingDays} jours d'entraînement par semaine
- Durée max par séance : ${user.sessionDuration || 60} minutes
- Équipement disponible : ${user.equipment || 'Non spécifié'}
- Blessures, limitations ou pathologies : ${user.injuries || 'Aucune'}

${params?.intensity ? `===== DIRECTIVE DU COACH : INTENSITÉ & TECHNIQUES =====\nLe coach mandate expressément le style d'intensité suivant : "${params.intensity}". Adapte tes choix d'exercices, le temps de repos et cible les techniques d'intensification (supersets, bisets, etc.) en fonction de cette directive.\n` : ''}

${additionalOptionsInstruction}

${params?.extraNotes ? `===== INSTRUCTIONS SUPPLÉMENTAIRES STRICTES DU COACH =====\n"${params.extraNotes}"\nCRUCIAL : Tu DOIS absolument prendre en compte cette demande spécifique lors de la création de ta trame.\n` : ''}

Tu dois construire un programme réparti sur EXACTEMENT ${trainingDays} jours d'entraînement.
Réalise un split pertinent (ex: Push/Pull/Legs, Upper/Lower, Full Body, Split ciblé) parfaitement aligné avec son niveau, ses objectifs et le nombre de jours disponibles.

Voici la base de données d'exercices complète de la salle (utilise UNIQUEMENT ces ID) :
${exercisesList}

===== INSTRUCTIONS DE PROGRAMMATION ET DE STRUCTURATION =====

1. SÉLECTION DES EXERCICES : Choisis les exercices de la liste qui respectent le matériel disponible et les blessures de l'adhérent. Ne crée aucun ID imaginaire, utilise exclusivement ceux fournis.
2. TECHNIQUES D'INTENSIFICATION : Tu es encouragé à utiliser des méthodes d'intensification pertinentes (Biset, Superset, Triset, Giantset, Dropset). 
   - Pour lier des exercices en Superset ou Biset, donne-leur le MÊME \`setGroup\` (ex: 1 pour le premier groupe de la séance, 2 pour le suivant, etc.). 
   - Renseigne aussi le \`setType\` ("superset", "biset", "dropset", etc.). 
   - Si l'exercice est classique sans combinaison, \`setType\` doit être "normal" et \`setGroup\` à 0.
3. VARIABLES D'ENTRAÎNEMENT EXACTES :
   - \`sets\` : le nombre de séries de travail (ex: "3" ou "4" ou "5").
   - \`reps\` : une fourchette de répétitions ou cible (ex: "8-10", "12-15", "Échec").
   - \`rest\` : temps de repos précis (ex: "90s", "2min", "45s", "0s").
   - \`tempo\` : le tempo de la répétition (ex: "2010", "3110", "Contrôlé").
   - \`notes\` : un point technique précis ou une consigne d'intensité à afficher pour cet exercice (ex: "Garder une tension continue", "1 RIR", "Focus étirement max").

Format de sortie JSON obligatoire respectant le schéma :
{
  "name": "Nom du programme (ex: Programme personnalisé ${trainingDays}J)",
  "nbDays": ${trainingDays},
  "days": [
    {
      "name": "Nom de la séance (ex: Séance 1 : Upper Focus Dos)",
      "isCoaching": false,
      "exercises": [
        {
          "exId": 1,
          "sets": "4",
          "reps": "8-12",
          "rest": "90s",
          "tempo": "2010",
          "duration": "",
          "notes": "Bien ressentir l'étirement",
          "setType": "normal",
          "setGroup": 0
        }
      ]
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
      throw new Error("Limite d'utilisation de l'IA atteinte. Veuillez réessayer plus tard ou vérifier votre quota Gemini.");
    }
    throw error;
  }
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: "Tu es un expert en nutrition sportive. Tu dois calculer les macros et calories avec précision et retourner UNIQUEMENT un objet JSON valide. Ne retourne aucun texte explicatif, aucune formule de calcul dans les champs. Les noms des repas doivent être simples (ex: 'Petit-déjeuner', 'Déjeuner', 'Collation', 'Dîner'). Les valeurs de calories et macros doivent être des nombres entiers. La description doit être courte et concise.",
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
                  type: { 
                    type: Type.STRING, 
                    description: "Nom du repas (ex: Petit-déjeuner)",
                    enum: ["Petit-déjeuner", "Déjeuner", "Collation", "Dîner"]
                  },
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
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
      throw new Error("Limite d'utilisation de l'IA atteinte. Veuillez réessayer plus tard ou vérifier votre quota Gemini.");
    }
    throw error;
  }
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
      throw new Error("Limite d'utilisation de l'IA atteinte. Veuillez réessayer plus tard ou vérifier votre quota Gemini.");
    }
    throw error;
  }
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
      }
    });

    return response.text?.trim() || "Impossible de générer le rapport.";
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
      throw new Error("Limite d'utilisation de l'IA atteinte. Veuillez réessayer plus tard ou vérifier votre quota Gemini.");
    }
    throw error;
  }
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
      throw new Error("Limite d'utilisation de l'IA atteinte. Veuillez réessayer plus tard ou vérifier votre quota Gemini.");
    }
    throw error;
  }
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
      model: "gemini-3.1-pro-preview",
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
  } catch (error: any) {
    console.error("Erreur analyse repas image:", error);
    if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
      throw new Error("Limite d'utilisation de l'IA atteinte. Veuillez réessayer plus tard ou vérifier votre quota Gemini.");
    }
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
      model: "gemini-3.1-pro-preview",
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
      },
      config: {
      }
    });

    return response.text || "Désolé, je n'ai pas pu générer de recette.";
  } catch (error: any) {
    console.error("Erreur génération recette:", error);
    if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
      throw new Error("Limite d'utilisation de l'IA atteinte. Veuillez réessayer plus tard ou vérifier votre quota Gemini.");
    }
    throw error;
  }
};
