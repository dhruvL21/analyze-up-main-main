import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Recursively converts Firestore Timestamps, Dates, and custom class instances
 * into pure, plain serializable JavaScript objects and ISO date strings.
 * This guarantees safe Next.js Server Action argument serialization.
 */
export function serializePlainData<T>(val: any): T {
  if (val === null || val === undefined) return val;
  if (typeof val === 'function' || typeof val === 'symbol') return undefined as any;
  if (typeof val !== 'object') return val;

  // Handle Firestore Timestamp with toDate() or { seconds, nanoseconds }
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString() as any;
    } catch {
      return new Date().toISOString() as any;
    }
  }
  if (typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') {
    return new Date(val.seconds * 1000).toISOString() as any;
  }
  if (val instanceof Date) {
    return val.toISOString() as any;
  }

  if (Array.isArray(val)) {
    return val.map(item => serializePlainData(item)) as any;
  }

  // Create pure plain dictionary (null prototype or Object.prototype with no methods)
  const plain: Record<string, any> = {};
  for (const key of Object.keys(val)) {
    if (key === 'toJSON') continue;
    const cleaned = serializePlainData(val[key]);
    if (cleaned !== undefined) {
      plain[key] = cleaned;
    }
  }
  return plain as T;
}

export const sanitizePlainData = serializePlainData;

export function getCurSymbol(profile?: { currency?: string } | null): string {
  return profile?.currency?.includes('USD') ? '$' : '₹';
}

export function formatCur(val: number, profile?: { currency?: string } | null): string {
  const sym = getCurSymbol(profile);
  return `${sym}${Math.round(val || 0).toLocaleString('en-IN')}`;
}

export function formatCurrency(val: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(val || 0));
}
