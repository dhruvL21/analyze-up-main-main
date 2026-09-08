import { NextRequest, NextResponse } from 'next/server';
import { resolveServerTenant } from '@/lib/shopify/auth-guard';
import { sanitizeShopDomain, getShopifyAppUrl } from '@/lib/shopify/config';
import { getShopifyConnection } from '@/lib/shopify/connection-store';
import { createSyncJob } from '@/lib/shopify/sync-engine';

/**
 * POST /api/shopify/reconcile
 * Authenticated reconciliation endpoint.
 * 
 * Instead of performing an expensive synchronous scrape that can time out on large stores,
 * this endpoint enqueues a background reconciliation sync job (shopify_sync_jobs)
 * and returns immediately with the job ID.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveServerTenant(req);
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized: Valid AnalyzeUp session required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawShop = body.shop;

    if (!rawShop) {
      return NextResponse.json({ error: 'Missing shop parameter.' }, { status: 400 });
    }

    const shop = sanitizeShopDomain(rawShop);
    if (!shop) {
      return NextResponse.json({ error: 'Invalid Shopify store domain.' }, { status: 400 });
    }

    const connection = await getShopifyConnection(shop);
    if (!connection) {
      return NextResponse.json({ error: 'Shopify store not connected.' }, { status: 404 });
    }

    if (connection.tenantId && connection.tenantId !== tenant.tenantId) {
      return NextResponse.json({ error: 'Access denied: Store belongs to a different tenant.' }, { status: 403 });
    }

    if (connection.status === 'UNINSTALLED') {
      return NextResponse.json({ error: 'Cannot reconcile an uninstalled store.' }, { status: 400 });
    }

    // Enqueue reconciliation sync job in Firestore
    const jobId = await createSyncJob(tenant.tenantId, shop, 'ALL');

    // Asynchronously trigger the worker without blocking HTTP response
    const appUrl = getShopifyAppUrl(req.headers.get('host') || undefined);
    fetch(`${appUrl}/api/shopify/sync/job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        shop,
        tenantId: tenant.tenantId,
        syncType: 'ALL',
      }),
    }).catch((err) => {
      console.warn('[Reconciliation] Background worker invocation note:', err);
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Reconciliation job queued successfully.',
    });
  } catch (error: any) {
    console.error('[Shopify Reconcile Route Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to trigger store reconciliation.' },
      { status: 500 }
    );
  }
}
