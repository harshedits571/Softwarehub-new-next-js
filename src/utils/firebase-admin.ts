import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn('Firebase Admin env vars missing. Skipping initialization.');
    }
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

const adminAuth = getApps().length > 0 ? getAuth() : null as any;
const adminFirestore = getApps().length > 0 ? getFirestore() : null as any;

export { adminAuth, adminFirestore };
