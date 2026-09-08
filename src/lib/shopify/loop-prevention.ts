/**
 * Durable Outgoing Operation Tracking & Infinite-Loop Prevention
 * Prevents recursive outbound operations (AnalyzeUp -> Shopify -> Webhook -> AnalyzeUp -> Shopify)
 * by recording durable operation identifiers in `shopify_outgoing_operations` via privileged Firebase Admin SDK.
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import type { ShopifyOutgoingOperation } from './types';
import { sanitizeShopDomain } from './config';

/**
 * Records an outgoing operation initiated by AnalyzeUp before dispatching to Shopify.
 */
export async function recordOutgoingOperation(params: {
  tenantId: string;
  shop: string;
  resourceType: 'INVENTORY' | 'PRODUCT_PRICE' | 'ORDER';
  resourceId: string;
  mutationType: string;
}): Promise<string> {
  const shop = sanitizeShopDomain(params.shop) || params.shop;
  const operationId = `op_${params.resourceType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const db = getAdminFirestore();
    if (db) {
      const batch = db.batch();
      const opRef = db.collection('shopify_outgoing_operations').doc(operationId);
      batch.set(opRef, {
        operationId,
        tenantId: params.tenantId,
        shop,
        resourceType: params.resourceType,
        resourceId: String(params.resourceId),
        mutationType: params.mutationType,
        createdAt: new Date().toISOString(),
        status: 'IN_FLIGHT',
      });

      // Also record a resource marker for fast lookup: `marker_${shop}_${params.resourceId}`
      const markerRef = db.collection('shopify_outgoing_operations').doc(`marker_${shop}_${params.resourceId}`);
      batch.set(markerRef, {
        lastOperationId: operationId,
        resourceType: params.resourceType,
        resourceId: String(params.resourceId),
        updatedAt: new Date().toISOString(),
      });

      await batch.commit();
    }
  } catch (err) {
    console.warn('[Loop Prevention] Error saving outgoing op:', err);
  }

  return operationId;
}

/**
 * Checks if a recent outbound operation was initiated by AnalyzeUp for this resource.
 * If true, the webhook handler should still update local state, but MUST NOT trigger another outbound mutation.
 */
export async function checkIsOutgoingOperation(
  rawShop: string,
  resourceId: string
): Promise<{ isOriginatingFromAnalyzeUp: boolean; operationId?: string }> {
  if (!resourceId) {
    return { isOriginatingFromAnalyzeUp: false };
  }

  const shop = sanitizeShopDomain(rawShop) || rawShop;

  try {
    const db = getAdminFirestore();
    if (db) {
      const markerRef = db.collection('shopify_outgoing_operations').doc(`marker_${shop}_${resourceId}`);
      const snap = await markerRef.get();

      if (snap.exists) {
        const data = snap.data()!;
        const opAgeMs = Date.now() - new Date(data.updatedAt).getTime();
        // If operation was recorded within the last 2 minutes, flag as self-originated
        if (opAgeMs < 2 * 60 * 1000) {
          return {
            isOriginatingFromAnalyzeUp: true,
            operationId: data.lastOperationId,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Loop Prevention] Error checking outgoing marker:', err);
  }

  return { isOriginatingFromAnalyzeUp: false };
}

/**
 * Marks an outgoing operation as COMPLETED or FAILED.
 */
export async function completeOutgoingOperation(
  operationId: string,
  status: 'COMPLETED' | 'FAILED'
): Promise<void> {
  if (!operationId) return;

  try {
    const db = getAdminFirestore();
    if (db) {
      const opRef = db.collection('shopify_outgoing_operations').doc(operationId);
      await opRef.update({
        status,
        completedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[Loop Prevention] Error completing op:', err);
  }
}
