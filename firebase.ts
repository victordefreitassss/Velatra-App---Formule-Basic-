
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  connectAuthEmulator,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";
import { 
  getFirestore, 
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, 
  setDoc as firestoreSetDoc,
  getDoc, 
  getDocFromServer,
  onSnapshot, 
  collection, 
  updateDoc as firestoreUpdateDoc,
  deleteDoc,
  query,
  or,
  where,
  getDocs,
  addDoc as firestoreAddDoc
} from "firebase/firestore";

declare const __FIREBASE_APPLET_CONFIG__: any;
declare const __USE_FIREBASE_EMULATORS__: boolean;
const useEmulators = typeof __USE_FIREBASE_EMULATORS__ !== 'undefined' && __USE_FIREBASE_EMULATORS__;

const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) 
  ? (import.meta as any).env 
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const config: any = typeof __FIREBASE_APPLET_CONFIG__ !== 'undefined' ? __FIREBASE_APPLET_CONFIG__ : {};

export const firebaseConfig = {
  apiKey: config.apiKey || env.VITE_FIREBASE_API_KEY || "",
  authDomain: config.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: config.projectId || env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: config.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: config.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: config.appId || env.VITE_FIREBASE_APP_ID || ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
if (useEmulators) connectAuthEmulator(auth, 'http://127.0.0.1:9099');
let dbIdToUse: string | undefined = undefined;

if (typeof window !== 'undefined') {
  const localStorageOverride = window.localStorage.getItem('velatra_firestore_db_override');
  if (localStorageOverride === 'isolated') {
    dbIdToUse = config.firestoreDatabaseId || env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || undefined;
  } else if (localStorageOverride === 'default') {
    dbIdToUse = undefined;
  } else {
    // By default, connect to the isolated database in development/AI Studio preview
    // so that connection tests and rules work correctly out-of-the-box.
    const isDevelopment = window.location.hostname.includes('ais-') || 
                          window.location.hostname.includes('localhost') || 
                          window.location.hostname.includes('127.0.0.1');
    if (isDevelopment && (config.firestoreDatabaseId || env.VITE_FIREBASE_FIRESTORE_DATABASE_ID)) {
      dbIdToUse = config.firestoreDatabaseId || env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
    } else {
      // On production domain, default to the standard historical (default) database where all live clubs live.
      dbIdToUse = undefined;
    }
  }
} else {
  dbIdToUse = undefined;
}

let localDb: any;
if (typeof dbIdToUse !== 'undefined') {
  try {
    localDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, dbIdToUse);
  } catch (error) {
    console.warn("Retrying Firestore initialization for key/db with simple cache:", error);
    try {
      localDb = initializeFirestore(app, {
        localCache: persistentLocalCache()
      }, dbIdToUse);
    } catch (err) {
      localDb = getFirestore(app, dbIdToUse);
    }
  }
} else {
  // Otherwise use default DB
  try {
    localDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (error) {
    console.warn("Retrying default Firestore initialization with simple cache:", error);
    try {
      localDb = initializeFirestore(app, {
        localCache: persistentLocalCache()
      });
    } catch (err) {
      localDb = getFirestore(app);
    }
  }
}

export const db = localDb;
if (useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080);
let storageInstance: any = null;
export const getStorageClient = async () => {
  if (storageInstance) return storageInstance;
  const storageSdk = await import('firebase/storage');
  storageInstance = storageSdk.getStorage(app);
  if (useEmulators) storageSdk.connectStorageEmulator(storageInstance, '127.0.0.1', 9199);
  return storageInstance;
};
export const googleProvider = new GoogleAuthProvider();

let messagingInstance: any = null;
export const getMessagingClient = async () => {
  if (useEmulators || typeof window === 'undefined' || !('Notification' in window)) return null;
  try {
    const messagingSdk = await import('firebase/messaging');
    messagingInstance ||= messagingSdk.getMessaging(app);
    return {
      messaging: messagingInstance,
      getToken: messagingSdk.getToken,
      onMessage: messagingSdk.onMessage
    };
  } catch (error) {
    console.warn("Firebase Messaging is not available in this browser.", error);
    return null;
  }
};

const MEMBER_RECORD_COLLECTIONS = new Set([
  'programs', 'archivedPrograms', 'performances', 'logs', 'bodyData', 'nutritionPlans',
  'nutritionLogs', 'subscriptions', 'payments', 'supplementOrders', 'progressPhotos',
  'bookings', 'notifications', 'messages'
]);

async function withMemberCoachAssignment(reference: any, submittedData: Record<string, any>, readExisting = false) {
  const collectionName = reference?.parent?.id || reference?.id;
  if (!MEMBER_RECORD_COLLECTIONS.has(collectionName)) return submittedData;

  let existing: Record<string, any> = {};
  if (readExisting) {
    const snapshot = await getDoc(reference);
    if (snapshot.exists()) existing = snapshot.data();
  }
  const data = { ...existing, ...submittedData };
  const current = auth.currentUser;
  if (!current) return submittedData;
  const currentSnapshot = await getDoc(doc(db, 'users', current.uid));
  if (!currentSnapshot.exists()) return submittedData;
  const currentProfile = currentSnapshot.data();
  const ownNumericId = Number(currentProfile.id);
  const messagePeerId = Number(data.from) === ownNumericId ? data.to : data.from;
  const memberIdValue = data.memberId ?? data.userId ?? data.adherentId ?? (collectionName === 'messages' && messagePeerId != null ? messagePeerId : undefined);
  const memberId = Number(memberIdValue);
  if (!Number.isFinite(memberId)) return submittedData;
  let memberProfile: Record<string, any> | undefined;

  if (currentProfile.role === 'member' && Number(currentProfile.id) === memberId) {
    memberProfile = currentProfile;
  } else if (currentProfile.role === 'coach') {
    const assignedIds = Array.isArray(currentProfile.assignedMemberIds) ? currentProfile.assignedMemberIds.map(Number) : [];
    if (!assignedIds.includes(memberId)) {
      throw new Error('Vous ne pouvez pas modifier les données d’un adhérent qui ne vous est pas affecté.');
    }
    memberProfile = { assignedCoachUid: current.uid };
  } else if (currentProfile.clubId && ['owner', 'superadmin'].includes(currentProfile.role)) {
    const memberQuery = query(collection(db, 'users'), where('clubId', '==', currentProfile.clubId), where('id', '==', memberId), where('role', '==', 'member'));
    const members = await getDocs(memberQuery);
    memberProfile = members.docs[0]?.data();
  }

  const assignedCoachUid = memberProfile?.assignedCoachUid;
  if (typeof assignedCoachUid === 'string' && assignedCoachUid.length > 0) {
    return { ...submittedData, assignedCoachUid };
  }
  return submittedData;
}

export const setDoc = async (reference: any, data: Record<string, any>, options?: any) => {
  const safeData = await withMemberCoachAssignment(reference, data);
  return options ? firestoreSetDoc(reference, safeData, options) : firestoreSetDoc(reference, safeData);
};

export const updateDoc = async (reference: any, data: Record<string, any>) => {
  const safeData = await withMemberCoachAssignment(reference, data, true);
  return firestoreUpdateDoc(reference, safeData);
};

export const addDoc = async (collectionReference: any, data: Record<string, any>) => {
  const safeData = await withMemberCoachAssignment({ parent: collectionReference }, data);
  return firestoreAddDoc(collectionReference, safeData);
};

/** Send Firebase ID tokens with requests to our private server API. */
export const apiFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Vous devez être connecté pour effectuer cette action.");
  }

  const token = await currentUser.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
};

const memberCreationRequests = new Map<string, string>();
export const createMemberAccount = async (profile: Record<string, unknown>, password?: string, coachUid?: string | null) => {
  const key = `${auth.currentUser?.uid}:${String(profile.email).trim().toLowerCase()}`;
  const requestId = memberCreationRequests.get(key) || crypto.randomUUID();
  memberCreationRequests.set(key, requestId);
  const response = await apiFetch('/api/create-member', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, ...(password ? { password } : {}), requestId, ...(coachUid ? { coachUid } : {}) })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Impossible de créer l’adhérent.');
  return result as { success: boolean; uid: string; memberId: number; member: import('./types').User };
};

export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  collection,
  deleteDoc,
  query,
  or,
  where,
  getDocs,
};
