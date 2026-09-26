
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, AppState, Program, Preset, SessionLog, Performance, BodyData, Message, FeedItem,
  SupplementProduct, SupplementOrder, FixedCost, CommissionPayment, Prospect, Newsletter, Club, Exercise,
  Task, Subscription, Payment, Plan, NutritionPlan, NutritionLog, CRMClient, CRMFormula, ManualStats, PendingProspect, Expense, Invoice, Booking, DriveFile, DriveFolder, Product, ProgressPhoto, NutritionPreset
} from './types';
import type { Notification } from './types';
import { 
  INIT_EXERCISES, CLUB_INFO, COACHES, CATEGORY_MEDIA, getExerciseMedia 
} from './constants';
import { 
  apiFetch, auth, db, getMessagingClient, firebaseConfig,
  onAuthStateChanged, signOut, 
  doc, getDoc, getDocFromServer, setDoc, onSnapshot as originalOnSnapshot, updateDoc, collection, deleteDoc, query, where, getDocs
} from './firebase';

const isGcpBillingOrSuspendedError = (error: any): boolean => {
  if (!error) return false;
  const errMsg = (error?.message || String(error)).toLowerCase();
  const mentionsBilling = errMsg.includes('billing');
  return errMsg.includes('suspended') || (
    mentionsBilling && (
      errMsg.includes('disabled') ||
      errMsg.includes('not enabled') ||
      errMsg.includes('required') ||
      errMsg.includes('closed')
    )
  );
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const getRefPath = (ref: any): string | null => {
  if (!ref) return null;
  if (typeof ref.path === 'string') return ref.path;
  if (ref._query && ref._query.path && typeof ref._query.path.toString === 'function') {
    return ref._query.path.toString();
  }
  if (ref.collection && typeof ref.collection.path === 'string') {
    return ref.collection.path;
  }
  return null;
};

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const code = (error as any)?.code || 'unknown';
  const collectionName = path?.split('/')[0] || 'query';
  console.error('Firestore listener failed', { code, operationType, collection: collectionName });
  return code;
};

const onSnapshot = (ref: any, callback: any) => {
  return originalOnSnapshot(ref, callback, (error: any) => {
    const path = getRefPath(ref);
    const code = handleFirestoreError(error, OperationType.GET, path);
    if (isGcpBillingOrSuspendedError(error)) {
      window.dispatchEvent(new CustomEvent('gcp-billing-error'));
    } else {
      window.dispatchEvent(new CustomEvent('firestore-listener-error', { detail: { code } }));
    }
  });
};

// Layout & UI
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Toast } from './components/Toast';
import { Onboarding } from './components/Onboarding';

// Routing & Marketing Pages
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LandingLayout from './components/LandingLayout';

const lazyNamed = <T extends object>(load: () => Promise<T>, exportName: keyof T) =>
  React.lazy(async () => ({ default: (await load())[exportName] as React.ComponentType<any> }));

const WorkoutView = lazyNamed(() => import('./components/WorkoutView'), 'WorkoutView');
const CoachingSessionView = lazyNamed(() => import('./components/CoachingSessionView'), 'CoachingSessionView');
const ProgramEditor = lazyNamed(() => import('./components/Editor'), 'ProgramEditor');
const CoachDashboard = lazyNamed(() => import('./components/CoachDashboard'), 'CoachDashboard');
const MemberDashboard = lazyNamed(() => import('./components/MemberDashboard'), 'MemberDashboard');
const MembersPage = lazyNamed(() => import('./pages/MembersPage'), 'MembersPage');
const CoachingPage = lazyNamed(() => import('./pages/CoachingPage'), 'CoachingPage');
const PresetsPage = lazyNamed(() => import('./pages/PresetsPage'), 'PresetsPage');
const ExercisesPage = lazyNamed(() => import('./pages/ExercisesPage'), 'ExercisesPage');
const MessagesPage = lazyNamed(() => import('./pages/MessagesPage'), 'MessagesPage');
const AboutPage = lazyNamed(() => import('./pages/AboutPage'), 'AboutPage');
const SettingsPage = lazyNamed(() => import('./pages/SettingsPage'), 'SettingsPage');
const StatsPage = lazyNamed(() => import('./pages/StatsPage'), 'StatsPage');
const CalendarPage = lazyNamed(() => import('./pages/CalendarPage'), 'CalendarPage');
const TrophyPage = lazyNamed(() => import('./pages/TrophyPage'), 'TrophyPage');
const HistoryPage = lazyNamed(() => import('./pages/HistoryPage'), 'HistoryPage');
const AICoachPage = lazyNamed(() => import('./pages/AICoachPage'), 'AICoachPage');
const ProspectFlowPage = lazyNamed(() => import('./pages/ProspectFlowPage'), 'ProspectFlowPage');
const TasksPage = lazyNamed(() => import('./pages/TasksPage'), 'TasksPage');
const FinancesPage = lazyNamed(() => import('./pages/FinancesPage'), 'FinancesPage');
const ProfilePage = lazyNamed(() => import('./pages/ProfilePage'), 'ProfilePage');
const PlanningPage = lazyNamed(() => import('./pages/PlanningPage'), 'PlanningPage');
const NutritionPage = lazyNamed(() => import('./pages/NutritionPage'), 'NutritionPage');
const MemberNutritionPage = lazyNamed(() => import('./pages/MemberNutritionPage'), 'MemberNutritionPage');
const MarketingPage = lazyNamed(() => import('./pages/MarketingPage'), 'MarketingPage');
const AdminDashboard = lazyNamed(() => import('./pages/AdminDashboard'), 'AdminDashboard');
const MemberSupplementsPage = lazyNamed(() => import('./pages/MemberSupplementsPage'), 'MemberSupplementsPage');
const DrivePage = lazyNamed(() => import('./pages/DrivePage'), 'DrivePage');
const EvolutionGalleryPage = lazyNamed(() => import('./pages/EvolutionGalleryPage'), 'EvolutionGalleryPage');
const GuidePage = lazyNamed(() => import('./pages/GuidePage'), 'GuidePage');

const HomePage = React.lazy(() => import('./pages/HomePage'));
const FeaturesPage = React.lazy(() => import('./pages/FeaturesPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const AboutPageMarketing = React.lazy(() => import('./pages/AboutPageMarketing'));
const SolutionsPage = React.lazy(() => import('./pages/UseCases'));
const HelpCenterPage = React.lazy(() => import('./pages/HelpCenter'));
const BlogPage = React.lazy(() => import('./pages/Blog'));
const BlogPostPage = React.lazy(() => import('./pages/BlogPost'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const SeoLandingPage = React.lazy(() => import('./pages/SeoLandingPage'));
const MentionsLegales = lazyNamed(() => import('./pages/Legal'), 'MentionsLegales');
const CGV = lazyNamed(() => import('./pages/Legal'), 'CGV');
const Confidentialite = lazyNamed(() => import('./pages/Legal'), 'Confidentialite');

const INITIAL_STATE: AppState = {
  user: null,
  currentClub: null,
  users: [],
  exercises: INIT_EXERCISES,
  programs: [],
  presets: [],
  nutritionPresets: [],
  logs: [],
  messages: [],
  bodyData: [],
  performances: [],
  archivedPrograms: [],
  feed: [],
  supplementProducts: [],
  supplementOrders: [],
  fixedCosts: [],
  expenses: [],
  invoices: [],
  products: [],
  commissionPayments: [],
  prospects: [],
  tasks: [],
  plans: [],
  subscriptions: [],
  payments: [],
  newsletters: [],
  nutritionPlans: [],
  nutritionLogs: [],
  crmClients: [],
  crmFormulas: [],
  manualStats: [],
  pendingProspects: [],
  bookings: [],
  driveFiles: [],
  driveFolders: [],
  progressPhotos: [],
  notifications: [],
  aboutInfo: {
    phone: '',
    email: '',
    googleReview: '',
    description: '',
    horaires: '',
    adresse: '',
    mapsLink: ''
  },
  coaches: [],
  page: 'home',
  selectedMember: null,
  selectedDay: 0,
  editingProg: null,
  editingPreset: null,
  workout: null,
  workoutData: {},
  workoutMember: null,
  validatedExercises: [],
  modal: null,
  toast: null
};

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [connectionTested, setConnectionTested] = useState(false);
  const [gcpBillingError, setGcpBillingError] = useState<string | null>(null);
  const [firebaseConnectionIssue, setFirebaseConnectionIssue] = useState<'permission' | 'temporary' | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (state.user) {
      if (location.pathname === '/login' || location.pathname === '/register') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [state.user, location.pathname, navigate]);

  const [adminPerspective, setAdminPerspective] = useState<'superadmin' | 'coach' | 'member'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('velatra_admin_perspective');
      if (saved === 'superadmin' || saved === 'coach' || saved === 'member') {
        return saved;
      }
    }
    return 'superadmin';
  });

  const handlePerspectiveChange = (p: 'superadmin' | 'coach' | 'member') => {
    setAdminPerspective(p);
    localStorage.setItem('velatra_admin_perspective', p);
  };

  useEffect(() => {
    const handleBillingError = (e: Event) => {
      console.warn("Firebase project billing or suspension error caught.");
      setGcpBillingError("suspended");
      setLoading(false);
    };
    const handleListenerError = (event: Event) => {
      const code = (event as CustomEvent).detail?.code;
      setFirebaseConnectionIssue(code === 'permission-denied' ? 'permission' : 'temporary');
    };
    window.addEventListener('gcp-billing-error', handleBillingError);
    window.addEventListener('firestore-listener-error', handleListenerError);
    return () => {
      window.removeEventListener('gcp-billing-error', handleBillingError);
      window.removeEventListener('firestore-listener-error', handleListenerError);
    };
  }, []);

  const [navigatorOnline, setNavigatorOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isOfflineBackupActive, setIsOfflineBackupActive] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('velatra_offline_backup_forced') === 'true';
    }
    return false;
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setNavigatorOnline(true);
      showToast("Vous êtes de nouveau en ligne !", "success");
    };
    const handleOffline = () => {
      setNavigatorOnline(false);
      showToast("Connexion internet perdue. Passage en mode cache local.", "info");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const queueForSync = (type: string, data: any) => {
    try {
      const currentQueue = JSON.parse(localStorage.getItem('velatra_pending_sync') || '[]');
      currentQueue.push({ type, data, timestamp: Date.now() });
      localStorage.setItem('velatra_pending_sync', JSON.stringify(currentQueue));
      
      if (type === 'logs') {
        setState(prev => ({ ...prev, logs: [data, ...prev.logs] }));
      } else if (type === 'performances') {
        setState(prev => ({ ...prev, performances: [...data, ...prev.performances] }));
      } else if (type === 'nutrition_log') {
        setState(prev => {
          const rest = prev.nutritionLogs.filter(l => l.id !== data.id);
          return { ...prev, nutritionLogs: [data, ...rest] };
        });
      }
    } catch (err) {
      console.error("Failed to queue item for local sync:", err);
    }
  };

  const triggerSync = async () => {
    if (syncing) return;
    const queue = JSON.parse(localStorage.getItem('velatra_pending_sync') || '[]');
    if (queue.length === 0) {
      showToast("Toutes vos données locales sont déjà synchronisées.", "success");
      return;
    }
    if (!navigator.onLine || gcpBillingError) {
      showToast("Connexion internet ou serveur toujours inaccessible.", "error");
      return;
    }
    
    setSyncing(true);
    showToast("Synchronisation des logs vers le serveur...", "info");
    
    let isSuccess = true;
    const remainingQueue: any[] = [];
    
    for (const item of queue) {
      try {
        if (item.type === 'logs') {
          await setDoc(doc(db, "logs", item.data.id.toString()), item.data);
        } else if (item.type === 'performances') {
          for (const p of item.data) {
            await setDoc(doc(db, "performances", p.id.toString()), p);
          }
        } else if (item.type === 'delete_program') {
          await deleteDoc(doc(db, "programs", item.data.id.toString()));
        } else if (item.type === 'nutrition_log') {
          await setDoc(doc(db, "nutritionLogs", item.data.id), item.data);
        }
      } catch (err) {
        console.error("Failed to sync item:", item, err);
        isSuccess = false;
        remainingQueue.push(item);
      }
    }
    
    localStorage.setItem('velatra_pending_sync', JSON.stringify(remainingQueue));
    setSyncing(false);
    
    if (isSuccess) {
      showToast("Toutes vos données et logs locaux ont été synchronisés !", "success");
    } else {
      showToast(`Certains éléments n'ont pas pu être synchronisés. (${remainingQueue.length} restants)`, "error");
    }
  };

  useEffect(() => {
    if (!connectionTested) {
      const testConnection = async () => {
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
          setGcpBillingError(null);
          setLoading(false);
        } catch (error: any) {
          const errMsg = error?.message || String(error);
          if (errMsg.includes('the client is offline') || !navigator.onLine) {
            console.warn("Client offline detected, entering offline cache backup mode.");
            setIsOfflineBackupActive(true);
            setLoading(false);
          } else if (isGcpBillingOrSuspendedError(error)) {
            setGcpBillingError("suspended");
            setLoading(false);
          } else {
            setFirebaseConnectionIssue(error?.code === 'permission-denied' ? 'permission' : 'temporary');
            console.warn("Firebase connection check failed", { code: error?.code || 'unknown' });
            setLoading(false);
          }
        }
      };
      testConnection();
      setConnectionTested(true);
    }
  }, [connectionTested]);

  useEffect(() => {
    let unsubUserDoc: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthResolved(true);
      // Never carry locally cached health, program, or club data across sessions.
      if (typeof window !== 'undefined') {
        ['user', 'currentClub', 'programs', 'logs', 'performances', 'nutritionPlans', 'nutritionLogs']
          .forEach(key => localStorage.removeItem(`velatra_cache_${key}`));
      }
      setState({ ...INITIAL_STATE, exercises: [...INIT_EXERCISES] });
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Listen to the user document so it updates automatically when created during registration
        unsubUserDoc = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            
            // Elevated roles are assigned by the verified server endpoint, never by the browser.
            if (firebaseUser.email === 'victor.defreitas.pro@gmail.com' && firebaseUser.emailVerified && userData.role !== 'superadmin') {
              try {
                await apiFetch('/api/bootstrap-superadmin', { method: 'POST' });
                return;
              } catch (error) {
                console.error("Admin initialization failed", error);
              }
            }
            if (userData.role === 'superadmin' && (firebaseUser.email !== 'victor.defreitas.pro@gmail.com' || !firebaseUser.emailVerified)) {
              userData.role = 'member';
            }
            
            const cachedUser = { ...userData, id: Number(userData.id), firebaseUid: firebaseUser.uid };
            setState(prev => ({ ...prev, user: cachedUser }));

            // Move any old Stripe key out of the club document before loading client-readable settings.
            if (cachedUser.role === 'owner' || cachedUser.role === 'superadmin') {
              try {
                await apiFetch('/api/stripe/status');
              } catch (error) {
                console.error("Could not migrate legacy Stripe settings.", error);
              }
            }
            
            // Fetch Club Data
            if (userData.clubId) {
              const clubDoc = await getDoc(doc(db, "clubs", userData.clubId));
              if (clubDoc.exists()) {
                const clubData = clubDoc.data() as Club;
                setState(prev => ({ ...prev, currentClub: clubData }));
              }
            }
          } else {
            // Document not created yet (happens during registration)
            setState(prev => ({ ...prev, user: null }));
            
            // Recover the administrator profile through a verified server-side operation.
            if (firebaseUser.email === 'victor.defreitas.pro@gmail.com' && firebaseUser.emailVerified) {
              try {
                await apiFetch('/api/bootstrap-superadmin', { method: 'POST' });
              } catch (err) {
                console.error("Admin recovery failed", err);
              }
            }
          }
          setLoading(false);
        });
      } else {
        if (unsubUserDoc) unsubUserDoc();
        setState(prev => ({ ...prev, user: null }));
        setLoading(false);
      }
    });
    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  useEffect(() => {
    const uid = state.user?.firebaseUid;
    if (!uid || state.user?.role !== 'coach') return;
    apiFetch('/api/coach/assigned-members')
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Impossible de charger les adhérents affectés.');
        const assignedMemberIds = Array.isArray(result.assignedMemberIds) ? result.assignedMemberIds.map(Number).filter(Number.isFinite) : [];
        setState((previous: AppState) => previous.user?.firebaseUid === uid
          ? { ...previous, user: { ...previous.user, assignedMemberIds } }
          : previous);
      })
      .catch(error => console.error('Coach assignment loading failed:', error));
  }, [state.user?.firebaseUid, state.user?.role]);

  useEffect(() => {
    if (!authResolved) return;
    if (!auth.currentUser || !state.user || state.user.firebaseUid !== auth.currentUser.uid || !state.user.clubId) return;

    // Check for onboarding success/cancel in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('onboarding_success') === 'true') {
      showToast("Paiement réussi ! Bienvenue chez VELATRA.", "success");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('onboarding_canceled') === 'true') {
      showToast("Paiement annulé.", "error");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const clubId = state.user.clubId;
    const isMember = state.user.role === 'member';
    const isCoach = state.user.role === 'coach';
    const ownId = Number(state.user.id);
    const assignedMemberIds = [...new Set((state.user.assignedMemberIds || []).map(Number).filter(Number.isFinite))];
    const memberRecordQueries = (collectionName: string, ownerField = 'memberId') => {
      if (isMember) return [query(collection(db, collectionName), where('clubId', '==', clubId), where(ownerField, '==', ownId))];
      if (isCoach) {
        return state.user?.firebaseUid
          ? [query(collection(db, collectionName), where('clubId', '==', clubId), where('assignedCoachUid', '==', state.user.firebaseUid))]
          : [];
      }
      return [query(collection(db, collectionName), where('clubId', '==', clubId))];
    };
    const subscribeMemberRecords = (collectionName: string, ownerField: string, callback: (snapshot: any) => void) => {
      const queries = memberRecordQueries(collectionName, ownerField);
      if (!queries.length) {
        callback({ docs: [], forEach: () => {}, docChanges: () => [] });
        return () => {};
      }
      if (queries.length === 1) return onSnapshot(queries[0], callback);
      const snapshots = new Map<number, any>();
      const subscriptions = queries.map((recordQuery, index) => onSnapshot(recordQuery, (snapshot: any) => {
        snapshots.set(index, snapshot);
        const documents = new Map<string, any>();
        snapshots.forEach(current => current.forEach((document: any) => documents.set(document.id, document)));
        callback({
          docs: [...documents.values()],
          forEach: (handler: (document: any) => void) => documents.forEach(handler),
          docChanges: () => snapshot.docChanges()
        });
      }));
      return () => subscriptions.forEach(unsubscribe => unsubscribe());
    };
    const skipForMembers = (key: string) => {
      if (!isMember) return false;
      setState(prev => ({ ...prev, [key]: [] }));
      return true;
    };

    const unsubClub = onSnapshot(doc(db, "clubs", clubId), (docSnap) => {
      if (docSnap.exists()) {
        const clubData = docSnap.data() as Club;
        setState(prev => ({
          ...prev,
          currentClub: clubData,
          coaches: clubData.coaches || [],
          aboutInfo: {
            phone: clubData.phone || "",
            email: clubData.email || "",
            googleReview: clubData.googleReview || "",
            description: clubData.description || "",
            horaires: clubData.horaires || "",
            adresse: clubData.address || "",
            mapsLink: clubData.mapsLink || ""
          }
        }));
      }
    });

    const unsubUsers = isMember ? (() => {
      setState(prev => ({ ...prev, users: prev.user ? [prev.user] : [] }));
      return () => {};
    })() : onSnapshot(isCoach
      ? query(collection(db, "users"), where("clubId", "==", clubId), where("role", "==", "member"), where("assignedCoachUid", "==", state.user!.firebaseUid))
      : query(collection(db, "users"), where("clubId", "==", clubId)), (snap) => {
      const allUsers: User[] = [];
      snap.forEach(d => {
        const data = d.data();
        allUsers.push({ 
          ...data, 
          id: Number(data.id) || 0,
          xp: Number(data.xp) || 0,
          streak: Number(data.streak) || 0,
          pointsFidelite: Number(data.pointsFidelite) || 0,
          firebaseUid: d.id 
        } as any);
      });
      setState(prev => ({ ...prev, users: allUsers }));
    });

    let isInitialProgsLoad = true;
    const unsubProgs = subscribeMemberRecords("programs", "memberId", (snap) => {
      const allProgs: Program[] = [];
      const now = new Date();
      let hasNewProgram = false;

      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const prog = change.doc.data() as Program;
          if (Number(prog.memberId) === Number(state.user?.id)) {
            hasNewProgram = true;
          }
        }
      });

      snap.forEach(d => {
        const data = d.data() as Program;

        if (data.durationWeeks && data.startDate) {
          const startDate = new Date(data.startDate);
          const endDate = new Date(startDate.getTime() + data.durationWeeks * 7 * 24 * 60 * 60 * 1000);
          
          if (now > endDate && !isMember) {
            // Archiver automatiquement le programme expiré
            const archiveRef = doc(db, "archivedPrograms", data.id.toString());
            setDoc(archiveRef, { 
              ...data, 
              endDate: now.toISOString().split('T')[0], 
              status: "expired" 
            }).then(() => {
              deleteDoc(doc(db, "programs", data.id.toString())).catch(console.error);
            }).catch(console.error);
            return; // Ne pas l'ajouter à la liste active
          }
        }

        allProgs.push({
          ...data,
          id: Number(data.id),
          memberId: Number(data.memberId)
        });
      });
      setState(prev => ({ ...prev, programs: allProgs }));

      if (!isInitialProgsLoad && hasNewProgram && 'Notification' in window && Notification.permission === 'granted') {
        new Notification("Nouveau programme", {
          body: "Un nouveau programme d'entraînement vous a été assigné.",
          icon: "/brand/velatra-mark.png"
        });
      }
      isInitialProgsLoad = false;
    });

    const unsubPresets = onSnapshot(query(collection(db, "presets"), where("clubId", "==", clubId)), (snap) => {
      const allPresets: Preset[] = [];
      snap.forEach(d => allPresets.push(d.data() as Preset));
      setState(prev => ({ ...prev, presets: allPresets }));
    });

    const unsubNutritionPresets = onSnapshot(query(collection(db, "nutritionPresets"), where("clubId", "==", clubId)), (snap) => {
      const allNutritionPresets: NutritionPreset[] = [];
      snap.forEach(d => allNutritionPresets.push(d.data() as NutritionPreset));
      setState(prev => ({ ...prev, nutritionPresets: allNutritionPresets }));
    });

    const unsubArchives = subscribeMemberRecords("archivedPrograms", "memberId", (snap) => {
      const allArchives: Program[] = [];
      snap.forEach(d => {
        const data = d.data();
        allArchives.push({
          ...data,
          id: Number(data.id),
          memberId: Number(data.memberId)
        } as Program);
      });
      setState(prev => ({ ...prev, archivedPrograms: allArchives }));
    });

    const unsubPerfs = subscribeMemberRecords("performances", "memberId", (snap) => {
      const perfs: Performance[] = [];
      snap.forEach(d => {
        const data = d.data();
        perfs.push({
          ...data,
          id: Number(data.id),
          memberId: Number(data.memberId),
          weight: Number(data.weight),
          reps: Number(data.reps)
        } as Performance);
      });
      setState(prev => ({ ...prev, performances: perfs }));
    });

    const unsubProducts = onSnapshot(query(collection(db, "supplementProducts"), where("clubId", "==", clubId)), (snap) => {
      const products: SupplementProduct[] = [];
      snap.forEach(d => products.push(d.data() as SupplementProduct));
      setState(prev => ({ ...prev, supplementProducts: products }));
    });

    const unsubBoutiqueProducts = onSnapshot(query(collection(db, "products"), where("clubId", "==", clubId)), (snap) => {
      const products: Product[] = [];
      snap.forEach(d => products.push(d.data() as Product));
      setState(prev => ({ ...prev, products }));
    });

    const unsubOrders = subscribeMemberRecords("supplementOrders", "adherentId", (snap) => {
      const orders: SupplementOrder[] = [];
      snap.forEach(d => orders.push(d.data() as SupplementOrder));
      setState(prev => ({ ...prev, supplementOrders: orders }));
    });

    const unsubLogs = subscribeMemberRecords("logs", "memberId", (snap) => {
      const logs: SessionLog[] = [];
      snap.forEach(d => {
        const data = d.data();
        logs.push({
          ...data,
          id: Number(data.id),
          memberId: Number(data.memberId)
        } as SessionLog);
      });
      setState(prev => ({ ...prev, logs }));
    });

    let isInitialMessagesLoad = true;
    let initialMessageSnapshots = 0;
    let messageQueryCount = 0;
    const messageSnapshots = new Map<string, Message>();
    const onMessagesChanged = (snap: any) => {
      let hasNewUnread = false;
      snap.docChanges().forEach((change: any) => {
        if (change.type === 'removed') {
          messageSnapshots.delete(change.doc.id);
          return;
        }
        const msg = change.doc.data() as Message;
        messageSnapshots.set(change.doc.id, msg);
        if (change.type === 'added' && !msg.read && msg.to === state.user?.id) hasNewUnread = true;
      });

      setState(prev => ({ ...prev, messages: Array.from(messageSnapshots.values()) }));
      if (!isInitialMessagesLoad && hasNewUnread && 'Notification' in window && Notification.permission === 'granted') {
        new Notification("Nouveau message", {
          body: "Vous avez reçu un nouveau message sur Velatra.",
          icon: "/brand/velatra-mark.png"
        });
      }
      initialMessageSnapshots += 1;
      if (initialMessageSnapshots >= messageQueryCount) isInitialMessagesLoad = false;
    };
    const messageQueries = isCoach
      ? [
          query(collection(db, "messages"), where("clubId", "==", clubId), where("assignedCoachUid", "==", state.user.firebaseUid), where("from", "==", ownId)),
          query(collection(db, "messages"), where("clubId", "==", clubId), where("assignedCoachUid", "==", state.user.firebaseUid), where("to", "==", ownId))
        ]
      : isMember
        ? [
            query(collection(db, "messages"), where("clubId", "==", clubId), where("from", "==", ownId)),
            query(collection(db, "messages"), where("clubId", "==", clubId), where("to", "==", ownId))
          ]
        : [query(collection(db, "messages"), where("clubId", "==", clubId))];
    messageQueryCount = messageQueries.length;
    const unsubMessageQueries = messageQueries.map(messageQuery => onSnapshot(messageQuery, onMessagesChanged));
    const unsubMessages = () => unsubMessageQueries.forEach(unsubscribe => unsubscribe());

    const unsubFeed = onSnapshot(query(collection(db, "feed"), where("clubId", "==", clubId)), (snap) => {
      const feed: FeedItem[] = [];
      const now = new Date().getTime();
      const fourDaysInMs = 4 * 24 * 60 * 60 * 1000;

      snap.forEach(d => {
        const item = { ...(d.data() as FeedItem), id: d.id };
        const itemTime = new Date(item.date).getTime();
        
        if (now - itemTime > fourDaysInMs) {
          // Supprimer automatiquement les activités de plus de 4 jours
          deleteDoc(doc(db, "feed", d.id)).catch(console.error);
        } else {
          feed.push(item);
        }
      });
      
      feed.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setState(prev => ({ ...prev, feed }));
    });

    const unsubBody = subscribeMemberRecords("bodyData", "memberId", (snap) => {
      const bodyData: BodyData[] = [];
      snap.forEach(d => {
        const data = d.data();
        bodyData.push({
          ...data,
          id: Number(data.id),
          memberId: Number(data.memberId),
          weight: Number(data.weight),
          fat: Number(data.fat),
          muscle: Number(data.muscle)
        } as BodyData);
      });
      setState(prev => ({ ...prev, bodyData }));
    });

    let isInitialProspectsLoad = true;
    const unsubProspects = skipForMembers('prospects') ? () => {} : onSnapshot(query(collection(db, "prospects"), where("clubId", "==", clubId)), (snap) => {
      const prospects: Prospect[] = [];
      let hasNewProspect = false;

      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          hasNewProspect = true;
        }
      });

      snap.forEach(d => prospects.push({ ...d.data(), firebaseUid: d.id } as Prospect));
      setState(prev => ({ ...prev, prospects }));

      if (!isInitialProspectsLoad && hasNewProspect && state.user?.role !== 'member' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification("Nouveau prospect", {
          body: "Un nouveau prospect a été ajouté ou s'est inscrit.",
          icon: "/brand/velatra-mark.png"
        });
      }
      isInitialProspectsLoad = false;
    });

    const unsubNewsletters = skipForMembers('newsletters') ? () => {} : onSnapshot(query(collection(db, "newsletters"), where("clubId", "==", clubId)), (snap) => {
      const newsletters: Newsletter[] = [];
      snap.forEach(d => newsletters.push(d.data() as Newsletter));
      setState(prev => ({ ...prev, newsletters: newsletters.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
    });

    let isInitialTasksLoad = true;
    const unsubTasks = skipForMembers('tasks') ? () => {} : onSnapshot(query(collection(db, "tasks"), where("clubId", "==", clubId)), (snap) => {
      const tasks: Task[] = [];
      let hasNewTask = false;
      let newTaskTitle = "";

      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const task = change.doc.data() as Task;
          if (task.status === 'todo' && task.assignedTo === String(state.user?.id)) {
            hasNewTask = true;
            newTaskTitle = task.title;
          }
        }
      });

      snap.forEach(d => tasks.push(d.data() as Task));
      setState(prev => ({ ...prev, tasks }));

      if (!isInitialTasksLoad && hasNewTask && 'Notification' in window && Notification.permission === 'granted') {
        new Notification("Nouvelle tâche", {
          body: `Vous avez une nouvelle tâche à accomplir : ${newTaskTitle}`,
          icon: "/brand/velatra-mark.png"
        });
      }
      isInitialTasksLoad = false;
    });

    let isInitialBookingsLoad = true;
    const unsubBookings = subscribeMemberRecords("bookings", "memberId", (snap) => {
      const bookings: Booking[] = [];
      let hasNewBooking = false;

      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const booking = change.doc.data() as Booking;
          if (booking.coachId === String(state.user?.id)) {
            hasNewBooking = true;
          }
        }
      });

      snap.forEach(d => bookings.push({ ...d.data(), id: d.id } as Booking));
      setState(prev => ({ ...prev, bookings }));

      if (!isInitialBookingsLoad && hasNewBooking && 'Notification' in window && Notification.permission === 'granted') {
        new Notification("Nouvelle réservation", {
          body: "Vous avez une nouvelle session de coaching réservée.",
          icon: "/brand/velatra-mark.png"
        });
      }
      isInitialBookingsLoad = false;
    });

    const unsubPlans = onSnapshot(query(collection(db, "plans"), where("clubId", "==", clubId)), (snap) => {
      const plans: Plan[] = [];
      snap.forEach(d => plans.push(d.data() as Plan));
      setState(prev => ({ ...prev, plans }));
    });

    let isInitialNutritionPlansLoad = true;
    const unsubNutritionPlans = subscribeMemberRecords("nutritionPlans", "memberId", (snap) => {
      const nutritionPlans: NutritionPlan[] = [];
      let hasNewNutritionPlan = false;

      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const plan = change.doc.data() as NutritionPlan;
          if (Number(plan.memberId) === Number(state.user?.id)) {
            hasNewNutritionPlan = true;
          }
        }
      });

      snap.forEach(d => {
        const data = d.data();
        nutritionPlans.push({
          ...data,
          memberId: Number(data.memberId)
        } as NutritionPlan);
      });
      setState(prev => ({ ...prev, nutritionPlans }));

      if (!isInitialNutritionPlansLoad && hasNewNutritionPlan && 'Notification' in window && Notification.permission === 'granted') {
        new Notification("Nouveau plan nutritionnel", {
          body: "Un nouveau plan nutritionnel vous a été assigné.",
          icon: "/brand/velatra-mark.png"
        });
      }
      isInitialNutritionPlansLoad = false;
    });

    const unsubNutritionLogs = subscribeMemberRecords("nutritionLogs", "userId", (snap) => {
      const nutritionLogs: NutritionLog[] = [];
      const now = new Date().getTime();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

      snap.forEach(d => {
        const item = d.data() as NutritionLog;
        const itemTime = new Date(item.date).getTime();
        
        if (now - itemTime > thirtyDaysInMs) {
          // Supprimer automatiquement les logs de plus de 30 jours
          deleteDoc(doc(db, "nutritionLogs", d.id)).catch(console.error);
        } else {
          nutritionLogs.push({
            ...item,
            userId: Number(item.userId)
          });
        }
      });
      setState(prev => ({ ...prev, nutritionLogs }));
    });

    const unsubSubscriptions = subscribeMemberRecords("subscriptions", "memberId", (snap) => {
      const subscriptions: Subscription[] = [];
      snap.forEach(d => {
        const data = d.data();
        subscriptions.push({
          ...data,
          memberId: Number(data.memberId)
        } as Subscription);
      });
      setState(prev => ({ ...prev, subscriptions }));
    });

    const unsubPayments = subscribeMemberRecords("payments", "memberId", (snap) => {
      const payments: Payment[] = [];
      snap.forEach(d => {
        const data = d.data();
        payments.push({
          ...data,
          memberId: Number(data.memberId)
        } as Payment);
      });
      setState(prev => ({ ...prev, payments }));
    });

    const unsubExpenses = skipForMembers('expenses') ? () => {} : onSnapshot(query(collection(db, "expenses"), where("clubId", "==", clubId)), (snap) => {
      const expenses: Expense[] = [];
      snap.forEach(d => expenses.push(d.data() as Expense));
      setState(prev => ({ ...prev, expenses }));
    });

    const unsubInvoices = skipForMembers('invoices') ? () => {} : onSnapshot(query(collection(db, "invoices"), where("clubId", "==", clubId)), (snap) => {
      const invoices: Invoice[] = [];
      snap.forEach(d => {
        const data = d.data();
        invoices.push({
          ...data,
          memberId: Number(data.memberId)
        } as Invoice);
      });
      setState(prev => ({ ...prev, invoices }));
    });

    const unsubFixedCosts = skipForMembers('fixedCosts') ? () => {} : onSnapshot(query(collection(db, "fixedCosts"), where("clubId", "==", clubId)), (snap) => {
      const fixedCosts: any[] = [];
      snap.forEach(d => fixedCosts.push(d.data()));
      setState(prev => ({ ...prev, fixedCosts }));
    });

    const clubIds = Array.from(new Set(["global", clubId]));
    const unsubExercises = onSnapshot(query(collection(db, "exercises"), where("clubId", "in", clubIds)), (snap) => {
      const fetchedExercises: Exercise[] = [];
      snap.forEach(d => fetchedExercises.push(d.data() as Exercise));
      
      const mergedExercises = [...INIT_EXERCISES];
      fetchedExercises.forEach(fetchedEx => {
        const index = mergedExercises.findIndex(ex => ex.id === fetchedEx.id);
        if (index >= 0) {
          mergedExercises[index] = fetchedEx;
        } else {
          mergedExercises.push(fetchedEx);
        }
      });
      
      const enhancedExercises = mergedExercises.map(ex => {
        const media = getExerciseMedia(ex.name, ex.cat || "Autre");
        
        // Check if the photo is missing, is one of the generic category photos, is an unsplash URL, or is a generated placeholder
        const isGenericPhoto = !ex.photo || 
                               Object.values(CATEGORY_MEDIA).some(m => m.photo === ex.photo) ||
                               ex.photo.includes('unsplash.com') ||
                               ex.photo.startsWith('https://placehold.co/');
        
        // Use the specific media from getExerciseMedia, or fallback to placeholder if it's still generic
        let photoUrl = ex.photo;
        if (isGenericPhoto) {
          photoUrl = media.photo || "";
        }

        // Check if the video is missing or is one of the generic category videos
        const isGenericVideo = !ex.videoUrl || Object.values(CATEGORY_MEDIA).some(m => m.videoUrl === ex.videoUrl);
        const videoUrl = isGenericVideo ? media.videoUrl : ex.videoUrl;

        return {
          ...ex,
          photo: photoUrl,
          videoUrl: videoUrl || ""
        };
      });
      
      setState(prev => ({ ...prev, exercises: enhancedExercises }));
    });

    const unsubCrmClients = skipForMembers('crmClients') ? () => {} : onSnapshot(query(collection(db, "crmClients"), where("clubId", "==", clubId)), (snap) => {
      const crmClients: CRMClient[] = [];
      snap.forEach(d => crmClients.push(d.data() as CRMClient));
      setState(prev => ({ ...prev, crmClients }));
    });

    const unsubCrmFormulas = skipForMembers('crmFormulas') ? () => {} : onSnapshot(query(collection(db, "crmFormulas"), where("clubId", "==", clubId)), (snap) => {
      const crmFormulas: CRMFormula[] = [];
      snap.forEach(d => crmFormulas.push(d.data() as CRMFormula));
      setState(prev => ({ ...prev, crmFormulas }));
    });

    const unsubManualStats = skipForMembers('manualStats') ? () => {} : onSnapshot(query(collection(db, "manualStats"), where("clubId", "==", clubId)), (snap) => {
      const manualStats: ManualStats[] = [];
      snap.forEach(d => manualStats.push(d.data() as ManualStats));
      setState(prev => ({ ...prev, manualStats }));
    });

    const unsubPendingProspects = skipForMembers('pendingProspects') ? () => {} : onSnapshot(query(collection(db, "pendingProspects"), where("clubId", "==", clubId)), (snap) => {
      const pendingProspects: PendingProspect[] = [];
      snap.forEach(d => pendingProspects.push(d.data() as PendingProspect));
      setState(prev => ({ ...prev, pendingProspects }));
    });

    const driveFilesQuery = isMember
      ? query(collection(db, "driveFiles"), where("clubId", "==", clubId), where("sharedWith", "array-contains", ownId))
      : query(collection(db, "driveFiles"), where("clubId", "==", clubId));
    const unsubDriveFiles = onSnapshot(driveFilesQuery, (snap) => {
      const driveFiles: DriveFile[] = [];
      snap.forEach(d => driveFiles.push(d.data() as DriveFile));
      setState(prev => ({ ...prev, driveFiles }));
    });

    const unsubDriveFolders = skipForMembers('driveFolders') ? () => {} : onSnapshot(query(collection(db, "driveFolders"), where("clubId", "==", clubId)), (snap) => {
      const driveFolders: DriveFolder[] = [];
      snap.forEach(d => driveFolders.push(d.data() as DriveFolder));
      setState(prev => ({ ...prev, driveFolders }));
    });

    const unsubNotifications = subscribeMemberRecords("notifications", "userId", (snap) => {
      const notifications: Notification[] = [];
      snap.forEach(d => notifications.push(d.data() as Notification));
      setState(prev => ({ ...prev, notifications }));
    });

    const unsubProgressPhotos = subscribeMemberRecords("progressPhotos", "memberId", (snap) => {
      const progressPhotos: ProgressPhoto[] = [];
      snap.forEach(d => progressPhotos.push({ id: d.id, ...d.data() } as ProgressPhoto));
      setState(prev => ({ ...prev, progressPhotos }));
    });

    return () => {
      unsubClub(); unsubUsers(); unsubProgs(); unsubPresets(); unsubNutritionPresets(); 
      unsubArchives(); unsubPerfs(); unsubProducts(); unsubOrders();
      unsubLogs(); unsubMessages(); unsubFeed(); unsubBody();
      unsubProspects(); unsubNewsletters(); unsubExercises();
      unsubTasks(); unsubBookings(); unsubPlans(); unsubSubscriptions(); unsubPayments(); unsubExpenses(); unsubInvoices(); unsubFixedCosts(); unsubNutritionPlans(); unsubNutritionLogs();
      unsubCrmClients(); unsubCrmFormulas(); unsubManualStats(); unsubPendingProspects(); unsubDriveFiles(); unsubDriveFolders(); unsubNotifications(); unsubProgressPhotos();
    };
  }, [state.user?.clubId, state.user?.role, state.user?.firebaseUid, state.user?.assignedMemberIds?.join(','), authResolved]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setState(prev => ({ ...prev, toast: { message, type } }));
    setTimeout(() => setState(prev => ({ ...prev, toast: null })), 3000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast("Déconnexion réussie");
    } catch (err) {
      showToast("Erreur", "error");
    }
  };

  const renderActivePageContent = (user: User) => {
    if (state.viewingProg) {
      return (
        <ProgramEditor 
          program={state.viewingProg}
          preset={null}
          exercises={state.exercises}
          clubId={user.clubId}
          member={(state.users || []).find(u => Number(u.id) === state.viewingProg!.memberId)}
          readOnly={true}
          onSave={() => {}}
          onCancel={() => setState(s => ({ ...s, viewingProg: null }))}
        />
      );
    }
    
    if (state.editingProg || state.editingPreset) {
      return (
        <ProgramEditor 
          program={state.editingProg}
          preset={state.editingPreset}
          exercises={state.exercises}
          clubId={user.clubId}
          allPresets={state.presets}
          member={state.editingProg ? (state.users || []).find(u => Number(u.id) === state.editingProg!.memberId) : undefined}
          onSave={async (data, action) => {
            const dataWithClub = { ...data, clubId: user.clubId };
            await setDoc(doc(db, state.editingProg ? "programs" : "presets", data.id.toString()), dataWithClub);
            
            if (state.editingProg) {
              const member = (state.users || []).find(u => Number(u.id) === state.editingProg!.memberId);
              if (member && member.firebaseUid && member.planRequested) {
                await updateDoc(doc(db, "users", member.firebaseUid), { planRequested: false });
              }
              
              if (action === 'start' && member) {
                setState(s => ({ ...s, editingProg: null, editingPreset: null, workout: data, workoutMember: member, workoutIsProgramSession: false }));
                showToast("Séance démarrée");
                return;
              }
            }

            setState(s => ({ ...s, editingProg: null, editingPreset: null }));
            showToast("Enregistré");
          }}
          onCancel={() => setState(s => ({ ...s, editingProg: null, editingPreset: null }))}
        />
      );
    }

    const { page } = state;
    const currentPlan = state.currentClub?.plan || 'basic';
    const isClassic = currentPlan === 'classic' || currentPlan === 'premium';
    const isPremium = currentPlan === 'premium';

    const isReallySuperAdmin = user.role === 'superadmin' && user.email === 'victor.defreitas.pro@gmail.com';
    const effectiveRole = isReallySuperAdmin ? adminPerspective : (user.role === 'superadmin' ? 'member' : user.role);

    if (effectiveRole === 'superadmin' || effectiveRole === 'coach' || effectiveRole === 'owner') {
      if (effectiveRole !== 'superadmin' && state.currentClub?.isActive === false) {
        return (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-4">Compte Suspendu</h1>
            <p className="text-zinc-500 max-w-md mb-8">
              Votre accès a été suspendu. Veuillez contacter l'administrateur pour régulariser votre situation.
            </p>
          </div>
        );
      }

      if (effectiveRole === 'superadmin') {
        return <AdminDashboard showToast={showToast} />;
      }

      switch (page) {
        case 'home': return <CoachDashboard state={state} setState={setState} onExport={() => {}} onToggleTimer={() => {}} showToast={showToast} />;
        case 'users': return <MembersPage state={state} setState={setState} showToast={showToast} />;
        case 'coaching': return <CoachingPage state={state} setState={setState} showToast={showToast} />;
        case 'presets': return <PresetsPage state={state} setState={setState} showToast={showToast} />;
        case 'exercises': return <ExercisesPage state={state} setState={setState} showToast={showToast} />;
        case 'history': return <HistoryPage state={state} setState={setState} />;
        case 'about': return <AboutPage state={state} setState={setState} />;
        case 'settings': return <SettingsPage state={state} setState={setState} showToast={showToast} />;
        case 'chat': return <MessagesPage state={state} setState={setState} showToast={showToast} />;
        case 'crm_pipeline': return <ProspectFlowPage state={state} setState={setState} showToast={showToast} />;
        case 'crm_tasks': return <TasksPage state={state} showToast={showToast} />;
        case 'crm_finances': return <FinancesPage state={state} setState={setState} showToast={showToast} />;
        case 'calendar': return <PlanningPage state={state} setState={setState} showToast={showToast} />;
        case 'nutrition': return <NutritionPage state={state} setState={setState} showToast={showToast} />;
        case 'drive': return <DrivePage state={state} />;
        case 'marketing': return <MarketingPage state={state} setState={setState} />;
        case 'guide': return <GuidePage onNavigate={(p) => setState(s => ({ ...s, page: p }))} />;
        default: return <CoachDashboard state={state} setState={setState} onExport={() => {}} onToggleTimer={() => {}} showToast={showToast} />;
      }
    }
    
    switch (page) {
      case 'home': return <MemberDashboard state={state} setState={setState} showToast={showToast} onToggleTimer={() => {}} />;
      case 'calendar': return <CalendarPage state={state} setState={setState} />;
      case 'planning': return <PlanningPage state={state} setState={setState} showToast={showToast} />;
      case 'performances': return <StatsPage state={state} setState={setState} />;
      case 'nutrition': return <MemberNutritionPage state={state} showToast={showToast} />;
      case 'ai_coach': return <AICoachPage state={state} setState={setState} showToast={showToast} />;
      case 'history': return <HistoryPage state={state} setState={setState} />;
      case 'about': return <AboutPage state={state} setState={setState} />;
      case 'profile': return <ProfilePage state={state} setState={setState} showToast={showToast} />;
      case 'messages': return <MessagesPage state={state} setState={setState} showToast={showToast} />;
      case 'supplements': return <MemberSupplementsPage state={state} showToast={showToast} />;
      case 'drive': return <DrivePage state={state} />;
      case 'evolution': return <EvolutionGalleryPage state={state} setState={setState} showToast={showToast} />;
      default: return <MemberDashboard state={state} setState={setState} showToast={showToast} onToggleTimer={() => {}} />;
    }
  };

  const hasNotifiedTasks = useRef(false);

  useEffect(() => {
    if (!authResolved) return;
    if (!auth.currentUser || !state.user || state.user.firebaseUid !== auth.currentUser.uid) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const initializePush = async () => {
      const pushSdk = await getMessagingClient();
      if (cancelled || !pushSdk) return;
      try {
        const permission = Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await pushSdk.getToken(pushSdk.messaging, {
            // Public VAPID key configured in Firebase Cloud Messaging.
            vapidKey: 'BH_DNK6qCrM8TNPAXNLnL_vWKM2S6wjzsdoHwG4lKVvkxkJQJIz5E2vL7CF-N_XZy1a27sgZaOnQVjpHUwVa3Lw'
          });
          if (token && !cancelled) {
            await setDoc(doc(db, "users", state.user.firebaseUid || String(state.user.id)), { fcmToken: token }, { merge: true });
          }
        }
        if (!cancelled) {
          unsubscribe = pushSdk.onMessage(pushSdk.messaging, (payload) => {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(payload.notification?.title || "Nouvelle notification", {
                body: payload.notification?.body,
                icon: payload.notification?.icon || "/brand/velatra-mark.png"
              });
            }
          });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du token push:', error);
      }
    };
    void initializePush();
    return () => { cancelled = true; unsubscribe?.(); };
  }, [state.user?.id, authResolved]);

  useEffect(() => {
    if (state.user && (state.tasks || []).length > 0 && !hasNotifiedTasks.current && 'Notification' in window && Notification.permission === 'granted') {
      const today = new Date().toISOString().split('T')[0];
      const tasksDueToday = (state.tasks || []).filter(t => t.status === 'todo' && t.assignedTo === String(state.user?.id) && t.dueDate === today);
      
      if (tasksDueToday.length > 0) {
        new Notification("Rappel de tâches", {
          body: `Vous avez ${tasksDueToday.length} tâche(s) à accomplir aujourd'hui.`,
          icon: "/brand/velatra-mark.png"
        });
        hasNotifiedTasks.current = true;
      }
    }
  }, [state.tasks, state.user]);

  const renderFirebaseConnectionIssue = () => {
    if (!firebaseConnectionIssue) return null;
    const isPermissionIssue = firebaseConnectionIssue === 'permission';

    return (
      <div role="alert" className="mx-auto my-3 flex w-[min(100%-2rem,48rem)] flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {isPermissionIssue
            ? "L'accès aux données est refusé pour ce compte. Vérifiez les droits de l'utilisateur ou contactez votre administrateur."
            : "La connexion aux données a échoué. Vérifiez votre connexion Internet puis réessayez."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          Réessayer
        </button>
      </div>
    );
  };

  const renderBillingBanner = () => {
    return null;
  };

  const renderOfflineBanner = () => {
    return null;
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {renderBillingBanner()}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="animate-spin text-emerald-500 mb-4">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
        </div>
        
        {gcpBillingError ? (
          <div className="max-w-md mx-auto space-y-4 px-4 text-center animate-fadeIn">
            <p className="text-zinc-700 font-semibold text-lg">
              Optimisation de la connexion...
            </p>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">
              Une maintenance temporaire est en cours sur nos serveurs de synchronisation. 
              L'application reste parfaitement accessible ! Vous pouvez d'ores et déjà ouvrir votre espace en mode libre ou basculer sur vos données hors-ligne sauvegardées localement.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button 
                onClick={() => {
                  setLoading(false);
                }} 
                className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-sm shadow hover:shadow-md transition-all"
              >
                Forcer l'accès libre (Mode Démo)
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('velatra_offline_backup_forced', 'true');
                  setIsOfflineBackupActive(true);
                  setLoading(false);
                  showToast("Mode Caches Locaux activé. Accès à vos programmes enregistrés !", "info");
                }} 
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium px-4 py-2 rounded-lg text-sm shadow hover:shadow-md transition-all whitespace-nowrap"
              >
                Accéder au Cache Local (Hors-ligne)
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium px-4 py-2 rounded-lg text-sm transition-all border border-zinc-200"
              >
                Rafraîchir la page
              </button>
            </div>
          </div>
        ) : (
          <p className="text-zinc-500 text-sm text-center">
            Connexion à l'application VELATRA...
          </p>
        )}
      </div>
    </div>
  );

  const unreadMessagesCount = state.user ? (state.messages || []).filter(m => !m.read && m.to === state.user?.id).length : 0;
  const unreadNotificationsCount = state.user ? (state.notifications || []).filter(n => !n.read && n.userId === state.user?.id).length : 0;

  const isReallySuperAdmin = state.user?.role === 'superadmin' && state.user?.email === 'victor.defreitas.pro@gmail.com';
  const effectiveRole = isReallySuperAdmin ? adminPerspective : (state.user?.role === 'superadmin' ? 'member' : state.user?.role);

  return (
    <React.Suspense fallback={(
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-zinc-500">
        <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-500" aria-hidden="true" />
        Chargement de votre espace…
      </div>
    )}>
    <Routes>
      {/* Landing Layout / Marketing Routes */}
      <Route element={<LandingLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/fonctionnalites" element={<FeaturesPage />} />
        <Route path="/tarifs" element={<PricingPage />} />
        <Route path="/solutions" element={<SolutionsPage />} />
        <Route path="/centre-d-aide" element={<HelpCenterPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/a-propos" element={<AboutPageMarketing />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/logiciel-coach-sportif" element={<SeoLandingPage />} />
        <Route path="/logiciel-personal-trainer" element={<SeoLandingPage />} />
        <Route path="/logiciel-studio-coaching" element={<SeoLandingPage />} />
        <Route path="/crm-coach-sportif" element={<SeoLandingPage />} />
        <Route path="/logiciel-suivi-client-coach" element={<SeoLandingPage />} />
        <Route path="/logiciel-programme-entrainement" element={<SeoLandingPage />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/cgv" element={<CGV />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
      </Route>

      {/* Auth Routes */}
      <Route path="/login" element={
        state.user ? <Navigate to="/dashboard" replace /> : (
          <div className="min-h-screen flex flex-col bg-[#ffffff]">
            {renderFirebaseConnectionIssue()}
            {renderBillingBanner()}
            {renderOfflineBanner()}
            <div className="flex-1 animate-fadeIn">
              <Login initialMode="login" />
            </div>
          </div>
        )
      } />

      <Route path="/register" element={
        state.user ? <Navigate to="/dashboard" replace /> : (
          <div className="min-h-screen flex flex-col bg-[#ffffff]">
            {renderFirebaseConnectionIssue()}
            {renderBillingBanner()}
            {renderOfflineBanner()}
            <div className="flex-1 animate-fadeIn">
              <Login initialMode="register" />
            </div>
          </div>
        )
      } />

      {/* Private Dashboard Route */}
      <Route path="/dashboard" element={
        !state.user ? <Navigate to="/login" replace /> : (
          (state.user.role === 'member' && !state.user.onboardingCompleted) ? (
            <div className="min-h-screen flex flex-col bg-[#ffffff]">
              {renderFirebaseConnectionIssue()}
              {renderBillingBanner()}
              {renderOfflineBanner()}
              <div className="flex-1 animate-fadeIn">
                <Onboarding user={state.user} club={state.currentClub} subscriptions={state.subscriptions} plans={state.plans} onComplete={() => {
                  setState(prev => prev.user ? { ...prev, user: { ...prev.user, onboardingCompleted: true } } : prev);
                }} />
              </div>
            </div>
          ) : (
            <ErrorBoundary>
              {renderFirebaseConnectionIssue()}
              {renderBillingBanner()}
              {renderOfflineBanner()}
              <Layout 
                user={state.user} 
                club={state.currentClub} 
                activePage={state.page} 
                onPageChange={(p) => setState(s => ({ ...s, page: p }))} 
                onLogout={handleLogout} 
                unreadMessagesCount={unreadMessagesCount} 
                unreadNotificationsCount={unreadNotificationsCount}
                logs={state.logs || []}
                payments={state.payments || []}
                users={state.users || []}
                adminPerspective={adminPerspective}
                onChangePerspective={(p) => {
                  handlePerspectiveChange(p);
                  setState(s => ({ ...s, page: p === 'superadmin' ? 'admin' : 'home' }));
                }}
                isWorkspaceMode={Boolean(state.viewingProg || state.editingProg || state.editingPreset)}
              >
                {renderActivePageContent(state.user)}
              </Layout>
              
              {state.toast && <Toast message={state.toast.message} type={state.toast.type} />}
              {state.workout && state.workoutMember && (
                (effectiveRole === 'coach' || effectiveRole === 'owner' || effectiveRole === 'superadmin') ? (
                  <CoachingSessionView 
                    program={state.workout} 
                    member={state.workoutMember} 
                    state={state}
                    showToast={showToast}
                    isProgramSession={state.workoutIsProgramSession}
                    onClose={() => setState(s => ({ ...s, workout: null, workoutMember: null, workoutIsProgramSession: undefined }))}
                    onComplete={async (log, perfs) => {
                      const logWithClub = { ...log, clubId: state.user?.clubId };
                      const perfsWithClub = perfs.map(p => ({ ...p, clubId: state.user?.clubId }));
                      
                      try {
                        if (!navigatorOnline || isOfflineBackupActive || gcpBillingError) {
                          throw new Error("offline");
                        }
                        await setDoc(doc(db, "logs", log.id.toString()), logWithClub);
                        for (const p of perfsWithClub) await setDoc(doc(db, "performances", p.id.toString()), p);
                        
                        if (state.workout?.isPlannedSession) {
                          await deleteDoc(doc(db, "programs", state.workout.id.toString()));
                        }
                        
                        if (state.workout?.bookingId) {
                          await updateDoc(doc(db, "bookings", state.workout.bookingId), { status: 'completed' });
                        }
                        
                        setState(s => ({ ...s, workout: null, workoutMember: null, workoutIsProgramSession: undefined }));
                        showToast("Séance de coaching enregistrée !");
                      } catch (err) {
                        console.warn("Offline/failed save, caching coaching logs locally:", err);
                        queueForSync('logs', logWithClub);
                        queueForSync('performances', perfsWithClub);
                        
                        if (state.workout?.isPlannedSession) {
                          const pid = state.workout.id;
                          setState(prev => ({
                            ...prev,
                            programs: prev.programs.filter(p => p.id !== pid)
                          }));
                          queueForSync('delete_program', { id: pid });
                        }
                        
                        setState(s => ({ ...s, workout: null, workoutMember: null, workoutIsProgramSession: undefined }));
                        showToast("Séance sauvegardée localement en cache (Hors-ligne) !", "info");
                      }
                    }}
                  />
                ) : (
                  <WorkoutView 
                    program={state.workout} 
                    member={state.workoutMember} 
                    state={state}
                    setState={setState}
                    showToast={showToast}
                    isCoachView={false}
                    onClose={() => setState(s => ({ ...s, workout: null, workoutMember: null }))}
                    onComplete={async (log, perfs) => {
                      const logWithClub = { ...log, clubId: state.user?.clubId };
                      const perfsWithClub = perfs.map(p => ({ ...p, clubId: state.user?.clubId }));
                      
                      try {
                        if (!navigatorOnline || isOfflineBackupActive || gcpBillingError) {
                          throw new Error("offline");
                        }
                        await setDoc(doc(db, "logs", log.id.toString()), logWithClub);
                        for (const p of perfsWithClub) await setDoc(doc(db, "performances", p.id.toString()), p);

                        if (state.workout?.isPlannedSession) {
                          await deleteDoc(doc(db, "programs", state.workout.id.toString()));
                        }
                        
                        if (state.workout?.bookingId) {
                          await updateDoc(doc(db, "bookings", state.workout.bookingId), { status: 'completed' });
                        }

                        setState(s => ({ ...s, workout: null, workoutMember: null }));
                        showToast("Séance enregistrée !");
                      } catch (err) {
                        console.warn("Offline/failed save, caching member logs locally:", err);
                        queueForSync('logs', logWithClub);
                        queueForSync('performances', perfsWithClub);
                        
                        if (state.workout?.isPlannedSession) {
                          const pid = state.workout.id;
                          setState(prev => ({
                            ...prev,
                            programs: prev.programs.filter(p => p.id !== pid)
                          }));
                          queueForSync('delete_program', { id: pid });
                        }

                        setState(s => ({ ...s, workout: null, workoutMember: null }));
                        showToast("Séance sauvegardée localement en cache (Hors-ligne) !", "info");
                      }
                    }}
                  />
                )
              )}
            </ErrorBoundary>
          )
        )
      } />

      {/* Catch-all to / */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </React.Suspense>
  );
}
