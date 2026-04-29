import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your strict web app Firebase configuration for Project ID 43
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "fyp-har-43.firebaseapp.com",
  projectId: "fyp-har-43",
  storageBucket: "fyp-har-43.firebasestorage.app",
  messagingSenderId: "172398990685",
  appId: "1:172398990685:web:ef764d1ddf1bedf6d284b4"
};

// Initialize the Firebase Application
const app = initializeApp(firebaseConfig);

// Initialize Authentication and expose the Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();