import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Suppress internal gRPC idle stream disconnect logs from Firebase Client SDK
try {
  setLogLevel('silent');
} catch {
  // ignore in non-browser/unsupported environments
}

// Hooks and providers
export { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { usePaginatedCollection } from './firestore/use-paginated-collection';
export { useDoc } from './firestore/use-doc';

// Initialize Firebase
export function initializeFirebase() {
  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  return { app, auth, firestore };
}
