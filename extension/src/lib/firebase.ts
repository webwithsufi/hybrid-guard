import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { initializeAppCheck, CustomProvider, AppCheck } from "firebase/app-check";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAI, GoogleAIBackend, InferenceMode, AI } from "firebase/ai";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyByHKPzhE0ysqZNfCeETbJSeIP_IWzBm_4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hybrid-guard.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hybrid-guard",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hybrid-guard.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "952537243653",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:952537243653:web:78006fb5a5723f02763c6c"
};

export const APPCHECK_DEBUG_TOKEN =
  import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN || "01FCF208-1905-40C2-936E-5E0EA1EAF749";

// Mandatory rule: Set self.FIREBASE_APPCHECK_DEBUG_TOKEN BEFORE calling initializeAppCheck
if (typeof self !== "undefined") {
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = APPCHECK_DEBUG_TOKEN;
}
if (typeof window !== "undefined") {
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = APPCHECK_DEBUG_TOKEN;
}

export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const appCheck: AppCheck = initializeAppCheck(app, {
  provider: new CustomProvider({
    getToken: () =>
      Promise.resolve({
        token: "debug",
        expireTimeMillis: Date.now() + 60000
      })
  }),
  isTokenAutoRefreshEnabled: true
});

export const db: Firestore = getFirestore(app);

// Use ONLY "firebase/ai" for 100% of AI calls
export const ai: AI = getAI(app, {
  backend: new GoogleAIBackend()
});

export { InferenceMode };
