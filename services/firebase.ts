import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// The Firebase configuration for your web app
const firebaseConfig = {
  apiKey: "AIzaSyCGNkV2l9y33rYTTjcALMGFEdf6W_RxMVg",
  authDomain: "chattingmap-c97b0.firebaseapp.com",
  databaseURL: "https://chattingmap-c97b0-default-rtdb.firebaseio.com",
  projectId: "chattingmap-c97b0",
  storageBucket: "chattingmap-c97b0.firebasestorage.app",
  messagingSenderId: "73749310901",
  appId: "1:73749310901:web:aae9adff06007d5da43dfc",
  measurementId: "G-CTK0F8DD26"
};

// Initialize app only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// Initialize Firestore - use getFirestore if already initialized
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (error) {
  // Already initialized, get existing instance
  db = getFirestore(app);
}
export { db };

export const storage = getStorage(app);

// Initialize Realtime Database for matchmaking queue
export const rtdb = getDatabase(app);

// Export app for Functions initialization
export { app };

