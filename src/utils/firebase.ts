import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDzibjyt9Bun_gmONZTKK_HQ6E0jrrRIjo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "softwarehub-d8309.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://softwarehub-d8309-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "softwarehub-d8309",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "softwarehub-d8309.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "550762193318",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:550762193318:web:4bad5581a4da25a3562f67",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-MBRHPTW8SH",
};

if (typeof window !== "undefined") {
  console.log("Firebase Config API Key in browser:", firebaseConfig.apiKey);
  if (!firebaseConfig.apiKey) {
    console.error(
      "❌ Firebase API Key is undefined! Please restart your Next.js server."
    );
  }
}

import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Initialize App Check on client side
if (typeof window !== "undefined") {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (!isLocalhost) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider("6LeUfAItAAAAAKHKdBuKLCVRVd_1ksMURVTCvxDh"),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (error) {
      console.error("App Check failed to initialize:", error);
    }
  } else {
    // In local development, enable debug token to bypass domain mismatch
    try {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    } catch (e) {}
  }
}

export { app, db, firestore, storage, auth };
