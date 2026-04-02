import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAY7wpl0pigmWaUg4JRA_0y_dKAjnX17nA",
  authDomain: "velatra-75daa.firebaseapp.com",
  projectId: "velatra-75daa",
  storageBucket: "velatra-75daa.firebasestorage.app",
  messagingSenderId: "686153399642",
  appId: "1:686153399642:web:5c28ff2d0872ad4cdac763"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    console.log("Testing connection...");
    const querySnapshot = await getDocs(collection(db, "users"));
    console.log("Connection successful! Found", querySnapshot.size, "users.");
    process.exit(0);
  } catch (error) {
    console.error("Connection failed:", error.message);
    process.exit(1);
  }
}

test();
