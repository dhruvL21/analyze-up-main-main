import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  type Firestore,
  type FieldValue,
} from 'firebase/firestore';
import { cleanNumber, cleanInteger, cleanDate } from './ingestion/data-validator';
import { serializePlainData } from './utils';

export type ImportJobStatus =
  | 'QUEUED'
  | 'VALIDATING'
  | 'IMPORTING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED'
  | 'CANCELLED';

export interface ImportErrorRecord {
  id?: string;
  jobId: string;
  batchNumber: number;
  rowNumber: number;
  recordIdentifier?: string;
  error: string;
  errorType: 'VALIDATION' | 'DUPLICATE' | 'DATABASE' | 'SCHEMA';
  retryable: boolean;
  rawData?: Record<string, any>;
  createdAt: string | FieldValue;
}

export interface ImportJob {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  status: ImportJobStatus;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  currentBatch: number;
  totalBatches: number;
  batchSize: number;
  progress: number; // 0 - 100
  estimatedRevenueImpact?: number;
  categoriesCreated?: number;
  suppliersCreated?: number;
  errorMessage?: string;
  driveFileId?: string;
  createdAt: string | FieldValue;
  startedAt?: string | FieldValue;
  completedAt?: string | FieldValue;
  updatedAt: string | FieldValue;
}

/**
 * Generates a deterministic, URL-safe and Firestore-safe document ID
 * to guarantee 100% idempotent upserts.
 */
export function generateDeterministicId(prefix: string, ...components: (string | number | undefined | null)[]): string {
  const raw = components
    .filter(c => c !== undefined && c !== null && String(c).trim().length > 0)
    .map(c => String(c).trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'))
    .join('_');

  const cleanPrefix = prefix ? `${prefix}_` : '';
  const sanitized = `${cleanPrefix}${raw}`.slice(0, 100);
  return sanitized.length > cleanPrefix.length ? sanitized : `${cleanPrefix}item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function generateProductDocId(sku?: string, name?: string): string {
  if (sku && sku.trim().length > 0) {
    return generateDeterministicId('prod', sku);
  }
  return generateDeterministicId('prod', name);
}

export function generateTransactionDocId(orderNumber?: string, sku?: string, date?: string, rowIdx?: number): string {
  if (orderNumber && orderNumber.trim().length > 0) {
    return generateDeterministicId('tx', orderNumber, sku);
  }
  return generateDeterministicId('tx', sku, date, rowIdx);
}

/**
 * Creates a new Import Job document in Firestore
 */
export async function createImportJob(
  firestore: Firestore,
  userId: string,
  params: {
    fileName: string;
    fileType: string;
    totalRecords: number;
    batchSize?: number;
    driveFileId?: string;
  }
): Promise<ImportJob> {
  const batchSize = params.batchSize || 100;
  const totalBatches = Math.max(1, Math.ceil(params.totalRecords / batchSize));

  const jobRef = doc(collection(firestore, 'users', userId, 'importJobs'));
  const now = new Date().toISOString();

  const newJob: ImportJob = {
    id: jobRef.id,
    userId,
    fileName: params.fileName,
    fileType: params.fileType,
    status: 'QUEUED',
    totalRecords: params.totalRecords,
    processedRecords: 0,
    successfulRecords: 0,
    failedRecords: 0,
    currentBatch: 0,
    totalBatches,
    batchSize,
    progress: 0,
    driveFileId: params.driveFileId,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(jobRef, serializePlainData(newJob));
  return newJob;
}

/**
 * Fetches an existing Import Job by ID
 */
export async function getImportJob(
  firestore: Firestore,
  userId: string,
  jobId: string
): Promise<ImportJob | null> {
  const jobRef = doc(firestore, 'users', userId, 'importJobs', jobId);
  const snap = await getDoc(jobRef);
  if (!snap.exists()) return null;
  return serializePlainData<ImportJob>({ id: snap.id, ...snap.data() });
}

/**
 * Finds any active, uncompleted Import Job for a user (resumption support)
 */
export async function findActiveImportJob(
  firestore: Firestore,
  userId: string
): Promise<ImportJob | null> {
  try {
    const jobsRef = collection(firestore, 'users', userId, 'importJobs');
    const q = query(
      jobsRef,
      where('status', 'in', ['QUEUED', 'VALIDATING', 'IMPORTING', 'PROCESSING']),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const firstDoc = snap.docs[0];
    return serializePlainData<ImportJob>({ id: firstDoc.id, ...firstDoc.data() });
  } catch (err) {
    console.warn('Error querying active import jobs:', err);
    return null;
  }
}

/**
 * Updates batch progress and status for an import job
 */
export async function updateImportJobBatchProgress(
  firestore: Firestore,
  userId: string,
  jobId: string,
  updates: Partial<ImportJob>
): Promise<void> {
  const jobRef = doc(firestore, 'users', userId, 'importJobs', jobId);
  const patch: Record<string, any> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.status === 'COMPLETED' || updates.status === 'COMPLETED_WITH_ERRORS' || updates.status === 'FAILED') {
    patch.completedAt = new Date().toISOString();
  }

  await updateDoc(jobRef, serializePlainData(patch));
}

/**
 * Logs failed rows to the job's errors subcollection
 */
export async function logImportJobErrors(
  firestore: Firestore,
  userId: string,
  jobId: string,
  errors: Omit<ImportErrorRecord, 'createdAt' | 'jobId'>[]
): Promise<void> {
  if (!errors || errors.length === 0) return;

  const CHUNK = 400;
  for (let i = 0; i < errors.length; i += CHUNK) {
    const chunk = errors.slice(i, i + CHUNK);
    const batch = writeBatch(firestore);

    chunk.forEach(err => {
      const errRef = doc(collection(firestore, 'users', userId, 'importJobs', jobId, 'errors'));
      batch.set(errRef, {
        jobId,
        ...err,
        createdAt: new Date().toISOString(),
      });
    });

    await batch.commit().catch(e => console.error('Failed to log import errors:', e));
  }
}

/**
 * Fetches errors logged for a given import job
 */
export async function getImportJobErrors(
  firestore: Firestore,
  userId: string,
  jobId: string,
  maxRecords = 100
): Promise<ImportErrorRecord[]> {
  try {
    const errRef = collection(firestore, 'users', userId, 'importJobs', jobId, 'errors');
    const q = query(errRef, limit(maxRecords));
    const snap = await getDocs(q);
    return snap.docs.map(d => serializePlainData<ImportErrorRecord>({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error fetching import job errors:', e);
    return [];
  }
}

/**
 * Executes a Firestore write operation with exponential backoff retry
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 500
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
      console.warn(`Firestore operation failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay)}ms:`, err?.message || err);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Operation exceeded maximum retry attempts');
}
