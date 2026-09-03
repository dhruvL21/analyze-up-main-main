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

    if (!rawShop || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Shop domain and access token are required.' },
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

    const shopRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken.trim(),
        'Content-Type': 'application/json',
      },
    });

    if (!shopRes.ok) {
      if (shopRes.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication failed (401). Invalid or revoked Shopify API Access Token.',
          },
          { status: 401 }
        );
      }
      const errBody = await shopRes.text();
      return NextResponse.json(
        {
          success: false,
          error: `Shopify API returned error (${shopRes.status}): ${errBody || 'Could not reach store.'}`,
        },
        { status: shopRes.status }
      );
    }

    const data = await shopRes.json();
    const shopData = data.shop;

    return NextResponse.json({
      success: true,
      shop: {
        id: String(shopData.id || ''),
        name: shopData.name || shop.replace('.myshopify.com', ''),
        email: shopData.email || '',
        domain: shop,
        currency: shopData.currency || 'USD',
        country: shopData.country_name || '',
      },
    });
  } catch (error: any) {
    console.error('[Shopify Verify Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to verify Shopify connection.' },
      { status: 500 }
    );
  }
}
