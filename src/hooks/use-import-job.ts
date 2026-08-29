'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import {
  type ImportJob,
  type ImportErrorRecord,
  getImportJobErrors,
  updateImportJobBatchProgress,
} from '@/lib/import-job-service';
import { serializePlainData } from '@/lib/utils';
import { useToast } from './use-toast';

export function useImportJob(jobId?: string | null) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [errors, setErrors] = useState<ImportErrorRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const notifiedCompleteRef = useRef<string | null>(null);

  // 1. If jobId is provided, listen to that specific job
  useEffect(() => {
    if (!firestore || !user) {
      setActiveJob(null);
      setIsLoading(false);
      return;
    }

    if (jobId) {
      const jobRef = doc(firestore, 'users', user.uid, 'importJobs', jobId);
      const unsubscribe = onSnapshot(jobRef, async snap => {
        if (snap.exists()) {
          const jobData = serializePlainData<ImportJob>({ id: snap.id, ...snap.data() });
          setActiveJob(jobData);

          // If job has errors, load errors subcollection
          if (jobData.failedRecords > 0) {
            const errs = await getImportJobErrors(firestore, user.uid, jobId, 25);
            setErrors(errs);
          }

          // Trigger completion toast once
          if (
            (jobData.status === 'COMPLETED' || jobData.status === 'COMPLETED_WITH_ERRORS') &&
            notifiedCompleteRef.current !== jobData.id
          ) {
            notifiedCompleteRef.current = jobData.id;
            toast({
              title: jobData.status === 'COMPLETED' ? 'Dataset Import Complete ✨' : 'Import Complete with Warnings',
              description: `Successfully imported ${jobData.successfulRecords.toLocaleString()} records${
                jobData.failedRecords > 0 ? ` (${jobData.failedRecords} rows skipped due to format issues)` : ''
              }. Analytics & dashboard refreshed.`,
            });
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('analyzeup_import_finished'));
              window.dispatchEvent(new CustomEvent('analyzeup_audit_logged'));
            }
          }
        } else {
          setActiveJob(null);
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      // 2. Discover any ongoing active import job on page load/refresh
      let unsubscribeActive: (() => void) | undefined;
      const checkActive = async () => {
        try {
          const jobsRef = collection(firestore, 'users', user.uid, 'importJobs');
          const q = query(
            jobsRef,
            where('status', 'in', ['QUEUED', 'VALIDATING', 'IMPORTING', 'PROCESSING']),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const activeDoc = snap.docs[0];
            const activeRef = doc(firestore, 'users', user.uid, 'importJobs', activeDoc.id);
            unsubscribeActive = onSnapshot(activeRef, s => {
              if (s.exists()) {
                setActiveJob(serializePlainData<ImportJob>({ id: s.id, ...s.data() }));
              } else {
                setActiveJob(null);
              }
            });
          } else {
            setActiveJob(null);
          }
        } catch (e) {
          console.warn('Error checking active import jobs:', e);
        } finally {
          setIsLoading(false);
        }
      };

      checkActive();
      return () => {
        if (unsubscribeActive) unsubscribeActive();
      };
    }
  }, [firestore, user, jobId, toast]);

  const cancelJob = useCallback(
    async (targetJobId: string) => {
      if (!firestore || !user) return;
      await updateImportJobBatchProgress(firestore, user.uid, targetJobId, {
        status: 'CANCELLED',
        errorMessage: 'Cancelled by user',
      });
      toast({ title: 'Import Cancelled', description: 'The import process has been halted.' });
    },
    [firestore, user, toast]
  );

  const clearActiveJob = useCallback(() => {
    setActiveJob(null);
    setErrors([]);
  }, []);

  return {
    activeJob,
    errors,
    isLoading,
    cancelJob,
    clearActiveJob,
  };
}
