import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCyuA8a7CPMAC8YKMXcJ5o1-7FDYBEjfcA",
  authDomain: "sticker-responses.firebaseapp.com",
  projectId: "sticker-responses",
  storageBucket: "sticker-responses.firebasestorage.app",
  messagingSenderId: "768304605509",
  appId: "1:768304605509:web:030aca38010148f03af62c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
