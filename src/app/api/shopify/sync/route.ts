import { NextRequest, NextResponse } from 'next/server';
import {
  convertShopifyToCanonicalProducts,
  convertShopifyToCanonicalTransactions,
} from '@/lib/ingestion/shopify-adapter';

function sanitizeShopDomain(rawShop: string): string | null {
  if (!rawShop) return null;
  let shop = rawShop.trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!shop.includes('.myshopify.com')) {
    shop = `${shop}.myshopify.com`;
  }
  const validShopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  return validShopRegex.test(shop) ? shop : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shop: rawShop, accessToken } = body;

    if (!rawShop || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Shop domain and access token are required for syncing.' },
        { status: 400 }
      );
    }

    const shop = sanitizeShopDomain(rawShop);
    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Invalid Shopify store URL format. Expected: your-store.myshopify.com' },
        { status: 400 }
      );
    }

    const token = accessToken.trim();
    const headers = {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    };

    // 1. Fetch Products & Variants from Shopify Admin API
    let rawProducts: any[] = [];
    try {
      const productsRes = await fetch(
        `https://${shop}/admin/api/2024-01/products.json?limit=250`,
        { method: 'GET', headers }
      );

      if (productsRes.ok) {
        const prodData = await productsRes.json();
        rawProducts = prodData.products || [];
      } else {
        const errText = await productsRes.text();
        console.warn(`[Shopify Sync] Could not fetch products (${productsRes.status}):`, errText);
      }
    } catch (prodErr) {
      console.warn('[Shopify Sync] Error fetching products:', prodErr);
    }

    // 2. Fetch Orders from Shopify Admin API
    let rawOrders: any[] = [];
    try {
      const ordersRes = await fetch(
        `https://${shop}/admin/api/2024-01/orders.json?status=any&limit=250`,
        { method: 'GET', headers }
      );

      if (ordersRes.ok) {
        const orderData = await ordersRes.json();
        rawOrders = orderData.orders || [];
      } else {
        const errText = await ordersRes.text();
        console.warn(`[Shopify Sync] Could not fetch orders (${ordersRes.status}):`, errText);
      }
    } catch (orderErr) {
      console.warn('[Shopify Sync] Error fetching orders:', orderErr);
    }

    // 3. Transform to Canonical Models
    const canonicalProducts = convertShopifyToCanonicalProducts(rawProducts);
    const canonicalTransactions = convertShopifyToCanonicalTransactions(rawOrders);

    return NextResponse.json({
      success: true,
      shop,
      products: canonicalProducts,
      transactions: canonicalTransactions,
      stats: {
        rawProductsCount: rawProducts.length,
        canonicalProductsCount: canonicalProducts.length,
        rawOrdersCount: rawOrders.length,
        canonicalTransactionsCount: canonicalTransactions.length,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Shopify Sync Endpoint Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to sync Shopify store data.' },
      { status: 500 }
    );
  }
}
