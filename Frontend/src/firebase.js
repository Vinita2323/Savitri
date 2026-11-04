import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCTPH6aJv5ZVqJZvhzyoHq7ug5Vm-d-a18',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'swdms-681e9.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'swdms-681e9',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'swdms-681e9.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '990297902089',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:990297902089:web:e4bbb9309555826d8cbcd8',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-B8BWS8KVNV',
};

let app = null;
let messaging = null;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Check if browser environment supports FCM service workers
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    isSupported().then((supported) => {
      if (supported) {
        messaging = getMessaging(app);
      }
    }).catch(() => {});
  }
} catch (err) {
  console.warn('[Firebase Init Warning]:', err.message);
}

export { app, messaging, getToken, onMessage };
export default app;
