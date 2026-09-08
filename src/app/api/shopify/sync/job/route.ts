import { NextRequest, NextResponse } from 'next/server';
import { runShopifySyncJob } from '@/lib/shopify/sync-engine';
import { sanitizeShopDomain, getMissingCoreScopes } from '@/lib/shopify/config';
import { getShopifyConnection } from '@/lib/shopify/connection-store';

/**
 * POST /api/shopify/sync/job
 * Executes or resumes a sync job for an authorized Shopify connection.
 * Enforces strict multi-tenant isolation and produces deterministic HTTP status codes (Phase 16).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { jobId, shop: rawShop, tenantId: bodyTenantId, syncType, cursor } = body;

    const shop = sanitizeShopDomain(rawShop);
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Invalid or missing shop domain' }, { status: 400 });
    }

    // 1. Resolve connection record
    const connection = await getShopifyConnection(shop);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: `Shop connection not found for store: ${shop}` },
        { status: 404 }
      );
    }

    // 2. Enforce multi-tenant data isolation
    const tenantId = connection.tenantId || bodyTenantId;
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant could not be resolved for store' },
        { status: 400 }
      );
    }

    if (bodyTenantId && connection.tenantId && bodyTenantId !== connection.tenantId) {
      console.warn(`[MultiTenant] Access denied: Tenant ${bodyTenantId} attempted to sync store ${shop} owned by ${connection.tenantId}`);
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not own this Shopify connection' },
        { status: 403 }
      );
    }

    // 3. Reject if connection is missing core scopes
    const missingCore = getMissingCoreScopes(connection.grantedScopes || []);
    if (connection.status === 'PARTIAL' && missingCore.length > 0) {
      const missing = missingCore.join(', ');
      console.warn(`[Shopify Sync] Rejected sync for ${shop}: connection is missing core scopes (${missing})`);
      return NextResponse.json(
        {
          success: false,
          errorCode: 'SHOPIFY_MISSING_SCOPE',
          error: `Shopify connection is partially authorized. Missing required scopes: ${missing}. Please reauthorize the store.`,
          missingScopes: missingCore,
        },
        { status: 403 }
      );
    }

    const activeJobId = jobId || `job_${shop}_${Date.now()}`;

    // 4. Execute the paginated, resumable sync job
    const result = await runShopifySyncJob(activeJobId, shop, tenantId, {
      cursor,
      syncType,
    });

    if (!result.success) {
      const statusCode =
        result.errorCode === 'SHOPIFY_MISSING_SCOPE'
          ? 403
          : result.errorCode === 'SHOPIFY_AUTH_FAILED'
          ? 401
          : result.errorCode === 'TENANT_MISMATCH'
          ? 403
          : result.errorCode === 'SHOPIFY_RATE_LIMITED'
          ? 429
          : 500;

      return NextResponse.json(
        {
          success: false,
          jobId: activeJobId,
          errorCode: result.errorCode || 'SYNC_FAILED',
          error: result.errorMessage || 'Sync job processing encountered errors',
          stats: result.stats,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: activeJobId,
      stats: result.stats,
    });
  } catch (error: any) {
    console.error('[Shopify Sync Job Route Error]:', error);
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INTERNAL_SERVER_ERROR',
        error: error?.message || 'Sync job processing failed',
      },
      { status: 500 }
    );
  }
}
