
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

const firebaseConfig = {
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
    // By default, connect to the standard historical (default) database where all your clubs and members live.
    dbIdToUse = undefined;
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
  where,
  getDocs,
  addDoc,
  ref,
  uploadBytes,
  getDownloadURL,
  getToken,
  onMessage
};
