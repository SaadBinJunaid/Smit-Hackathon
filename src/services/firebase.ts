import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBx7KKPbLsf5_WKGCQCnZX-3oNcEy7Jut4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "assignment-d4633.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "assignment-d4633",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "assignment-d4633.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1081572534801",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1081572534801:web:76a67fb2a46d371dd9dfb0",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export const IS_FIREBASE_CONFIGURED = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
