'use client';
import { FirebaseApp } from 'firebase/app';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';

// Create a context for the Firebase instances
const FirebaseContext = createContext<{
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  user: User | null;
  loading: boolean;
} | null>(null);

// This provider makes the Firebase instances available to the rest of the app.
export const FirebaseProvider = ({
  children,
  app,
  auth,
  firestore,
}: {
  children: React.ReactNode;
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}) => {
  const [user, setUser] = useState<User | null>(() => auth?.currentUser || null);
  const [loading, setLoading] = useState<boolean>(() => !auth?.currentUser);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    if (auth.currentUser) {
      setUser(auth.currentUser);
      setLoading(false);
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const value = useMemo(
    () => ({ app, auth, firestore, user, loading }),
    [app, auth, firestore, user, loading]
  );

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

// These hooks provide an easy way to access the Firebase instances.
export const useFirebase = () => useContext(FirebaseContext);
export const useFirebaseApp = () => useContext(FirebaseContext)?.app;
export const useFirestore = () => useContext(FirebaseContext)?.firestore;
export const useAuth = () => useContext(FirebaseContext)?.auth;
export const useUser = () => {
  const ctx = useContext(FirebaseContext);
  return {
    user: ctx?.user ?? null,
    loading: ctx?.loading ?? true,
  };
};
