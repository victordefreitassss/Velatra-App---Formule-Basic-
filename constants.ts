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
  "Jambes", "Poitrine", "Dos", "Épaules", "Bras", "Abdos", "Cardio", "Mobilité", "Circuit Training", "Full Body", "Remise en forme", "Stretching"
];

export const CATEGORY_MEDIA: Record<string, { photo: string, videoUrl: string }> = {
  "Jambes": { photo: "", videoUrl: "https://www.youtube.com/watch?v=1oed-UmAxFs" },
  "Poitrine": { photo: "", videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg" },
  "Dos": { photo: "", videoUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q" },
  "Épaules": { photo: "", videoUrl: "https://www.youtube.com/watch?v=qEwKCR5JCog" },
  "Bras": { photo: "", videoUrl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo" },
  "Abdos": { photo: "", videoUrl: "https://www.youtube.com/watch?v=2pLT-olgUJs" },
  "Cardio": { photo: "", videoUrl: "https://www.youtube.com/watch?v=8i3ilQzE-IQ" },
  "Mobilité": { photo: "", videoUrl: "https://www.youtube.com/watch?v=qULTwquOuT4" },
  "Circuit Training": { photo: "", videoUrl: "https://www.youtube.com/watch?v=TU8QYVW0gDU" },
  "Full Body": { photo: "", videoUrl: "https://www.youtube.com/watch?v=TU8QYVW0gDU" },
  "Remise en forme": { photo: "", videoUrl: "https://www.youtube.com/watch?v=U1K2z0xOQ5Q" },
  "Stretching": { photo: "", videoUrl: "https://www.youtube.com/watch?v=qULTwquOuT4" }
};

export const KEYWORD_MEDIA: { keywords: string[], photo: string, videoUrl: string }[] = [
  {
    keywords: ['squat'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=gcNh17Ckjgg'
  },
  {
    keywords: ['développé couché', 'bench press'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg'
  },
  {
    keywords: ['soulevé de terre', 'deadlift'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q'
  },
  {
    keywords: ['traction', 'pull up', 'pull-up', 'tirage vertical', 'tirage poitrine'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=eGo4IYIlThE'
  },
  {
    keywords: ['fente', 'lunge'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=QOVaHwm-Q6U'
  },
  {
    keywords: ['curl', 'biceps'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo'
  },
  {
    keywords: ['barre au front', 'extension triceps'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=2-LAMcpzODU'
  },
  {
    keywords: ['crunch', 'abdos'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=2pLT-olgUJs'
  },
  {
    keywords: ['tapis', 'course', 'run', 'marche'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=8i3ilQzE-IQ'
  },
  {
    keywords: ['vélo', 'bike', 'biking', 'elliptique', 'rameur'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=1oed-UmAxFs'
  },
  {
    keywords: ['rowing', 'tirage horizontal', 'bucheron'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=G8l_8chR5BE'
  },
  {
    keywords: ['militaire', 'développé assis', 'shoulder press'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=qEwKCR5JCog'
  },
  {
    keywords: ['mollet', 'calf'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=-M4-G8p8fmc'
  },
  {
    keywords: ['leg curl'],
    photo: '',
    videoUrl: 'https://www.youtube.com/watch?v=YyvSfVjQeL0'
  }
];

export const getExerciseMedia = (name: string, cat: string) => {
  const lowerName = (name || "").toLowerCase();
  
  for (const item of KEYWORD_MEDIA) {
    if (item.keywords.some(kw => lowerName.includes(kw))) {
      return { photo: item.photo, videoUrl: item.videoUrl };
    }
  }
  
  return CATEGORY_MEDIA[cat || "Autre"] || { photo: "", videoUrl: "" };
};

export const INIT_EXERCISES: Exercise[] = [
  // Jambes
  { id: 1, clubId: "global", name: "Squat barre", cat: "Jambes", equip: "Barre", photo: "", videoUrl: "", perfId: "squat" },
  { id: 2, clubId: "global", name: "Presse à cuisses", cat: "Jambes", equip: "Machine", photo: "", videoUrl: "", perfId: "presse" },
  { id: 3, clubId: "global", name: "Fentes marchées", cat: "Jambes", equip: "Haltères", photo: "", videoUrl: "", perfId: "fentes" },
  { id: 4, clubId: "global", name: "Leg Extension", cat: "Jambes", equip: "Machine", photo: "", videoUrl: "", perfId: "leg_ext" },
  { id: 5, clubId: "global", name: "Leg Curl", cat: "Jambes", equip: "Machine", photo: "", videoUrl: "", perfId: "leg_curl" },
  { id: 6, clubId: "global", name: "Soulevé de terre roumain", cat: "Jambes", equip: "Barre", photo: "", videoUrl: "", perfId: "sdt_roumain" },
  { id: 7, clubId: "global", name: "Hip Thrust", cat: "Jambes", equip: "Barre", photo: "", videoUrl: "", perfId: "hip_thrust" },
  { id: 8, clubId: "global", name: "Mollets debout", cat: "Jambes", equip: "Machine", photo: "", videoUrl: "", perfId: "mollets" },
  { id: 9, clubId: "global", name: "Fentes bulgares", cat: "Jambes", equip: "Haltères", photo: "", videoUrl: "", perfId: "fentes_bulgares" },
  { id: 10, clubId: "global", name: "Goblet Squat", cat: "Jambes", equip: "Kettlebell", photo: "", videoUrl: "", perfId: "goblet_squat" },
  
  // Poitrine
  { id: 11, clubId: "global", name: "Développé couché", cat: "Poitrine", equip: "Barre", photo: "", videoUrl: "", perfId: "dc_barre" },
  { id: 12, clubId: "global", name: "Développé incliné", cat: "Poitrine", equip: "Haltères", photo: "", videoUrl: "", perfId: "di_halteres" },
  { id: 13, clubId: "global", name: "Écartés couché", cat: "Poitrine", equip: "Haltères", photo: "", videoUrl: "", perfId: "ecartes" },
  { id: 14, clubId: "global", name: "Dips (Pectoraux)", cat: "Poitrine", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "dips_pecs" },
  { id: 15, clubId: "global", name: "Pompes", cat: "Poitrine", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "pompes" },
  { id: 16, clubId: "global", name: "Poulie vis-à-vis", cat: "Poitrine", equip: "Poulie", photo: "", videoUrl: "", perfId: "poulie_vis" },
  { id: 17, clubId: "global", name: "Pompes sur genoux", cat: "Poitrine", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "pompes_genoux" },
  { id: 18, clubId: "global", name: "Développé machine", cat: "Poitrine", equip: "Machine", photo: "", videoUrl: "", perfId: "dev_machine_pecs" },
  { id: 19, clubId: "global", name: "Pec Deck", cat: "Poitrine", equip: "Machine", photo: "", videoUrl: "", perfId: "pec_deck" },
  
  // Dos
  { id: 21, clubId: "global", name: "Tractions", cat: "Dos", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "tractions" },
  { id: 22, clubId: "global", name: "Tirage poitrine", cat: "Dos", equip: "Machine", photo: "", videoUrl: "", perfId: "tirage_poitrine" },
  { id: 23, clubId: "global", name: "Tirage horizontal", cat: "Dos", equip: "Machine", photo: "", videoUrl: "", perfId: "tirage_horiz" },
  { id: 24, clubId: "global", name: "Rowing barre", cat: "Dos", equip: "Barre", photo: "", videoUrl: "", perfId: "rowing_barre" },
  { id: 25, clubId: "global", name: "Rowing haltère (bûcheron)", cat: "Dos", equip: "Haltère", photo: "", videoUrl: "", perfId: "rowing_haltere" },
  { id: 26, clubId: "global", name: "Soulevé de terre", cat: "Dos", equip: "Barre", photo: "", videoUrl: "", perfId: "sdt" },
  { id: 27, clubId: "global", name: "Pull-over poulie haute", cat: "Dos", equip: "Poulie", photo: "", videoUrl: "", perfId: "pullover_poulie" },
  { id: 28, clubId: "global", name: "Tirage vertical prise serrée", cat: "Dos", equip: "Machine", photo: "", videoUrl: "", perfId: "tirage_serre" },
  { id: 29, clubId: "global", name: "Rowing machine", cat: "Dos", equip: "Machine", photo: "", videoUrl: "", perfId: "rowing_machine" },

  // Épaules
  { id: 31, clubId: "global", name: "Développé militaire", cat: "Épaules", equip: "Barre", photo: "", videoUrl: "", perfId: "dm" },
  { id: 32, clubId: "global", name: "Développé assis", cat: "Épaules", equip: "Haltères", photo: "", videoUrl: "", perfId: "dev_assis" },
  { id: 33, clubId: "global", name: "Élévations latérales", cat: "Épaules", equip: "Haltères", photo: "", videoUrl: "", perfId: "elev_lat" },
  { id: 34, clubId: "global", name: "Oiseau (Arrière d'épaule)", cat: "Épaules", equip: "Haltères", photo: "", videoUrl: "", perfId: "oiseau" },
  { id: 35, clubId: "global", name: "Face Pull", cat: "Épaules", equip: "Poulie", photo: "", videoUrl: "", perfId: "face_pull" },
  { id: 36, clubId: "global", name: "Haussements d'épaules (Shrugs)", cat: "Épaules", equip: "Haltères", photo: "", videoUrl: "", perfId: "shrugs" },
  { id: 37, clubId: "global", name: "Élévations frontales", cat: "Épaules", equip: "Haltères", photo: "", videoUrl: "", perfId: "elev_front" },
  { id: 38, clubId: "global", name: "Développé machine (Épaules)", cat: "Épaules", equip: "Machine", photo: "", videoUrl: "", perfId: "dev_machine_epaules" },

  // Bras
  { id: 41, clubId: "global", name: "Curl barre EZ", cat: "Bras", equip: "Barre", photo: "", videoUrl: "", perfId: "curl" },
  { id: 42, clubId: "global", name: "Curl haltères alterné", cat: "Bras", equip: "Haltères", photo: "", videoUrl: "", perfId: "curl_halteres" },
  { id: 43, clubId: "global", name: "Curl marteau", cat: "Bras", equip: "Haltères", photo: "", videoUrl: "", perfId: "curl_marteau" },
  { id: 44, clubId: "global", name: "Extension triceps poulie", cat: "Bras", equip: "Poulie", photo: "", videoUrl: "", perfId: "ext_triceps" },
  { id: 45, clubId: "global", name: "Barre au front", cat: "Bras", equip: "Barre EZ", photo: "", videoUrl: "", perfId: "barre_front" },
  { id: 46, clubId: "global", name: "Dips (Triceps)", cat: "Bras", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "dips_tri" },
  { id: 47, clubId: "global", name: "Curl pupitre", cat: "Bras", equip: "Machine", photo: "", videoUrl: "", perfId: "curl_pupitre" },
  { id: 48, clubId: "global", name: "Extension triceps corde", cat: "Bras", equip: "Poulie", photo: "", videoUrl: "", perfId: "ext_tri_corde" },

  // Abdos
  { id: 51, clubId: "global", name: "Crunch au sol", cat: "Abdos", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "crunch" },
  { id: 52, clubId: "global", name: "Gainage (Planche)", cat: "Abdos", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "gainage" },
  { id: 53, clubId: "global", name: "Relevé de jambes suspendu", cat: "Abdos", equip: "Barre fixe", photo: "", videoUrl: "", perfId: "releve_jambes" },
  { id: 54, clubId: "global", name: "Russian Twist", cat: "Abdos", equip: "Poids", photo: "", videoUrl: "", perfId: "russian_twist" },
  { id: 55, clubId: "global", name: "Ab Wheel (Roulette)", cat: "Abdos", equip: "Accessoire", photo: "", videoUrl: "", perfId: "ab_wheel" },
  { id: 56, clubId: "global", name: "Gainage latéral", cat: "Abdos", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "gainage_lat" },
  { id: 57, clubId: "global", name: "Relevé de bassin", cat: "Abdos", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "releve_bassin" },

  // Cardio
  { id: 61, clubId: "global", name: "Tapis de course", cat: "Cardio", equip: "Machine", photo: "", videoUrl: "", perfId: "tapis" },
  { id: 62, clubId: "global", name: "Vélo elliptique", cat: "Cardio", equip: "Machine", photo: "", videoUrl: "", perfId: "elliptique" },
  { id: 63, clubId: "global", name: "Rameur", cat: "Cardio", equip: "Machine", photo: "", videoUrl: "", perfId: "rameur" },
  { id: 64, clubId: "global", name: "Vélo de biking", cat: "Cardio", equip: "Machine", photo: "", videoUrl: "", perfId: "biking" },
  { id: 65, clubId: "global", name: "Corde à sauter", cat: "Cardio", equip: "Accessoire", photo: "", videoUrl: "", perfId: "corde" },
  { id: 66, clubId: "global", name: "Assault Bike", cat: "Cardio", equip: "Machine", photo: "", videoUrl: "", perfId: "assault_bike" },
  { id: 67, clubId: "global", name: "SkiErg", cat: "Cardio", equip: "Machine", photo: "", videoUrl: "", perfId: "skierg" },
  { id: 68, clubId: "global", name: "Marche rapide", cat: "Cardio", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "marche" },
  { id: 69, clubId: "global", name: "Vélo droit", cat: "Cardio", equip: "Machine", photo: "", videoUrl: "", perfId: "velo_droit" },
  { id: 70, clubId: "global", name: "Vélo allongé", cat: "Cardio", equip: "Machine", photo: "", videoUrl: "", perfId: "velo_allonge" },

  // Circuit Training / Full Body
  { id: 71, clubId: "global", name: "Burpees", cat: "Circuit Training", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "burpees" },
  { id: 72, clubId: "global", name: "Kettlebell Swing", cat: "Circuit Training", equip: "Kettlebell", photo: "", videoUrl: "", perfId: "kb_swing" },
  { id: 73, clubId: "global", name: "Box Jump", cat: "Circuit Training", equip: "Box", photo: "", videoUrl: "", perfId: "box_jump" },
  { id: 74, clubId: "global", name: "Wall Ball", cat: "Circuit Training", equip: "Medecine Ball", photo: "", videoUrl: "", perfId: "wall_ball" },
  { id: 75, clubId: "global", name: "Battle Rope", cat: "Circuit Training", equip: "Corde", photo: "", videoUrl: "", perfId: "battle_rope" },
  { id: 76, clubId: "global", name: "Thruster", cat: "Circuit Training", equip: "Barre/Haltères", photo: "", videoUrl: "", perfId: "thruster" },
  { id: 77, clubId: "global", name: "Mountain Climbers", cat: "Circuit Training", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "mountain_climbers" },
  { id: 78, clubId: "global", name: "Jumping Jacks", cat: "Circuit Training", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "jumping_jacks" },

  // Remise en forme
  { id: 81, clubId: "global", name: "Montée de genoux", cat: "Remise en forme", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "montee_genoux" },
  { id: 82, clubId: "global", name: "Talons fesses", cat: "Remise en forme", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "talons_fesses" },
  { id: 83, clubId: "global", name: "Squat poids du corps", cat: "Remise en forme", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "squat_pdc" },
  { id: 84, clubId: "global", name: "Fentes alternées", cat: "Remise en forme", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "fentes_pdc" },
  { id: 85, clubId: "global", name: "Step-ups (Montée sur banc)", cat: "Remise en forme", equip: "Banc", photo: "", videoUrl: "", perfId: "step_ups" },
  { id: 86, clubId: "global", name: "Tirage élastique", cat: "Remise en forme", equip: "Élastique", photo: "", videoUrl: "", perfId: "tirage_elastique" },

  // Stretching / Mobilité
  { id: 91, clubId: "global", name: "Étirement ischio-jambiers", cat: "Stretching", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "etirement_ischios" },
  { id: 92, clubId: "global", name: "Étirement quadriceps", cat: "Stretching", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "etirement_quads" },
  { id: 93, clubId: "global", name: "Étirement pectoraux", cat: "Stretching", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "etirement_pecs" },
  { id: 94, clubId: "global", name: "Étirement dos", cat: "Stretching", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "etirement_dos" },
  { id: 95, clubId: "global", name: "Mobilité hanches (90/90)", cat: "Mobilité", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "mobilite_hanches" },
  { id: 96, clubId: "global", name: "Rotations thoraciques", cat: "Mobilité", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "rotations_thoraciques" },
  { id: 97, clubId: "global", name: "Cat-Cow (Dos rond/creux)", cat: "Mobilité", equip: "Poids du corps", photo: "", videoUrl: "", perfId: "cat_cow" }
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
