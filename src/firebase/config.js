import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBNcdOE_7Gehb5rByhwEwBJZKLt9jOzPhI",
  authDomain: "imperial-university.firebaseapp.com",
  projectId: "imperial-university",
  storageBucket: "imperial-university.firebasestorage.app",
  messagingSenderId: "867091807986",
  appId: "1:867091807986:web:e2e21d267ffe43a64c1a6b"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;