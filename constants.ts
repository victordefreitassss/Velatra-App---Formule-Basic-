import { User, Exercise, Goal, ClubInfo, CoachInfo, SupplementProduct } from './types';

export const PROGRAM_DURATION_WEEKS = 7;

// Configuration Commerce
export const COMMISSION_THRESHOLD = 300; 
export const LOYALTY_POINT_VALUE = 0.05; 
export const STOCK_ALERT_THRESHOLD = 3;

export const INIT_SUPPLEMENTS: SupplementProduct[] = [];

export const INIT_USERS: User[] = [];

export const GOALS: Goal[] = [
  "Perte de poids", "Prise de masse", "Sport santé bien-être", "Prépa physique",
  "Remise en forme", "Performance sportive", "Renforcement musculaire",
  "Souplesse et mobilité", "Autre"
];

export const EXERCISE_CATEGORIES = [
  "Jambes", "Poitrine", "Dos", "Épaules", "Bras", "Abdos", "Cardio", "Mobilité", "Circuit Training", "Full Body"
];

export const INIT_EXERCISES: Exercise[] = [
  // Jambes
  { id: 1, clubId: "global", name: "Squat barre", cat: "Jambes", equip: "Barre", photo: null, perfId: "squat" },
  { id: 2, clubId: "global", name: "Presse à cuisses", cat: "Jambes", equip: "Machine", photo: null, perfId: "presse" },
  { id: 3, clubId: "global", name: "Fentes marchées", cat: "Jambes", equip: "Haltères", photo: null, perfId: "fentes" },
  { id: 4, clubId: "global", name: "Leg Extension", cat: "Jambes", equip: "Machine", photo: null, perfId: "leg_ext" },
  { id: 5, clubId: "global", name: "Leg Curl", cat: "Jambes", equip: "Machine", photo: null, perfId: "leg_curl" },
  { id: 6, clubId: "global", name: "Soulevé de terre roumain", cat: "Jambes", equip: "Barre", photo: null, perfId: "sdt_roumain" },
  { id: 7, clubId: "global", name: "Hip Thrust", cat: "Jambes", equip: "Barre", photo: null, perfId: "hip_thrust" },
  { id: 8, clubId: "global", name: "Mollets debout", cat: "Jambes", equip: "Machine", photo: null, perfId: "mollets" },
  
  // Poitrine
  { id: 11, clubId: "global", name: "Développé couché", cat: "Poitrine", equip: "Barre", photo: null, perfId: "dc_barre" },
  { id: 12, clubId: "global", name: "Développé incliné", cat: "Poitrine", equip: "Haltères", photo: null, perfId: "di_halteres" },
  { id: 13, clubId: "global", name: "Écartés couché", cat: "Poitrine", equip: "Haltères", photo: null, perfId: "ecartes" },
  { id: 14, clubId: "global", name: "Dips (Pectoraux)", cat: "Poitrine", equip: "Poids du corps", photo: null, perfId: "dips_pecs" },
  { id: 15, clubId: "global", name: "Pompes", cat: "Poitrine", equip: "Poids du corps", photo: null, perfId: "pompes" },
  { id: 16, clubId: "global", name: "Poulie vis-à-vis", cat: "Poitrine", equip: "Poulie", photo: null, perfId: "poulie_vis" },
  
  // Dos
  { id: 21, clubId: "global", name: "Tractions", cat: "Dos", equip: "Poids du corps", photo: null, perfId: "tractions" },
  { id: 22, clubId: "global", name: "Tirage poitrine", cat: "Dos", equip: "Machine", photo: null, perfId: "tirage_poitrine" },
  { id: 23, clubId: "global", name: "Tirage horizontal", cat: "Dos", equip: "Machine", photo: null, perfId: "tirage_horiz" },
  { id: 24, clubId: "global", name: "Rowing barre", cat: "Dos", equip: "Barre", photo: null, perfId: "rowing_barre" },
  { id: 25, clubId: "global", name: "Rowing haltère (bûcheron)", cat: "Dos", equip: "Haltère", photo: null, perfId: "rowing_haltere" },
  { id: 26, clubId: "global", name: "Soulevé de terre", cat: "Dos", equip: "Barre", photo: null, perfId: "sdt" },
  { id: 27, clubId: "global", name: "Pull-over poulie haute", cat: "Dos", equip: "Poulie", photo: null, perfId: "pullover_poulie" },

  // Épaules
  { id: 31, clubId: "global", name: "Développé militaire", cat: "Épaules", equip: "Barre", photo: null, perfId: "dm" },
  { id: 32, clubId: "global", name: "Développé assis", cat: "Épaules", equip: "Haltères", photo: null, perfId: "dev_assis" },
  { id: 33, clubId: "global", name: "Élévations latérales", cat: "Épaules", equip: "Haltères", photo: null, perfId: "elev_lat" },
  { id: 34, clubId: "global", name: "Oiseau (Arrière d'épaule)", cat: "Épaules", equip: "Haltères", photo: null, perfId: "oiseau" },
  { id: 35, clubId: "global", name: "Face Pull", cat: "Épaules", equip: "Poulie", photo: null, perfId: "face_pull" },
  { id: 36, clubId: "global", name: "Haussements d'épaules (Shrugs)", cat: "Épaules", equip: "Haltères", photo: null, perfId: "shrugs" },

  // Bras
  { id: 41, clubId: "global", name: "Curl barre EZ", cat: "Bras", equip: "Barre", photo: null, perfId: "curl" },
  { id: 42, clubId: "global", name: "Curl haltères alterné", cat: "Bras", equip: "Haltères", photo: null, perfId: "curl_halteres" },
  { id: 43, clubId: "global", name: "Curl marteau", cat: "Bras", equip: "Haltères", photo: null, perfId: "curl_marteau" },
  { id: 44, clubId: "global", name: "Extension triceps poulie", cat: "Bras", equip: "Poulie", photo: null, perfId: "ext_triceps" },
  { id: 45, clubId: "global", name: "Barre au front", cat: "Bras", equip: "Barre EZ", photo: null, perfId: "barre_front" },
  { id: 46, clubId: "global", name: "Dips (Triceps)", cat: "Bras", equip: "Poids du corps", photo: null, perfId: "dips_tri" },

  // Abdos
  { id: 51, clubId: "global", name: "Crunch au sol", cat: "Abdos", equip: "Poids du corps", photo: null, perfId: "crunch" },
  { id: 52, clubId: "global", name: "Gainage (Planche)", cat: "Abdos", equip: "Poids du corps", photo: null, perfId: "gainage" },
  { id: 53, clubId: "global", name: "Relevé de jambes suspendu", cat: "Abdos", equip: "Barre fixe", photo: null, perfId: "releve_jambes" },
  { id: 54, clubId: "global", name: "Russian Twist", cat: "Abdos", equip: "Poids", photo: null, perfId: "russian_twist" },
  { id: 55, clubId: "global", name: "Ab Wheel (Roulette)", cat: "Abdos", equip: "Accessoire", photo: null, perfId: "ab_wheel" },

  // Cardio
  { id: 61, clubId: "global", name: "Tapis de course", cat: "Cardio", equip: "Machine", photo: null, perfId: "tapis" },
  { id: 62, clubId: "global", name: "Vélo elliptique", cat: "Cardio", equip: "Machine", photo: null, perfId: "elliptique" },
  { id: 63, clubId: "global", name: "Rameur", cat: "Cardio", equip: "Machine", photo: null, perfId: "rameur" },
  { id: 64, clubId: "global", name: "Vélo de biking", cat: "Cardio", equip: "Machine", photo: null, perfId: "biking" },
  { id: 65, clubId: "global", name: "Corde à sauter", cat: "Cardio", equip: "Accessoire", photo: null, perfId: "corde" },
  { id: 66, clubId: "global", name: "Assault Bike", cat: "Cardio", equip: "Machine", photo: null, perfId: "assault_bike" },
  { id: 67, clubId: "global", name: "SkiErg", cat: "Cardio", equip: "Machine", photo: null, perfId: "skierg" },

  // Circuit Training / Full Body
  { id: 71, clubId: "global", name: "Burpees", cat: "Circuit Training", equip: "Poids du corps", photo: null, perfId: "burpees" },
  { id: 72, clubId: "global", name: "Kettlebell Swing", cat: "Circuit Training", equip: "Kettlebell", photo: null, perfId: "kb_swing" },
  { id: 73, clubId: "global", name: "Box Jump", cat: "Circuit Training", equip: "Box", photo: null, perfId: "box_jump" },
  { id: 74, clubId: "global", name: "Wall Ball", cat: "Circuit Training", equip: "Medecine Ball", photo: null, perfId: "wall_ball" },
  { id: 75, clubId: "global", name: "Battle Rope", cat: "Circuit Training", equip: "Corde", photo: null, perfId: "battle_rope" },
  { id: 76, clubId: "global", name: "Thruster", cat: "Circuit Training", equip: "Barre/Haltères", photo: null, perfId: "thruster" },
  { id: 77, clubId: "global", name: "Mountain Climbers", cat: "Circuit Training", equip: "Poids du corps", photo: null, perfId: "mountain_climbers" },
  { id: 78, clubId: "global", name: "Jumping Jacks", cat: "Circuit Training", equip: "Poids du corps", photo: null, perfId: "jumping_jacks" }
];

export const CLUB_INFO: ClubInfo = {
  phone: "",
  email: "",
  googleReview: "",
  description: "Bienvenue dans votre espace coaching.",
  horaires: "",
  adresse: "",
  mapsLink: ""
};

export const COACHES: CoachInfo[] = [];
