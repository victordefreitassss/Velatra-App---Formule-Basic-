import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAY7wpl0pigmWaUg4JRA_0y_dKAjnX17nA",
  authDomain: "velatra-75daa.firebaseapp.com",
  projectId: "velatra-75daa",
  storageBucket: "velatra-75daa.firebasestorage.app",
  messagingSenderId: "686153399642",
  appId: "1:686153399642:web:5c28ff2d0872ad4cdac763"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function test() {
  try {
    console.log("1. Testing club read...");
    const clubDoc = await getDoc(doc(db, "clubs", "123456"));
    console.log("Club read successful.");
    
    console.log("2. Signing in as test user...");
    const userCredential = await signInWithEmailAndPassword(auth, "victor.defreitas.pro@gmail.com", "password123");
    console.log("Signed in.");
    
    console.log("3. Testing user write...");
    await setDoc(doc(db, "users", userCredential.user.uid), {
      test: true
    }, { merge: true });
    console.log("User write successful.");
    
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error.message);
    process.exit(1);
  }
}

test();
