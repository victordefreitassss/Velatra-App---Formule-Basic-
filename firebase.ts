
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
import firebaseAppletConfig from "./firebase-applet-config.json";

const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) 
  ? (import.meta as any).env 
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || env.VITE_FIREBASE_API_KEY || "",
  authDomain: firebaseAppletConfig.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: firebaseAppletConfig.projectId || env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: firebaseAppletConfig.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: firebaseAppletConfig.appId || env.VITE_FIREBASE_APP_ID || ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseAppletConfig.firestoreDatabaseId || undefined);
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
