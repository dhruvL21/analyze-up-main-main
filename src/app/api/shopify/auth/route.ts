import { NextRequest, NextResponse } from 'next/server';

function getOAuthRedirectUri(req: NextRequest): string {
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') || (url.protocol.startsWith('https') ? 'https' : 'http');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const currentOrigin = `${proto}://${host}`;

  if (process.env.SHOPIFY_REDIRECT_URI) {
    try {
      const configured = new URL(process.env.SHOPIFY_REDIRECT_URI);
      if (configured.host === host) {
        return process.env.SHOPIFY_REDIRECT_URI;
      }
    } catch (e) {}
  }

  return `${currentOrigin}/api/shopify/callback`;
}

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawShop = searchParams.get('shop');
  const userId = searchParams.get('userId') || 'default_user';

  if (!rawShop) {
    return NextResponse.json(
      { error: 'Missing shop parameter. Please provide your Shopify store URL (e.g. your-store.myshopify.com).' },
      { status: 400 }
    );
  }

  const shop = sanitizeShopDomain(rawShop);
  if (!shop) {
    return NextResponse.json(
      { error: 'Invalid Shopify store domain format. Expected: your-store.myshopify.com' },
      { status: 400 }
    );
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Shopify OAuth configuration (SHOPIFY_CLIENT_ID) is missing on the server.' },
      { status: 500 }
    );
  }

  const redirectUri = getOAuthRedirectUri(req);
  const scopes = process.env.SHOPIFY_SCOPES || 'read_all_orders,read_customers,read_inventory,read_products,write_products,read_orders,write_orders,read_returns';

  // State encodes userId and shop
  const statePayload = {
    userId,
    shop,
    nonce: Math.random().toString(36).substring(2, 15),
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');

  const authUrl =
    `https://${shop}/admin/oauth/authorize?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(authUrl);
}
