import type { FirebaseStorage } from 'firebase/storage';

// Public web config (Firebase web keys are identifiers, not secrets — access
// is enforced by Storage security rules).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDWmRtxhywZGLbywUSg6atbhmibldiHcW8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "verified-biz-link.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "verified-biz-link",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "verified-biz-link.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "532266984247",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:532266984247:web:579e841d3bd28c312870b2",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-DFPG4LPG2N"
};

let storagePromise: Promise<FirebaseStorage | null> | null = null;

/**
 * Firebase Storage, loaded on first use. The SDK is only needed when someone
 * actually uploads media, so it is fetched then instead of shipping with the
 * home feed, post cards and gallery that merely import the upload helpers.
 * Resolves to null if the SDK cannot start (callers fall back to our API).
 */
export function getFirebaseStorage(): Promise<FirebaseStorage | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  storagePromise ??= (async () => {
    try {
      const [{ initializeApp, getApps, getApp }, { getStorage }] = await Promise.all([
        import('firebase/app'),
        import('firebase/storage'),
      ]);
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      return getStorage(app);
    } catch (error) {
      console.warn('Firebase Storage unavailable:', error);
      storagePromise = null; // allow a retry on the next upload
      return null;
    }
  })();
  return storagePromise;
}
