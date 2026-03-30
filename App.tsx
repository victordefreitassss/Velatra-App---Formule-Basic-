
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, AppState, Program, Preset, SessionLog, Performance, BodyData, Message, FeedItem,
  SupplementProduct, SupplementOrder, FixedCost, CommissionPayment, Prospect, Newsletter, Club, Exercise,
  Task, Subscription, Payment, Plan, NutritionPlan, NutritionLog, CRMClient, CRMFormula, ManualStats, PendingProspect, Expense, Invoice, Booking, DriveFile, DriveFolder, Product
} from './types';
import type { Notification } from './types';
import { 
  INIT_EXERCISES, CLUB_INFO, COACHES 
} from './constants';
import { 
  auth, db, messaging,
  onAuthStateChanged, signOut, 
  doc, getDoc, setDoc, onSnapshot, updateDoc, collection, deleteDoc, query, where, getDocs,
  getToken, onMessage
} from './firebase';

// Layout & UI
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Toast } from './components/Toast';
import { WorkoutView } from './components/WorkoutView';
import { CoachingSessionView } from './components/CoachingSessionView';
import { ProgramEditor } from './components/Editor';

// Pages
import { CoachDashboard } from './components/CoachDashboard';
import { MemberDashboard } from './components/MemberDashboard';
import { MembersPage } from './pages/MembersPage';
import { CoachingPage } from './pages/CoachingPage';
import { PresetsPage } from './pages/PresetsPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { MessagesPage } from './pages/MessagesPage';
import { AboutPage } from './pages/AboutPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import { CalendarPage } from './pages/CalendarPage';
import { TrophyPage } from './pages/TrophyPage';
import { HistoryPage } from './pages/HistoryPage';
import { AICoachPage } from './pages/AICoachPage';
import { ProspectFlowPage } from './pages/ProspectFlowPage';
import { TasksPage } from './pages/TasksPage';
import { FinancesPage } from './pages/FinancesPage';
import { ProfilePage } from './pages/ProfilePage';
import { PlanningPage } from './pages/PlanningPage';
import { NutritionPage } from './pages/NutritionPage';
import { MemberNutritionPage } from './pages/MemberNutritionPage';
import { MarketingPage } from './pages/MarketingPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { SupplementsPage } from './pages/SupplementsPage';
import { LoyaltyPage } from './pages/LoyaltyPage';
import { MemberSupplementsPage } from './pages/MemberSupplementsPage';
import { MemberLoyaltyPage } from './pages/MemberLoyaltyPage';
import { DrivePage } from './pages/DrivePage';
import { CommunityPage } from './pages/CommunityPage';
import { NotificationsPage } from './pages/NotificationsPage';

const INITIAL_STATE: AppState = {
  user: null,
  currentClub: null,
  users: [],
  exercises: INIT_EXERCISES,
  programs: [],
  presets: [],
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
  notifications: [],
  aboutInfo: CLUB_INFO,
  coaches: COACHES,
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

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUserDoc: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Listen to the user document so it updates automatically when created during registration
        unsubUserDoc = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            
            // Auto-assign superadmin role to the developer email
            if (firebaseUser.email === 'victor.defreitas.pro@gmail.com' && userData.role !== 'superadmin') {
              await updateDoc(userDocRef, { role: 'superadmin' });
              userData.role = 'superadmin';
            }
            
            setState(prev => ({ ...prev, user: { ...userData, id: Number(userData.id), firebaseUid: firebaseUser.uid } }));
            
            // Fetch Club Data
            if (userData.clubId) {
              const clubDoc = await getDoc(doc(db, "clubs", userData.clubId));
              if (clubDoc.exists()) {
                setState(prev => ({ ...prev, currentClub: clubDoc.data() as Club }));
              }
            }
          } else {
            // Document not created yet (happens during registration)
            setState(prev => ({ ...prev, user: null }));
            
            // Admin recovery mode
            if (firebaseUser.email === 'victor.defreitas.pro@gmail.com') {
              try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("role", "in", ["superadmin", "owner"]));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                  const oldDoc = querySnapshot.docs[0];
                  const oldData = oldDoc.data() as User;
                  
                  await setDoc(userDocRef, {
                    ...oldData,
                    firebaseUid: firebaseUser.uid,
                    email: firebaseUser.email
                  });
                  
                  await deleteDoc(oldDoc.ref);
                } else {
                  const clubsRef = collection(db, "clubs");
                  const clubsSnapshot = await getDocs(clubsRef);
                  const clubId = clubsSnapshot.empty ? "CLUB123" : clubsSnapshot.docs[0].id;
                  
                  await setDoc(userDocRef, {
                    id: Date.now(),
                    clubId: clubId,
                    code: "admin",
                    pwd: "",
                    name: "Victor De Freitas",
                    email: firebaseUser.email,
                    role: "superadmin",
                    avatar: "VD",
                    gender: "M",
                    age: 30,
                    weight: 80,
                    height: 180,
                    firebaseUid: firebaseUser.uid
                  });
                }
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
    if (!state.user || !state.user.clubId) return;

    const clubId = state.user.clubId;

    const unsubClub = onSnapshot(doc(db, "clubs", clubId), (docSnap) => {
      if (docSnap.exists()) {
        const clubData = docSnap.data() as Club;
        setState(prev => ({
          ...prev,
          currentClub: clubData,
          coaches: clubData.coaches || COACHES,
          aboutInfo: {
            phone: clubData.phone,
            email: clubData.email,
            googleReview: clubData.googleReview || "",
            description: clubData.description,
            horaires: clubData.horaires,
            adresse: clubData.address,
            mapsLink: clubData.mapsLink || ""
          }
        }));
      }
    });

    const unsubUsers = onSnapshot(query(collection(db, "users"), where("clubId", "==", clubId)), (snap) => {
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
    const unsubProgs = onSnapshot(query(collection(db, "programs"), where("clubId", "==", clubId)), (snap) => {
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
          
          if (now > endDate) {
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

      if (!isInitialProgsLoad && hasNewProgram && Notification.permission === 'granted') {
        new Notification("Nouveau programme", {
          body: "Un nouveau programme d'entraînement vous a été assigné.",
          icon: "https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png"
        });
      }
      isInitialProgsLoad = false;
    });

    const unsubPresets = onSnapshot(query(collection(db, "presets"), where("clubId", "==", clubId)), (snap) => {
      const allPresets: Preset[] = [];
      snap.forEach(d => allPresets.push(d.data() as Preset));
      setState(prev => ({ ...prev, presets: allPresets }));
    });

    const unsubArchives = onSnapshot(query(collection(db, "archivedPrograms"), where("clubId", "==", clubId)), (snap) => {
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

    const unsubPerfs = onSnapshot(query(collection(db, "performances"), where("clubId", "==", clubId)), (snap) => {
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

    const unsubOrders = onSnapshot(query(collection(db, "supplementOrders"), where("clubId", "==", clubId)), (snap) => {
      const orders: SupplementOrder[] = [];
      snap.forEach(d => orders.push(d.data() as SupplementOrder));
      setState(prev => ({ ...prev, supplementOrders: orders }));
    });

    const unsubLogs = onSnapshot(query(collection(db, "logs"), where("clubId", "==", clubId)), (snap) => {
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
    const unsubMessages = onSnapshot(query(collection(db, "messages"), where("clubId", "==", clubId)), (snap) => {
      const messages: Message[] = [];
      let hasNewUnread = false;
      
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const msg = change.doc.data() as Message;
          if (!msg.read && msg.to === state.user?.id) {
            hasNewUnread = true;
          }
        }
      });

      snap.forEach(d => messages.push(d.data() as Message));
      setState(prev => ({ ...prev, messages }));

      if (!isInitialMessagesLoad && hasNewUnread && Notification.permission === 'granted') {
        new Notification("Nouveau message", {
          body: "Vous avez reçu un nouveau message sur Velatra.",
          icon: "https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png"
        });
      }
      isInitialMessagesLoad = false;
    });

    const unsubFeed = onSnapshot(query(collection(db, "feed"), where("clubId", "==", clubId)), (snap) => {
      const feed: FeedItem[] = [];
      const now = new Date().getTime();
      const fourDaysInMs = 4 * 24 * 60 * 60 * 1000;

      snap.forEach(d => {
        const item = d.data() as FeedItem;
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

    const unsubBody = onSnapshot(query(collection(db, "bodyData"), where("clubId", "==", clubId)), (snap) => {
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
    const unsubProspects = onSnapshot(query(collection(db, "prospects"), where("clubId", "==", clubId)), (snap) => {
      const prospects: Prospect[] = [];
      let hasNewProspect = false;

      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          hasNewProspect = true;
        }
      });

      snap.forEach(d => prospects.push({ ...d.data(), firebaseUid: d.id } as Prospect));
      setState(prev => ({ ...prev, prospects }));

      if (!isInitialProspectsLoad && hasNewProspect && state.user?.role !== 'member' && Notification.permission === 'granted') {
        new Notification("Nouveau prospect", {
          body: "Un nouveau prospect a été ajouté ou s'est inscrit.",
          icon: "https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png"
        });
      }
      isInitialProspectsLoad = false;
    });

    const unsubNewsletters = onSnapshot(query(collection(db, "newsletters"), where("clubId", "==", clubId)), (snap) => {
      const newsletters: Newsletter[] = [];
      snap.forEach(d => newsletters.push(d.data() as Newsletter));
      setState(prev => ({ ...prev, newsletters: newsletters.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
    });

    let isInitialTasksLoad = true;
    const unsubTasks = onSnapshot(query(collection(db, "tasks"), where("clubId", "==", clubId)), (snap) => {
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

      if (!isInitialTasksLoad && hasNewTask && Notification.permission === 'granted') {
        new Notification("Nouvelle tâche", {
          body: `Vous avez une nouvelle tâche à accomplir : ${newTaskTitle}`,
          icon: "https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png"
        });
      }
      isInitialTasksLoad = false;
    });

    let isInitialBookingsLoad = true;
    const unsubBookings = onSnapshot(query(collection(db, "bookings"), where("clubId", "==", clubId)), (snap) => {
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

      if (!isInitialBookingsLoad && hasNewBooking && Notification.permission === 'granted') {
        new Notification("Nouvelle réservation", {
          body: "Vous avez une nouvelle session de coaching réservée.",
          icon: "https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png"
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
    const unsubNutritionPlans = onSnapshot(query(collection(db, "nutritionPlans"), where("clubId", "==", clubId)), (snap) => {
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

      if (!isInitialNutritionPlansLoad && hasNewNutritionPlan && Notification.permission === 'granted') {
        new Notification("Nouveau plan nutritionnel", {
          body: "Un nouveau plan nutritionnel vous a été assigné.",
          icon: "https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png"
        });
      }
      isInitialNutritionPlansLoad = false;
    });

    const unsubNutritionLogs = onSnapshot(query(collection(db, "nutritionLogs"), where("clubId", "==", clubId)), (snap) => {
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

    const unsubSubscriptions = onSnapshot(query(collection(db, "subscriptions"), where("clubId", "==", clubId)), (snap) => {
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

    const unsubPayments = onSnapshot(query(collection(db, "payments"), where("clubId", "==", clubId)), (snap) => {
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

    const unsubExpenses = onSnapshot(query(collection(db, "expenses"), where("clubId", "==", clubId)), (snap) => {
      const expenses: Expense[] = [];
      snap.forEach(d => expenses.push(d.data() as Expense));
      setState(prev => ({ ...prev, expenses }));
    });

    const unsubInvoices = onSnapshot(query(collection(db, "invoices"), where("clubId", "==", clubId)), (snap) => {
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

    const unsubFixedCosts = onSnapshot(query(collection(db, "fixedCosts"), where("clubId", "==", clubId)), (snap) => {
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
      
      setState(prev => ({ ...prev, exercises: mergedExercises }));
    });

    const unsubCrmClients = onSnapshot(query(collection(db, "crmClients"), where("clubId", "==", clubId)), (snap) => {
      const crmClients: CRMClient[] = [];
      snap.forEach(d => crmClients.push(d.data() as CRMClient));
      setState(prev => ({ ...prev, crmClients }));
    });

    const unsubCrmFormulas = onSnapshot(query(collection(db, "crmFormulas"), where("clubId", "==", clubId)), (snap) => {
      const crmFormulas: CRMFormula[] = [];
      snap.forEach(d => crmFormulas.push(d.data() as CRMFormula));
      setState(prev => ({ ...prev, crmFormulas }));
    });

    const unsubManualStats = onSnapshot(query(collection(db, "manualStats"), where("clubId", "==", clubId)), (snap) => {
      const manualStats: ManualStats[] = [];
      snap.forEach(d => manualStats.push(d.data() as ManualStats));
      setState(prev => ({ ...prev, manualStats }));
    });

    const unsubPendingProspects = onSnapshot(query(collection(db, "pendingProspects"), where("clubId", "==", clubId)), (snap) => {
      const pendingProspects: PendingProspect[] = [];
      snap.forEach(d => pendingProspects.push(d.data() as PendingProspect));
      setState(prev => ({ ...prev, pendingProspects }));
    });

    const unsubDriveFiles = onSnapshot(query(collection(db, "driveFiles"), where("clubId", "==", clubId)), (snap) => {
      const driveFiles: DriveFile[] = [];
      snap.forEach(d => driveFiles.push(d.data() as DriveFile));
      setState(prev => ({ ...prev, driveFiles }));
    });

    const unsubDriveFolders = onSnapshot(query(collection(db, "driveFolders"), where("clubId", "==", clubId)), (snap) => {
      const driveFolders: DriveFolder[] = [];
      snap.forEach(d => driveFolders.push(d.data() as DriveFolder));
      setState(prev => ({ ...prev, driveFolders }));
    });

    const unsubNotifications = onSnapshot(query(collection(db, "notifications"), where("clubId", "==", clubId)), (snap) => {
      const notifications: Notification[] = [];
      snap.forEach(d => notifications.push(d.data() as Notification));
      setState(prev => ({ ...prev, notifications }));
    });

    return () => {
      unsubClub(); unsubUsers(); unsubProgs(); unsubPresets(); 
      unsubArchives(); unsubPerfs(); unsubProducts(); unsubOrders();
      unsubLogs(); unsubMessages(); unsubFeed(); unsubBody();
      unsubProspects(); unsubNewsletters(); unsubExercises();
      unsubTasks(); unsubBookings(); unsubPlans(); unsubSubscriptions(); unsubPayments(); unsubExpenses(); unsubInvoices(); unsubFixedCosts(); unsubNutritionPlans(); unsubNutritionLogs();
      unsubCrmClients(); unsubCrmFormulas(); unsubManualStats(); unsubPendingProspects(); unsubDriveFiles(); unsubDriveFolders(); unsubNotifications();
    };
  }, [state.user?.clubId]);

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
    if (state.editingProg || state.editingPreset) {
      return (
        <ProgramEditor 
          program={state.editingProg}
          preset={state.editingPreset}
          exercises={state.exercises}
          clubId={user.clubId}
          allPresets={state.presets}
          member={state.editingProg ? state.users.find(u => Number(u.id) === state.editingProg!.memberId) : undefined}
          onSave={async (data) => {
            const dataWithClub = { ...data, clubId: user.clubId };
            await setDoc(doc(db, state.editingProg ? "programs" : "presets", data.id.toString()), dataWithClub);
            
            if (state.editingProg) {
              const member = state.users.find(u => Number(u.id) === state.editingProg!.memberId);
              if (member && member.firebaseUid && member.planRequested) {
                await updateDoc(doc(db, "users", member.firebaseUid), { planRequested: false });
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

    if (user.role === 'superadmin' || user.role === 'coach' || user.role === 'owner') {
      if (user.role !== 'superadmin' && state.currentClub?.isActive === false) {
        return (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-4">Compte Suspendu</h1>
            <p className="text-zinc-900/60 max-w-md mb-8">
              Votre accès a été suspendu. Veuillez contacter l'administrateur pour régulariser votre situation.
            </p>
          </div>
        );
      }

      if (user.role === 'superadmin' && page === 'admin') {
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
        case 'crm_tasks': return <TasksPage state={state} />;
        case 'crm_finances': return <FinancesPage state={state} setState={setState} showToast={showToast} />;
        case 'calendar': return <PlanningPage state={state} setState={setState} showToast={showToast} />;
        case 'nutrition': return <NutritionPage state={state} setState={setState} showToast={showToast} />;
        case 'drive': return <DrivePage state={state} />;
        case 'notifications': return <NotificationsPage state={state} setState={setState} />;
        case 'marketing': return <MarketingPage state={state} setState={setState} />;
        case 'supplements': return <SupplementsPage state={state} setState={setState} showToast={showToast} />;
        case 'loyalty': return <LoyaltyPage state={state} setState={setState} showToast={showToast} />;
        default: return <CoachDashboard state={state} setState={setState} onExport={() => {}} onToggleTimer={() => {}} showToast={showToast} />;
      }
    }
    
    switch (page) {
      case 'home': return <MemberDashboard state={state} setState={setState} showToast={showToast} onToggleTimer={() => {}} />;
      case 'calendar': return <CalendarPage state={state} setState={setState} />;
      case 'planning': return <PlanningPage state={state} setState={setState} showToast={showToast} />;
      case 'performances': return <StatsPage state={state} setState={setState} />;
      case 'community': return <CommunityPage state={state} />;
      case 'nutrition': return <MemberNutritionPage state={state} showToast={showToast} />;
      case 'ai_coach': return <AICoachPage state={state} setState={setState} showToast={showToast} />;
      case 'history': return <HistoryPage state={state} setState={setState} />;
      case 'about': return <AboutPage state={state} setState={setState} />;
      case 'profile': return <ProfilePage state={state} setState={setState} showToast={showToast} />;
      case 'messages': return <MessagesPage state={state} setState={setState} showToast={showToast} />;
      case 'notifications': return <NotificationsPage state={state} setState={setState} />;
      case 'supplements': return <MemberSupplementsPage state={state} showToast={showToast} />;
      case 'loyalty': return <MemberLoyaltyPage state={state} />;
      default: return <MemberDashboard state={state} setState={setState} showToast={showToast} onToggleTimer={() => {}} />;
    }
  };

  const hasNotifiedTasks = useRef(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (state.user?.id && messaging) {
      const requestPushPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(messaging, {
              // REMPLACER PAR LA CLÉ VAPID DEPUIS LA CONSOLE FIREBASE
              vapidKey: 'BH_DNK6qCrM8TNPAXNLnL_vWKM2S6wjzsdoHwG4lKVvkxkJQJIz5E2vL7CF-N_XZy1a27sgZaOnQVjpHUwVa3Lw' 
            });
            if (token) {
              await setDoc(doc(db, "users", String(state.user.id)), {
                fcmToken: token
              }, { merge: true });
            }
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du token push:', error);
        }
      };

      requestPushPermission();

      const unsubscribe = onMessage(messaging, (payload) => {
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || "Nouvelle notification", {
            body: payload.notification?.body,
            icon: payload.notification?.icon || "https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png"
          });
        }
      });

      return () => unsubscribe();
    }
  }, [state.user?.id]);

  useEffect(() => {
    if (state.user && state.tasks.length > 0 && !hasNotifiedTasks.current && Notification.permission === 'granted') {
      const today = new Date().toISOString().split('T')[0];
      const tasksDueToday = state.tasks.filter(t => t.status === 'todo' && t.assignedTo === String(state.user?.id) && t.dueDate === today);
      
      if (tasksDueToday.length > 0) {
        new Notification("Rappel de tâches", {
          body: `Vous avez ${tasksDueToday.length} tâche(s) à accomplir aujourd'hui.`,
          icon: "https://i.postimg.cc/VLMLPbh9/Design-sans-titre.png"
        });
        hasNotifiedTasks.current = true;
      }
    }
  }, [state.tasks, state.user]);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin text-velatra-accent">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
      </div>
    </div>
  );

  if (!state.user) return <Login />;

  const unreadMessagesCount = state.messages.filter(m => !m.read && m.to === state.user?.id).length;
  const unreadNotificationsCount = state.notifications.filter(n => !n.read && n.userId === state.user?.id).length;

  return (
    <>
      <Layout user={state.user} club={state.currentClub} activePage={state.page} onPageChange={(p) => setState(s => ({ ...s, page: p }))} onLogout={handleLogout} unreadMessagesCount={unreadMessagesCount} unreadNotificationsCount={unreadNotificationsCount}>
        {renderActivePageContent(state.user)}
      </Layout>
      
      {state.toast && <Toast message={state.toast.message} type={state.toast.type} />}
      {state.workout && state.workoutMember && (
        (state.user?.role === 'coach' || state.user?.role === 'owner' || state.user?.role === 'superadmin') ? (
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
              
              await setDoc(doc(db, "logs", log.id.toString()), logWithClub);
              for (const p of perfsWithClub) await setDoc(doc(db, "performances", p.id.toString()), p);
              setState(s => ({ ...s, workout: null, workoutMember: null, workoutIsProgramSession: undefined }));
              showToast("Séance de coaching enregistrée !");
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
              
              await setDoc(doc(db, "logs", log.id.toString()), logWithClub);
              for (const p of perfsWithClub) await setDoc(doc(db, "performances", p.id.toString()), p);
              setState(s => ({ ...s, workout: null, workoutMember: null }));
              showToast("Séance enregistrée !");
            }}
          />
        )
      )}
    </>
  );
}
