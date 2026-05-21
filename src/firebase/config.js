import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBNcdOE_7Gehb5rByhwEwBJZKLt9jOzPhI",
  authDomain: "imperial-university.firebaseapp.com",
  projectId: "imperial-university",
  storageBucket: "imperial-university.firebasestorage.app",
  messagingSenderId: "867091807986",
  appId: "1:867091807986:web:e2e21d267ffe43a64c1a6b",
  measurementId: "G-BGW94FF6ZP"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;