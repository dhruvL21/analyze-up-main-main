import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function verifyShopifyHmac(searchParams: URLSearchParams, secret: string): boolean {
  const hmac = searchParams.get('hmac');
  if (!hmac) return false;

  const params: [string, string][] = [];
  searchParams.forEach((val, key) => {
    if (key !== 'hmac' && key !== 'signature') {
      params.push([key, val]);
    }
  });

  // Sort lexicographically by key
  params.sort(([a], [b]) => a.localeCompare(b));
  const queryString = params.map(([key, val]) => `${key}=${val}`).join('&');

  const generatedHmac = crypto
    .createHmac('sha256', secret)
    .update(queryString)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(generatedHmac, 'utf-8'),
      Buffer.from(hmac, 'utf-8')
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') || (url.protocol.startsWith('https') ? 'https' : 'http');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const origin = `${proto}://${host}`;

  const { searchParams } = url;
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const stateRaw = searchParams.get('state');
  const errorParam = searchParams.get('error') || searchParams.get('error_description');

  if (errorParam) {
    console.warn('[Shopify OAuth] Provider error:', errorParam);
    return NextResponse.redirect(
      `${origin}/dashboard/integrations?error=${encodeURIComponent(`Shopify error: ${errorParam}`)}`
    );
  }

  if (!code || !shop) {
    return NextResponse.redirect(
      `${origin}/dashboard/integrations?error=${encodeURIComponent('Missing authorization code or shop domain from Shopify.')}`
    );
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${origin}/dashboard/integrations?error=${encodeURIComponent('Shopify client credentials missing in server configuration.')}`
    );
  }

  // 1. Verify HMAC security signature
  const isHmacValid = verifyShopifyHmac(searchParams, clientSecret);
  if (!isHmacValid) {
    console.error('[Shopify OAuth] HMAC validation failed for shop:', shop);
    return NextResponse.redirect(
      `${origin}/dashboard/integrations?error=${encodeURIComponent('Security check failed: Invalid HMAC signature from Shopify.')}`
    );
  }

  let userId = 'default_user';
  if (stateRaw) {
    try {
      const decodedState = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf-8'));
      if (decodedState.userId) userId = decodedState.userId;
    } catch {
      // fallback to stateRaw string
      userId = stateRaw;
    }
  }

  try {
    // 2. Exchange authorization code for permanent offline access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.json().catch(() => ({}));
      console.error('[Shopify OAuth] Token exchange error:', errorData);
      const errMsg = errorData.error_description || errorData.error || 'Token exchange failed';
      return NextResponse.redirect(
        `${origin}/dashboard/integrations?error=${encodeURIComponent(errMsg)}`
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const scope = tokenData.scope || '';

    // 3. Fetch Shopify store metadata
    let storeName = shop.replace('.myshopify.com', '');
    let currency = 'USD';
    let storeEmail = '';
    let shopId = '';

    try {
      const shopRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (shopRes.ok) {
        const shopPayload = await shopRes.json();
        if (shopPayload.shop) {
          storeName = shopPayload.shop.name || storeName;
          currency = shopPayload.shop.currency || currency;
          storeEmail = shopPayload.shop.email || '';
          shopId = String(shopPayload.shop.id || '');
        }
      }
    } catch (e) {
      console.warn('[Shopify OAuth] Could not fetch store profile metadata:', e);
    }

    // 4. Encode connection payload for dashboard integration
    const oauthPayload = {
      userId,
      provider: 'shopify',
      shopDomain: shop,
      storeName,
      storeEmail,
      shopId,
      currency,
      accessToken,
      scope,
      connectedAt: new Date().toISOString(),
    };

    const encoded = Buffer.from(JSON.stringify(oauthPayload)).toString('base64');
    return NextResponse.redirect(
      `${origin}/dashboard/integrations?shopify_oauth=${encodeURIComponent(encoded)}`
    );
  } catch (err: any) {
    console.error('[Shopify OAuth Callback Error]:', err);
    return NextResponse.redirect(
      `${origin}/dashboard/integrations?error=${encodeURIComponent(err?.message || 'Shopify connection failed')}`
    );
  }
}
