import admin from 'firebase-admin';
import { env } from './env';

let firebaseApp: admin.app.App | null = null;

export const initFirebase = (): void => {
  // Skip if no key provided
  if (!env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not provided. Push notifications will be disabled.');
    return;
  }

  try {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
};

export const getFirebaseApp = (): admin.app.App | null => firebaseApp;
