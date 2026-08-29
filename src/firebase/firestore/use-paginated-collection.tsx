'use client';

import {
  type CollectionReference,
  type DocumentSnapshot,
  query,
  limit,
  orderBy,
  startAfter,
  getDocs,
  where,
  type WhereFilterOp,
} from 'firebase/firestore';
import { useEffect, useState, useCallback, useRef } from 'react';
import { serializePlainData } from '@/lib/utils';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export interface PaginatedOptions {
  pageSize?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  whereClauses?: Array<[string, WhereFilterOp, any]>;
}

export interface UsePaginatedState<T> {
  data: T[];
  loading: boolean;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: () => void;
  prevPage: () => void;
  refetch: () => Promise<void>;
}

export function usePaginatedCollection<T>(
  ref: CollectionReference | null,
  options: PaginatedOptions = {}
): UsePaginatedState<T> {
  const {
    pageSize = 25,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    whereClauses = [],
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Store pagination cursors for previous/next navigation
  const cursorsRef = useRef<Map<number, DocumentSnapshot>>(new Map());

  const fetchPage = useCallback(
    async (pageNumber: number) => {
      if (!ref) {
        setData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const constraints: any[] = [];

        // Apply where filters
        whereClauses.forEach(([field, op, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            constraints.push(where(field, op, val));
          }
        });

        // Apply orderBy
        if (orderByField) {
          constraints.push(orderBy(orderByField, orderDirection));
        }

        // Apply cursor for pages > 1
        if (pageNumber > 1) {
          const cursor = cursorsRef.current.get(pageNumber - 1);
          if (cursor) {
            constraints.push(startAfter(cursor));
          }
        }

        // Fetch pageSize + 1 to check if hasNextPage
        constraints.push(limit(pageSize + 1));

        const q = query(ref, ...constraints);
        const snapshot = await getDocs(q);

        const docs = snapshot.docs;
        const hasMore = docs.length > pageSize;
        const itemsToReturn = hasMore ? docs.slice(0, pageSize) : docs;

        // Save cursor for current page's last document
        if (itemsToReturn.length > 0) {
          cursorsRef.current.set(pageNumber, itemsToReturn[itemsToReturn.length - 1]);
        }

        const serialized = itemsToReturn.map(docSnap =>
          serializePlainData<T>({
            id: docSnap.id,
            ...docSnap.data(),
          })
        );

        setData(serialized);
        setHasNextPage(hasMore);
        setPage(pageNumber);
      } catch (err: any) {
        console.error('Error fetching paginated collection:', err);
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: ref.path,
            operation: 'list',
          })
        );
      } finally {
        setLoading(false);
      }
    },
    [ref, pageSize, orderByField, orderDirection, whereClauses]
  );

  useEffect(() => {
    cursorsRef.current.clear();
    setPage(1);
    fetchPage(1);
  }, [fetchPage]);

  const nextPage = useCallback(() => {
    if (hasNextPage && !loading) {
      fetchPage(page + 1);
    }
  }, [hasNextPage, loading, page, fetchPage]);

  const prevPage = useCallback(() => {
    if (page > 1 && !loading) {
      fetchPage(page - 1);
    }
  }, [page, loading, fetchPage]);

  const refetch = useCallback(async () => {
    await fetchPage(page);
  }, [fetchPage, page]);

  return {
    data,
    loading,
    page,
    pageSize,
    hasNextPage,
    hasPrevPage: page > 1,
    nextPage,
    prevPage,
    refetch,
  };
}
