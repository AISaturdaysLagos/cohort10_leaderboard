import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, type Auth, type User } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() ?? "",
};

/** Optional single mentor email for allowlist (see VITE_FIREBASE_ADMIN_EMAILS). */
export const FIREBASE_ADMIN_EMAIL = import.meta.env.VITE_FIREBASE_ADMIN_EMAIL?.trim() ?? "";

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

/** Wait until Firebase Auth has resolved and an ID token is ready (needed before Firestore config reads). */
export async function waitForFirebaseUser(): Promise<User | null> {
  if (!isFirebaseConfigured()) return null;
  const auth = getFirebaseAuth();
  let user = auth.currentUser;
  if (!user) {
    user = await new Promise<User | null>((resolve) => {
      const unsub = onAuthStateChanged(auth, (nextUser) => {
        unsub();
        resolve(nextUser);
      });
    });
  }
  if (user) await user.getIdToken();
  return user;
}
