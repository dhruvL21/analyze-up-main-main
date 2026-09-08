import { NextRequest, NextResponse } from 'next/server';
import { resolveServerTenant } from '@/lib/shopify/auth-guard';
import { sanitizeShopDomain } from '@/lib/shopify/config';
import { getShopifyConnection } from '@/lib/shopify/connection-store';
import { createShopifySalesOrder } from '@/lib/shopify/admin-api';
import { recordOutgoingOperation, completeOutgoingOperation } from '@/lib/shopify/loop-prevention';
import { getAdminFirestore } from '@/lib/firebase/admin';
import type { ShopifySalesOrderRecord } from '@/lib/shopify/types';

/**
 * POST /api/shopify/orders/create
 * Creates an authorized customer sales order in Shopify via GraphQL orderCreate mutation.
 * Uses privileged Firebase Admin SDK for trusted server persistence.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveServerTenant(req);
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized: Valid AnalyzeUp session required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { shop: rawShop, orderInput, idempotencyKey } = body;

    if (!orderInput || !Array.isArray(orderInput.lineItems) || orderInput.lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Invalid order input. At least one line item is required.' },
        { status: 400 }
      );
    }

    const shop = sanitizeShopDomain(rawShop);
    if (!shop) {
      return NextResponse.json({ error: 'Invalid or missing shop parameter.' }, { status: 400 });
    }

    const connection = await getShopifyConnection(shop);
    if (!connection) {
      return NextResponse.json({ error: 'Shopify store not connected.' }, { status: 404 });
    }
    if (connection.tenantId && connection.tenantId !== tenant.tenantId) {
      return NextResponse.json({ error: 'Access denied: Store belongs to a different tenant.' }, { status: 403 });
    }

    const db = getAdminFirestore();

    // 1. Idempotency Check: Prevent duplicate order creation on network retries
    const activeIdempotencyKey = idempotencyKey || `ord_${tenant.tenantId}_${Date.now()}`;
    if (idempotencyKey && db) {
      const existingRef = db.collection('shopify_outgoing_operations').doc(`order_idem_${idempotencyKey}`);
      const existingSnap = await existingRef.get();
      if (existingSnap.exists) {
        const data = existingSnap.data()!;
        return NextResponse.json({
          success: true,
          message: 'Order already created for this idempotency key.',
          shopifyOrderId: data.shopifyOrderId,
          shopifyOrderGid: data.shopifyOrderGid,
          orderName: data.orderName,
          deduplicated: true,
        });
      }
    }

    // 2. Register outgoing operation for loop prevention
    const opId = await recordOutgoingOperation({
      tenantId: tenant.tenantId,
      shop,
      resourceType: 'ORDER',
      resourceId: activeIdempotencyKey,
      mutationType: 'orderCreate',
    });

    // 3. Dispatch GraphQL orderCreate mutation to Shopify (with 2026-07 idempotency mechanism)
    const result = await createShopifySalesOrder({
      shop,
      orderInput,
      idempotencyKey: activeIdempotencyKey,
    });

    if (!result.success || !result.orderId) {
      await completeOutgoingOperation(opId, 'FAILED');
      return NextResponse.json(
        {
          success: false,
          error: 'Shopify order creation failed.',
          userErrors: result.userErrors,
        },
        { status: 422 }
      );
    }

    const shopifyOrderGid = result.orderId;
    const cleanOrderId = shopifyOrderGid.replace('gid://shopify/Order/', '');
    const orderName = result.orderName || `#${cleanOrderId}`;

    await completeOutgoingOperation(opId, 'COMPLETED');

    // 4. Save to `sales_orders` collection (strictly separated from supplier `purchase_orders`)
    if (db) {
      const salesOrderRef = db.collection('users').doc(tenant.tenantId).collection('sales_orders').doc(cleanOrderId);
      const salesOrderRecord: ShopifySalesOrderRecord = {
        id: `sales_order_shopify_${cleanOrderId}`,
        shopifyOrderId: cleanOrderId,
        orderNumber: orderName,
        tenantId: tenant.tenantId,
        customerName: orderInput.customer?.firstName
          ? `${orderInput.customer.firstName} ${orderInput.customer.lastName || ''}`.trim()
          : (orderInput.email || 'Customer'),
        customerEmail: orderInput.email || orderInput.customer?.email,
        financialStatus: orderInput.financialStatus || 'PAID',
        fulfillmentStatus: 'UNFULFILLED',
        currency: orderInput.currency || 'USD',
        subtotalPrice: 0,
        totalDiscounts: 0,
        totalTax: 0,
        totalPrice: Number(orderInput.totalPrice || 0),
        lineItemsCount: orderInput.lineItems.length,
        lineItems: orderInput.lineItems.map((li: any, idx: number) => ({
          id: String(li.id || idx),
          productId: String(li.productId || ''),
          variantId: String(li.variantId || ''),
          title: String(li.title || 'Product'),
          sku: String(li.sku || ''),
          quantity: Number(li.quantity || 1),
          price: Number(li.price || 0),
        })),
        processedAt: new Date().toISOString(),
        source: 'SHOPIFY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await salesOrderRef.set(salesOrderRecord, { merge: true });

      // Save idempotency marker
      if (idempotencyKey) {
        const idemRef = db.collection('shopify_outgoing_operations').doc(`order_idem_${idempotencyKey}`);
        await idemRef.set({
          shopifyOrderId: cleanOrderId,
          shopifyOrderGid,
          orderName,
          createdAt: new Date().toISOString(),
        }).catch(console.warn);
      }
    }

    return NextResponse.json({
      success: true,
      shopifyOrderId: cleanOrderId,
      shopifyOrderGid,
      orderName,
    });
  } catch (error: any) {
    console.error('[Shopify Order Creation Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Order creation failed.' },
      { status: 500 }
    );
  }
}
