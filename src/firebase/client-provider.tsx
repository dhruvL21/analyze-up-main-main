'use client';
import { useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

// This provider is responsible for initializing Firebase on the client side.
// It should be used as a wrapper around the app's root component.
export const FirebaseClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const instances = useMemo(() => initializeFirebase(), []);
  return <FirebaseProvider {...instances}>{children}</FirebaseProvider>;
};
