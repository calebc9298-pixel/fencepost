import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyA8qJ8V1zB0Or8zyVaktXX_6lYVJqbTp-A',
  authDomain: 'fencepost-65663.firebaseapp.com',
  projectId: 'fencepost-65663',
  storageBucket: 'fencepost-65663.firebasestorage.app',
  messagingSenderId: '46532504890',
  appId: '1:46532504890:web:78f810ac968b3a2ced7403',
  measurementId: 'G-VGJNYT2PBW',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// On web, explicitly persist auth so Storage requests can always get a token.
// (Without this, uploads can hang or behave inconsistently across refreshes.)
if (typeof window !== 'undefined') {
  // Fire-and-forget; if it fails we still have in-memory auth.
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Firebase Analytics (web only)
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
export { analytics };
