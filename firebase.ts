
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
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
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  onSnapshot, 
  collection, 
  updateDoc,
  deleteDoc,
  query,
  or,
  where,
  getDocs,
  addDoc
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

declare const __FIREBASE_APPLET_CONFIG__: any;

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
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

let messaging: any = null;
if (typeof window !== 'undefined' && 'Notification' in window) {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.error("Firebase Messaging not supported", e);
  }
}
export { messaging };

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

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

export const createMemberProfile = async (uid: string, profile: Record<string, unknown>) => {
  const response = await apiFetch('/api/create-member-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, profile })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Impossible de créer le profil adhérent.");
  return result;
};

export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  collection,
  updateDoc,
  deleteDoc,
  query,
  or,
  where,
  getDocs,
  addDoc,
  ref,
  uploadBytes,
  getDownloadURL,
  getToken,
  onMessage
};
