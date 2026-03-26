
export type Role = "superadmin" | "owner" | "coach" | "member";
export type Gender = "F" | "M";
export type Goal = "Perte de poids" | "Prise de masse" | "Sport santé bien-être" | "Prépa physique" | "Remise en forme" | "Performance sportive" | "Renforcement musculaire" | "Souplesse et mobilité" | "Autre";

export interface Club {
  id: string;
  name: string;
  ownerId: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  horaires: string;
  googleReview?: string;
  mapsLink?: string;
  logo?: string;
  primaryColor?: string;
  createdAt: string;
  plan?: 'basic' | 'classic' | 'premium';
  isActive?: boolean;
  coaches?: CoachInfo[];
  settings?: {
    defaultProgramDuration?: number;
    loyalty?: {
      pointsPerWorkout: number;
      tiers: { id: string; points: number; reward: string }[];
    };
    payment?: {
      stripeConnected: boolean;
      stripeAccountId?: string;
      stripeSecretKey?: string;
      acceptedMethods: string[];
      autoCollection: boolean;
    };
    booking?: {
      sessionDuration: number; // in minutes
      minAdvanceBookingHours?: number; // e.g., 24 for no same-day booking
      minCancellationHours?: number; // e.g., 24 for no last-minute cancellation
      maxBookingsPerWeek?: number; // e.g., 3
      schedule: {
        day: number; // 0 = Sunday, 1 = Monday, etc.
        slots: { start: string; end: string }[]; // e.g., { start: "09:00", end: "12:00" }
      }[];
    };
  };
}

export interface User {
  id: number;
  clubId: string;
  code: string;
  pwd: string;
  name: string;
  email?: string;
  phone?: string;
  stripeCustomerId?: string;
  credits?: number;
  role: Role;
  avatar: string;
  gender: Gender;
  age: number;
  birthDate?: string;
  weight: number;
  height: number;
  objectifs: Goal[];
  experienceLevel?: 'Débutant' | 'Intermédiaire' | 'Avancé';
  trainingDays?: number;
  sessionDuration?: number;
  equipment?: 'Salle complète' | 'Haltères/Kettlebells' | 'Poids du corps' | 'Élastiques';
  injuries?: string;
  notes: string;
  createdAt: string;
  xp: number;
  streak: number;
  lastWorkoutDate?: string;
  pointsFidelite: number;
  planRequested?: boolean;
  firebaseUid?: string;
  integrations?: {
    appleHealth?: boolean;
    myFitnessPal?: boolean;
  };
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
  };
}

export interface SupplementProduct {
  id: string;
  clubId: string;
  nom: string;
  prixVente: number;
  prixAchat: number;
  stock: number;
  cat: string;
}

export interface SupplementOrder {
  id: string;
  clubId: string;
  adherentId: number;
  coachName: string;
  date: string;
  mois: string;
  produits: { nom: string, quantite: number, prixUnitaire: number }[];
  total: number;
  pointsGagnes: number;
  status: 'requested' | 'completed' | 'cancelled';
}

export interface NutritionLog {
  id: string;
  clubId: string;
  userId: number;
  date: string; // YYYY-MM-DD
  foods: {
    id: string;
    name: string;
    quantity?: number;
    unit?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  }[];
}

export interface FixedCost {
  id: string;
  clubId: string;
  name: string;
  amount: number;
}

export interface CommissionPayment {
  id: string;
  clubId: string;
  coach: string;
  month: string;
  amount: number;
  date: string;
  notes: string;
}

export interface Exercise {
  id: number;
  clubId: string; // Can be 'global' or a specific clubId
  name: string;
  cat: string;
  equip: string;
  photo: string | null;
  perfId: string | null;
}

export interface ExerciseEntry {
  exId: number;
  sets: number | string;
  reps: string;
  rest: string;
  tempo: string;
  duration: string;
  notes: string;
  setGroup: number | null;
  setType: "normal" | "superset" | "biset" | "triset" | "giantset" | "dropset" | "custom" | null;
  setName: string | null;
}

export interface Day {
  name: string;
  isCoaching: boolean;
  duration?: number; // Duration in minutes
  exercises: ExerciseEntry[];
}

export interface Program {
  id: number;
  clubId: string;
  memberId: number;
  name: string;
  presetId: number | null;
  nbDays: number;
  durationWeeks?: number | null;
  startDate: string;
  completedWeeks: number[];
  currentDayIndex: number;
  days: Day[];
  memberRemarks?: string; // Remarques de l'adhérent
}

export interface Preset {
  id: number;
  clubId: string;
  name: string;
  objectifs: Goal[];
  remarks: string;
  nbDays: number;
  durationWeeks?: number | null;
  days: Day[];
  createdBy: number;
}

export interface SessionLog {
  id: number;
  clubId: string;
  memberId: number;
  date: string;
  week: number;
  isCoaching: boolean;
  dayName: string;
  exerciseData: Record<string, string>;
  exercises?: {
    exId: number;
    name: string;
    sets: { weight: string; reps: string; duration: string }[];
  }[];
  totalVolume?: number;
  notes?: string;
  score?: number;
  rpe?: number;
  duration?: number;
  coachId?: number;
}

export interface Performance {
  id: number;
  clubId: string;
  memberId: number;
  date: string;
  exId: string;
  weight: number;
  reps: number;
  duration?: string;
  fromCoaching: boolean;
}

export interface BodyData {
  id: number;
  clubId: string;
  memberId: number;
  date: string;
  weight: number;
  fat: number;
  muscle: number;
  photoBefore?: string;
  photoAfter?: string;
}

export interface CoachInfo {
  id: number;
  clubId: string;
  name: string;
  role: string;
  whatsapp: string;
  photo: string | null;
}

export interface ClubInfo {
  phone: string;
  email: string;
  googleReview: string;
  description: string;
  horaires: string;
  adresse: string;
  mapsLink: string;
}

export interface Message {
  id: number;
  clubId: string;
  from: number;
  to: number | null;
  text: string;
  date: string;
  read: boolean;
  file: string | null;
}

export interface FeedItem {
  id: number;
  clubId: string;
  userId: number;
  userName: string;
  type: 'pr' | 'session' | 'level';
  title: string;
  date: string;
}

export interface Prospect {
  id: number;
  firebaseUid?: string;
  clubId: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  status: 'lead' | 'contacted' | 'trial' | 'won' | 'lost';
  answers: Record<string, string>;
  notes?: string;
}

export interface Task {
  id: string;
  clubId: string;
  title: string;
  description: string;
  dueDate: string;
  assignedTo: string; // coach ID
  status: 'todo' | 'done';
  relatedMemberId?: number;
  relatedProspectId?: number;
}

export interface Plan {
  id: string;
  clubId: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly' | 'once';
  description: string;
  hasCommitment?: boolean;
  commitmentMonths?: number;
  isTTC?: boolean;
  paymentMethods?: string[];
  stripeProductId?: string;
  stripePriceId?: string;
}

export interface Subscription {
  id: string;
  clubId: string;
  memberId: number;
  planId: string;
  planName: string;
  price: number;
  billingCycle: 'monthly' | 'yearly' | 'once';
  startDate: string;
  endDate?: string;
  commitmentEndDate?: string;
  contractUrl?: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  stripeSubscriptionId?: string;
}

export interface Payment {
  id: string;
  clubId: string;
  memberId: number;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'failed';
  method: 'card' | 'sepa' | 'cash' | 'transfer';
  invoiceId?: string; // Added for CRM
  stripeChargeId?: string;
}

export interface Expense {
  id: string;
  clubId: string;
  amount: number;
  category: 'rent' | 'salary' | 'equipment' | 'marketing' | 'software' | 'other';
  date: string;
  description: string;
}

export interface Invoice {
  id: string;
  clubId: string;
  memberId: number;
  paymentId?: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'cancelled';
  number: string;
}

export interface Newsletter {
  id: number;
  clubId: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

export type Page = "home" | "users" | "presets" | "performances" | "charts" | "exercises" | "history" | "gift" | "about" | "settings" | "database" | "calendar" | "planning" | "trophy" | "workout" | "messages" | "feed" | "supplements" | "loyalty" | "prospects" | "marketing" | "ai_coach" | "crm_pipeline" | "crm_finances" | "crm_tasks" | "nutrition" | "admin" | "chat" | "profile" | "drive" | "community" | "coaching";

export type ActivityLevel = "Sédentaire" | "Légèrement actif" | "Modérément actif" | "Très actif" | "Extrêmement actif";

export interface Meal {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionPlan {
  id: string;
  memberId: number;
  clubId: string;
  createdAt: string;
  updatedAt: string;
  
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
  dietPreference?: string;
  
  bmr: number;
  tdee: number;
  targetCalories: number;
  
  protein: number;
  carbs: number;
  fat: number;
  
  meals: Meal[];
  liste_courses?: string[];
  aiGenerated?: boolean;
  durationWeeks?: number;
}

export enum AppointmentSource { PROSPECT = 'PROSPECT', SETTER = 'SETTER' }
export enum AttendanceStatus { SHOWED_UP = 'SHOWED_UP', NO_SHOW = 'NO_SHOW', CANCELLED = 'CANCELLED', PENDING = 'PENDING' }
export enum SignatureStatus { SIGNED = 'SIGNED', NOT_SIGNED = 'NOT_SIGNED', PENDING = 'PENDING' }

export interface CRMClient {
  id: string;
  clubId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  signedAt?: string;
  formulaId?: string;
  isActive: boolean;
  deactivatedAt?: string;
}

export interface CRMFormula {
  id: string;
  clubId: string;
  name: string;
  price: number;
  period: 'week' | 'month' | 'year';
}

export interface ManualStats {
  id: string;
  clubId: string;
  period_start: string;
  period_type: 'day' | 'week' | 'month';
  totalContacts: number;
  appointmentsTaken: number;
  appointmentsProspect: number;
  appointmentsSetter: number;
  showedUp: number;
  noShow: number;
  cancelled: number;
  signed: number;
  notSigned: number;
  totalCalls: number;
  totalPickups: number;
  contactsDigital: number;
  contactsNonDigital: number;
  notes?: string;
}

export interface DailyLog {
  id: string;
  clubId: string;
  date: string;
  appointments: number;
  showedUp: number;
  signed: number;
  notSigned: number;
  pending: number;
  noShow: number;
  digital: number;
  nonDigital: number;
}

export interface PendingProspect {
  id: string;
  clubId: string;
  email: string;
  createdAt: string;
  reminderDate: string;
  status: 'PENDING' | 'CONTACTED';
}

export interface Booking {
  id: string;
  clubId: string;
  memberId: number;
  coachId: string; // The coach's ID
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: 'confirmed' | 'cancelled';
  type: 'coaching';
}

export interface DriveFile {
  id: string;
  clubId: string;
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
  folderId: string | null;
  uploadedBy: number;
  createdAt: string;
  sharedWith: number[]; // Array of member IDs it is shared with
}

export interface DriveFolder {
  id: string;
  clubId: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface AppState {
  user: User | null;
  currentClub: Club | null;
  users: User[];
  exercises: Exercise[];
  programs: Program[];
  presets: Preset[];
  logs: SessionLog[];
  messages: Message[];
  bodyData: BodyData[];
  performances: Performance[];
  archivedPrograms: Program[];
  feed: FeedItem[];
  supplementProducts: SupplementProduct[];
  supplementOrders: SupplementOrder[];
  fixedCosts: FixedCost[];
  expenses: Expense[];
  invoices: Invoice[];
  commissionPayments: CommissionPayment[];
  prospects: Prospect[];
  tasks: Task[];
  plans: Plan[];
  subscriptions: Subscription[];
  payments: Payment[];
  newsletters: Newsletter[];
  nutritionPlans: NutritionPlan[];
  nutritionLogs: NutritionLog[];
  crmClients: CRMClient[];
  crmFormulas: CRMFormula[];
  manualStats: ManualStats[];
  pendingProspects: PendingProspect[];
  bookings: Booking[];
  driveFiles: DriveFile[];
  driveFolders: DriveFolder[];
  aboutInfo: ClubInfo;
  coaches: CoachInfo[];
  page: Page;
  selectedMember: User | null;
  selectedDay: number;
  editingProg: Program | null;
  editingPreset: Preset | null;
  workout: Program | null;
  workoutIsProgramSession?: boolean;
  workoutData: Record<string, string>;
  workoutMember: User | null;
  validatedExercises: number[];
  modal: string | null;
  toast: { message: string, type: 'success' | 'error' | 'info' } | null;
  aiSuggestion?: string;
  memberFilter?: string;
}
