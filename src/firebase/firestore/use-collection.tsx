'use client';

import {
  onSnapshot,
  type CollectionReference,
  type Query,
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
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
  const recordsRef = useRef<Map<string, T>>(new Map());

  useEffect(() => {
    if (!ref) {
      return;
    }

    recordsRef.current = new Map();
    setState((prev) => (prev.loading ? prev : { ...prev, loading: true }));
    let receivedInitialSnapshot = false;

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const changes = snapshot.docChanges();

        // Firestore sends the full collection in every snapshot. Rebuilding and
        // deeply serializing all records on every import batch blocks the main
        // thread for large datasets. Apply only changed documents to the local
        // snapshot cache; the initial snapshot still contains every document.
        changes.forEach((change) => {
          if (change.type === 'removed') {
            recordsRef.current.delete(change.doc.id);
            return;
          }
          recordsRef.current.set(change.doc.id, serializePlainData<T>({
            id: change.doc.id,
            ...change.doc.data(),
          }));
        });

        if (!receivedInitialSnapshot || changes.length > 0) {
          receivedInitialSnapshot = true;
          setState({ data: Array.from(recordsRef.current.values()), loading: false });
        }
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
