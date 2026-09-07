import { NextRequest, NextResponse } from 'next/server';

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

    const shop = sanitizeShopDomain(rawShop);
    if (!shop || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Shop domain and access token are required.' },
        { status: 400 }
      );
    }

    const res = await fetch(`https://${shop}/admin/oauth/access_scopes.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken.trim(),
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Shopify token invalid or expired (401).',
      }, { status: 401 });
    }

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch access scopes from Shopify (${res.status}).`,
      }, { status: res.status });
    }

    const data = await res.json();
    const scopes: string[] = (data.access_scopes || []).map((s: any) => s.handle);

    const hasWriteProducts = scopes.includes('write_products');
    const hasReadProducts = scopes.includes('read_products');
    const hasReadOrders = scopes.includes('read_orders') || scopes.includes('read_all_orders');
    const hasWriteOrders = scopes.includes('write_orders');
    const hasReadReturns = scopes.includes('read_returns');
    const hasReadInventory = scopes.includes('read_inventory');

    return NextResponse.json({
      success: true,
      shop,
      scopes,
      permissions: {
        hasWriteProducts,
        hasReadProducts,
        hasReadOrders,
        hasWriteOrders,
        hasReadReturns,
        hasReadInventory,
        canSyncPricesToShopify: hasWriteProducts,
      },
      missingForPriceSync: hasWriteProducts ? [] : ['write_products'],
    });
  } catch (err: any) {
    console.error('[Shopify Scope Check Error]:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Failed to inspect Shopify scopes.',
    }, { status: 500 });
  }
}
