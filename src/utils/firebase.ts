import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (typeof window !== "undefined") {
  console.log("Firebase Config API Key in browser:", firebaseConfig.apiKey);
  if (!firebaseConfig.apiKey) {
    console.error(
      "❌ Firebase API Key is undefined! If you just added or updated .env.local, please RESTART your Next.js development server (Ctrl+C and npm run dev) in your terminal so it can load the new environment variables."
    );
  }
}

import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app); // Realtime Database instance (deprecated, kept for compatibility)
const firestore = getFirestore(app); // Cloud Firestore instance
const storage = getStorage(app); // Firebase Storage instance
const auth = getAuth(app);

// Initialize App Check on client side
if (typeof window !== "undefined") {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider("6LeUfAItAAAAAKHKdBuKLCVRVd_1ksMURVTCvxDh"),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.error("App Check failed to initialize:", error);
  }
}

export { app, db, firestore, storage, auth };
