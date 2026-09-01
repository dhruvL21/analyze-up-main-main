'use client';

import {
  onSnapshot,
  type CollectionReference,
  type Query,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { serializePlainData } from '@/lib/utils';

type UseCollectionState<T> = {
  data: T[] | null;
  loading: boolean;
};

export function useCollection<T>(ref: Query | CollectionReference | null) {
  const [state, setState] = useState<UseCollectionState<T>>({
    data: null,
    loading: true,
  });

  const path = ref && 'path' in ref ? (ref as CollectionReference).path : undefined;

  useEffect(() => {
    if (!ref) {
      return;
    }
    
    setState((prev) => (prev.loading ? prev : { ...prev, loading: true }));

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const raw = {
            id: doc.id,
            ...doc.data(),
          };
          return serializePlainData<T>(raw);
        });
        setState({ data, loading: false });
      },
      (serverError) => {
        console.error('Error listening to collection:', serverError);
        const permissionError = new FirestorePermissionError({
          path: path || 'query',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setState({ data: null, loading: false });
      }
    );
    return () => unsubscribe();
  }, [ref, path]);

  return state;
}
