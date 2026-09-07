import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { initializeFirebase } from '@/firebase';
import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
  convertShopifyToCanonicalProducts,
  convertShopifyToCanonicalTransactions,
  convertShopifyToCanonicalReturns,
} from '@/lib/ingestion/shopify-adapter';

function verifyWebhookHmac(rawBody: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader) return false;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'utf-8'),
      Buffer.from(hmacHeader, 'utf-8')
    );
  } catch {
    return false;
  }
}

function sanitizeShopDomain(rawShop: string): string {
  let shop = rawShop.trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!shop.includes('.myshopify.com')) {
    shop = `${shop}.myshopify.com`;
  }
  return shop;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const topic = req.headers.get('x-shopify-topic') || '';
    const rawShop = req.headers.get('x-shopify-shop-domain') || '';
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');

    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    // Verify HMAC signature when client secret is configured
    if (clientSecret && hmacHeader) {
      const isValid = verifyWebhookHmac(rawBody, hmacHeader, clientSecret);
      if (!isValid) {
        console.warn(`[Shopify Webhook] Invalid HMAC signature for shop: ${rawShop}, topic: ${topic}`);
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = {};
    }

    const shop = sanitizeShopDomain(rawShop);
    console.log(`[Shopify Webhook Received] Topic: ${topic} from Shop: ${shop}`);

    const { firestore } = initializeFirebase();
    if (!firestore) {
      console.warn('[Shopify Webhook] Firestore instance unavailable.');
      return NextResponse.json({ received: true, warning: 'Database unavailable' });
    }

    // 1. Resolve which user owns this shop
    let targetUserId: string | null = null;

    // Try direct O(1) lookup from shopify_stores index
    try {
      const storeRef = doc(firestore, 'shopify_stores', shop);
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        targetUserId = storeSnap.data()?.userId;
      }
    } catch (err) {
      console.warn('[Shopify Webhook] Could not check shopify_stores collection:', err);
    }

    // Fallback: search users collection
    if (!targetUserId) {
      try {
        const usersSnap = await getDocs(collection(firestore, 'users'));
        for (const uDoc of usersSnap.docs) {
          const profile = uDoc.data()?.settings?.business_profile || uDoc.data()?.businessProfile;
          if (profile?.shopifyStoreUrl && sanitizeShopDomain(profile.shopifyStoreUrl) === shop) {
            targetUserId = uDoc.id;
            break;
          }
        }
      } catch (err) {
        console.warn('[Shopify Webhook] User scan fallback error:', err);
      }
    }

    if (!targetUserId) {
      console.log(`[Shopify Webhook] No registered tenant found for shop: ${shop}. Acknowledging webhook.`);
      return NextResponse.json({ received: true, status: 'unmapped_shop' });
    }

    const batch = writeBatch(firestore);
    let itemsCount = 0;

    // 2. Ingest Orders (Sales) Real-Time
    if (topic.startsWith('orders/')) {
      const transactions = convertShopifyToCanonicalTransactions([payload]);
      for (const tx of transactions) {
        const txRef = doc(firestore, 'users', targetUserId, 'transactions', tx.id);
        batch.set(txRef, {
          ...tx,
          userId: targetUserId,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        itemsCount++;
      }

      // If order contains refunds or returns, ingest them real-time
      if (payload.refunds && Array.isArray(payload.refunds) && payload.refunds.length > 0) {
        const orderReturns = convertShopifyToCanonicalReturns([payload]);
        for (const ret of orderReturns) {
          const retRef = doc(firestore, 'users', targetUserId, 'returns', ret.id);
          batch.set(retRef, {
            ...ret,
            userId: targetUserId,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          const txRefundRef = doc(firestore, 'users', targetUserId, 'transactions', `tx_refund_${ret.id}`);
          batch.set(txRefundRef, {
            id: `tx_refund_${ret.id}`,
            tenantId: targetUserId,
            userId: targetUserId,
            productId: ret.productId,
            productName: ret.productName,
            sku: ret.sku || 'N/A',
            category: 'Returns',
            locationId: 'MAIN-WAREHOUSE',
            type: 'Sale',
            quantity: -Math.abs(ret.quantity),
            price: ret.quantity > 0 ? Math.round(ret.refundAmount / ret.quantity) : ret.refundAmount,
            unitPrice: ret.quantity > 0 ? Math.round(ret.refundAmount / ret.quantity) : ret.refundAmount,
            totalRevenue: -Math.abs(ret.refundAmount),
            costPrice: 0,
            costPerUnit: 0,
            totalCost: 0,
            customerName: ret.customerName,
            orderNumber: ret.orderNumber || `RET-${ret.id}`,
            transactionDate: ret.returnDate || new Date().toISOString().split('T')[0],
            source: 'SHOPIFY',
            status: 'Completed',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
          itemsCount++;
        }
      }
    }

    // 3. Ingest Refunds & Returns Real-Time (topic: refunds/create)
    if (topic.startsWith('refunds/')) {
      const returns = convertShopifyToCanonicalReturns([payload]);
      for (const ret of returns) {
        const retRef = doc(firestore, 'users', targetUserId, 'returns', ret.id);
        batch.set(retRef, {
          ...ret,
          userId: targetUserId,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        // Record idempotent Sale adjustment transaction (negative sales & revenue)
        const txRefundRef = doc(firestore, 'users', targetUserId, 'transactions', `tx_refund_${ret.id}`);
        batch.set(txRefundRef, {
          id: `tx_refund_${ret.id}`,
          tenantId: targetUserId,
          userId: targetUserId,
          productId: ret.productId,
          productName: ret.productName,
          sku: ret.sku || 'N/A',
          category: 'Returns',
          locationId: 'MAIN-WAREHOUSE',
          type: 'Sale',
          quantity: -Math.abs(ret.quantity),
          price: ret.quantity > 0 ? Math.round(ret.refundAmount / ret.quantity) : ret.refundAmount,
          unitPrice: ret.quantity > 0 ? Math.round(ret.refundAmount / ret.quantity) : ret.refundAmount,
          totalRevenue: -Math.abs(ret.refundAmount),
          costPrice: 0,
          costPerUnit: 0,
          totalCost: 0,
          customerName: ret.customerName,
          orderNumber: ret.orderNumber || `RET-${ret.id}`,
          transactionDate: ret.returnDate || new Date().toISOString().split('T')[0],
          source: 'SHOPIFY',
          status: 'Completed',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        itemsCount++;
      }
    }

    // 4. Ingest Products Real-Time
    if (topic.startsWith('products/')) {
      if (topic === 'products/delete') {
        const prodId = payload.id;
        console.log(`[Shopify Webhook] Product deleted: ${prodId}`);
      } else {
        const products = convertShopifyToCanonicalProducts([payload]);
        for (const prod of products) {
          const prodRef = doc(firestore, 'users', targetUserId, 'products', prod.id);
          batch.set(prodRef, {
            ...prod,
            userId: targetUserId,
            updatedAt: serverTimestamp(),
          }, { merge: true });
          itemsCount++;
        }
      }
    }

    // Record last sync timestamp on business profile
    const profileRef = doc(firestore, 'users', targetUserId, 'settings', 'business_profile');
    batch.set(profileRef, {
      shopifyLastSyncedAt: new Date().toISOString(),
      shopifyStatus: 'Connected',
    }, { merge: true });

    // Record webhook event log
    const eventId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const eventRef = doc(firestore, 'users', targetUserId, 'shopify_events', eventId);
    batch.set(eventRef, {
      id: eventId,
      topic,
      shop,
      itemsProcessed: itemsCount,
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    console.log(`[Shopify Webhook Processed] Successfully updated ${itemsCount} items for user ${targetUserId}`);

    return NextResponse.json({
      received: true,
      processed: true,
      topic,
      shop,
      itemsCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Shopify Webhook Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Webhook processing error' },
      { status: 500 }
    );
  }
}
