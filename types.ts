
export type Role = "superadmin" | "owner" | "manager" | "coach" | "member";
/** Product and authenticated roles share the same explicit live model. */
export type ProductRole = Role;
export type SaasPlanId = string;
export type AccountType = 'solo' | 'studio';
export type Gender = "F" | "M";
export type Goal = "Perte de poids" | "Prise de masse" | "Sport santé bien-être" | "Prépa physique" | "Remise en forme" | "Performance sportive" | "Renforcement musculaire" | "Souplesse et mobilité" | "Autre";

export interface Club {
  id: string;
  /** Canonical product type. Absent on legacy clubs; never inferred from plan/notes. */
  accountType?: AccountType;
  /** Explicit SaaS offer; independent of the member-facing Plan and legacy plan. */
  saasPlanId?: SaasPlanId;
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
  /** Historical commercial plan, independent of accountType. */
  plan?: 'basic' | 'classic' | 'premium';
  isActive?: boolean;
  canAddStaff?: boolean;
  coaches?: CoachInfo[];
  settings?: {
    onboarding?: { requireInitialAssessment: boolean; initialAssessmentTemplateId?: string };
    defaultProgramDuration?: number;
    finances?: {
      monthlyGoal?: number;
      yearlyGoal?: number;
      vatRates?: {
        standard: number; // e.g. 20
        reduced: number; // e.g. 5.5
      };
    };
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
    canAddStaff?: boolean;
    booking?: {
      enabled?: boolean;
      sessionTypes?: { id: string; name: string; duration: number; maxParticipants?: number }[];
      sessionDuration: number; // in minutes (legacy/default)
      minAdvanceBookingHours?: number; // e.g., 24 for no same-day booking
      minCancellationHours?: number; // e.g., 24 for no last-minute cancellation
      maxBookingsPerWeek?: number; // e.g., 3
      schedule: {
        day: number; // 0 = Sunday, 1 = Monday, etc.
        slots: { start: string; end: string; sessionTypeId?: string; coachId?: string }[]; // e.g., { start: "09:00", end: "12:00" }
      }[];
    };
  };
}

export interface Notification {
  id: string;
  clubId: string;
  userId: number; // The user who receives the notification
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string; // Optional link to navigate to
}

export interface UserDocument {
  id: string;
  name: string;
  category: 'Certificat médical' | 'Formulaire d\'inscription' | 'Consentement parent' | 'Pièce d\'identité' | 'Autre';
  url: string;
  type: string; // e.g., 'application/pdf', 'image/jpeg'
  uploadDate: string;
}

export interface User {
  id: number;
  clubId: string;
  code: string;
  pwd: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  stripeCustomerId?: string;
  stripeCustomerClubId?: string;
  credits?: number;
  sessionCredits?: Record<string, number>;
  onboardingCompleted?: boolean;
  sourceProspectUid?: string;
  /** Converted CRM members retain technical legacy defaults until real measures are supplied. */
  profileMeasurementsPending?: boolean;
  paymentStatus?: 'active' | 'suspended';
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
  coachingNotesHistory?: { id: string; date: string; content: string; authorUid?: string; authorName?: string }[];
  createdAt: string;
  xp: number;
  streak: number;
  lastWorkoutDate?: string;
  lastCheckInDate?: string;
  pointsFidelite: number;
  planRequested?: boolean;
  firebaseUid?: string;
  assignedCoachUid?: string;
  assignedMemberIds?: number[];
  isSuspended?: boolean;
  status?: 'active' | 'paused';
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
  documents?: UserDocument[];
}

export interface SupplementProduct {
  id: string;
  clubId: string;
  nom: string;
  prixVente: number;
  prixAchat: number;
  stock: number;
  cat: string;
  lienPartenaire?: string;
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
  videoUrl?: string; // Added for video support
  perfId: string | null;
  /** Optional knowledge-base fields. Old exercise documents remain valid. */
  description?: string;
  instructions?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  exerciseType?: 'strength' | 'cardio' | 'timed' | 'distance' | 'mobility' | 'other';
  /** Archived exercises remain resolvable by existing programs and session history. */
  isArchived?: boolean;
  createdByUid?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExerciseEntry {
  exId: number;
  sets: number | string;
  reps: string;
  rest: string;
  tempo: string;
  duration: string;
  notes: string;
  targetLoad?: string; // Coach prescription, distinct from completed set weight.
  targetRpe?: string; // Coach prescription, distinct from SessionLog feedback RPE.
  targetRir?: string;
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
  objectifs?: Goal[];
  nbDays: number;
  durationWeeks?: number | null;
  startDate: string;
  completedWeeks: number[];
  currentDayIndex: number;
  days: Day[];
  memberRemarks?: string; // Remarques de l'adhérent
  coachRemarks?: string;
  isPlannedSession?: boolean;
  bookingId?: string;
  originalProgramId?: number;
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
  completedAt?: string; // Server confirmation time; legacy logs may only have a calendar date.
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
  memberFeedback?: { energy: number; pain: boolean; painArea: string; comment: string; submittedAt: string };
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
  id: number | string;
  senderUid?: string;
  recipientUid?: string;
  clubId: string;
  assignedCoachUid?: string;
  from: number;
  to: number | null;
  text: string;
  date: string;
  read: boolean;
  file: string | null;
}

export interface FeedItem {
  id: string | number;
  clubId: string;
  userId: number;
  userName: string;
  type: 'pr' | 'session' | 'level';
  title: string;
  date: string;
}

export interface ProspectNote {
  id: string;
  date: string; // ISO format
  content: string;
  authorUid?: string;
  authorName?: string;
}

export interface ProspectActivity { id: string; date: string; label: string; authorUid?: string; kind?: 'note' | 'call' | 'email' | 'message'; content?: string; noteId?: string; }

export interface Prospect {
  id: number;
  firebaseUid?: string;
  clubId: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  status: 'lead' | 'contacted' | 'trial' | 'call_pending' | 'won' | 'lost' | 'pending';
  answers: Record<string, string>;
  notes?: string;
  notesHistory?: ProspectNote[];
  nextReminderDate?: string; // ISO format
  source?: string;
  firstName?: string;
  lastName?: string;
  proposedOffer?: string; // Commercial intention only; never a billing subscription.
  tags?: string[];
  nextAction?: string;
  lastContactAt?: string; // Explicitly recorded interaction, not a mailto/tel click.
  assignedCoachUid?: string | null;
  activityHistory?: ProspectActivity[];
  lostReason?: string;
  lostAt?: string;
  convertedMemberUid?: string;
  convertedMemberId?: number;
  convertedAt?: string;
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
  currency?: string;
  vatRate?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  stripeProductId?: string;
  stripePriceId?: string;
  credits?: number; // Number of credits given per billing cycle
  creditsInterval?: 'weekly' | 'monthly' | 'cycle';
  sessionCredits?: Record<string, number>; // Credits per session type
  sessionCreditsIntervals?: Record<string, 'weekly' | 'monthly' | 'cycle'>;
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
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'pending';
  currency?: string;
  vatRate?: number | null;
  isTTC?: boolean;
  collectionMode?: 'manual' | 'stripe';
  stripePriceId?: string;
  memberUid?: string;
  creditsGrantedAt?: string;
  creditGrant?: { credits: number; sessionCredits: Record<string, number> };
  stripeSubscriptionId?: string;
}

export interface Payment {
  id: string;
  clubId: string;
  memberId: number;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded' | 'partially_refunded';
  currency?: string;
  subscriptionId?: string;
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  refundedAmount?: number;
  refundStatus?: string;
  description?: string;
  method: 'card' | 'sepa' | 'cash' | 'transfer';
  category?: 'subscription' | 'coaching' | 'boutique' | 'other';
  vatRate?: number; // e.g. 20 or 5.5
  invoiceId?: string; // Added for CRM
  stripeChargeId?: string;
}

export interface Expense {
  id: string;
  clubId: string;
  amount: number;
  category: 'rent' | 'salary' | 'equipment' | 'marketing' | 'software' | 'other';
  vatRate?: number; // e.g. 20
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
  documentType?: 'receipt';
  currency?: string;
  vatRate?: number | null;
  clubName?: string;
  memberName?: string;
  memberEmail?: string;
}

export interface Newsletter {
  id: number;
  clubId: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

export type Page = "onboarding" | "retention" | "pulse" | "team" | "home" | "users" | "presets" | "performances" | "charts" | "exercises" | "history" | "gift" | "about" | "settings" | "database" | "calendar" | "planning" | "trophy" | "workout" | "messages" | "feed" | "supplements" | "loyalty" | "prospects" | "marketing" | "ai_coach" | "crm_pipeline" | "crm_finances" | "crm_tasks" | "nutrition" | "admin" | "chat" | "profile" | "drive" | "community" | "coaching" | "notifications" | "guide" | "evolution";

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
  liste_courses?: { id: string; name: string; checked: boolean }[];
  aiGenerated?: boolean;
  durationWeeks?: number;
}

// Modèle de plan nutritionnel (Modèles / Presets)
export interface NutritionPreset {
  id: string;
  clubId: string;
  name: string;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: Meal[];
  liste_courses?: { id: string; name: string; checked: boolean }[];
  dietPreference?: string;
  goal?: Goal;
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
  name?: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  reminderDate: string;
  status: 'PENDING' | 'CONTACTED';
}

export interface Booking {
  id: string;
  clubId: string;
  memberId?: number;
  prospectId?: number;
  prospectUid?: string;
  coachUid?: string;
  attendanceStatus?: AttendanceStatus;
  attendanceMarkedAt?: string;
  attendanceMarkedByUid?: string;
  attendanceUpdatedAt?: string;
  attendanceUpdatedByUid?: string;
  attendanceRevision?: number;
  coachId: string; // The coach's ID
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: 'confirmed' | 'cancelled' | 'completed' | 'rejected' | 'pending';
  type: 'coaching' | 'trial';
  sessionTypeId?: string;
  /** Server-owned identity and accounting fields; never edited directly by clients. */
  memberUid?: string;
  assignedCoachUid?: string;
  creditDebited?: boolean;
}

export interface DriveFile {
  id: string;
  clubId: string;
  name: string;
  /** Legacy bearer URL; ignored by all Drive readers. */
  url?: string;
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

export interface Product {
  id: string;
  clubId: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: 'supplement' | 'clothing' | 'equipment' | 'other';
  imageUrl?: string;
}

export interface ProgressPhoto {
  id: string;
  clubId: string;
  memberId: number;
  date: string;
  frontUrl?: string;
  sideUrl?: string;
  backUrl?: string;
  weight?: number;
  visibility?: 'private' | 'coach';
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    arm?: number;
    thigh?: number;
    calf?: number;
  };
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
  products: Product[];
  commissionPayments: CommissionPayment[];
  prospects: Prospect[];
  tasks: Task[];
  plans: Plan[];
  subscriptions: Subscription[];
  payments: Payment[];
  newsletters: Newsletter[];
  nutritionPlans: NutritionPlan[];
  nutritionLogs: NutritionLog[];
  nutritionPresets?: NutritionPreset[];
  crmClients: CRMClient[];
  crmFormulas: CRMFormula[];
  manualStats: ManualStats[];
  pendingProspects: PendingProspect[];
  bookings: Booking[];
  driveFiles: DriveFile[];
  driveFolders: DriveFolder[];
  progressPhotos: ProgressPhoto[];
  notifications: Notification[];
  aboutInfo: ClubInfo;
  coaches: CoachInfo[];
  page: Page;
  /** One-time UI request consumed by its destination page; never persisted to Firebase. */
  pendingUiAction?: 'add-member' | 'add-preset' | 'add-prospect' | 'edit-space' | 'booking-settings';
  pendingProspectUid?: string;
  onboardingDataReady?: boolean;
  selectedMember: User | null;
  selectedDay: number;
  editingProg: Program | null;
  editingPreset: Preset | null;
  viewingProg?: Program | null;
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
