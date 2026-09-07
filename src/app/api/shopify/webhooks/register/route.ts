import { NextRequest, NextResponse } from 'next/server';

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
    const body = await req.json();
    const { shop: rawShop, accessToken, webhookHost } = body;

    if (!rawShop || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Shop and accessToken are required.' },
        { status: 400 }
      );
    }

    const shop = sanitizeShopDomain(rawShop);
    const origin = webhookHost || req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://analyzeup.app';
    const webhookAddress = `${origin}/api/shopify/webhooks`;

    const topics = [
      'orders/create',
      'orders/updated',
      'orders/paid',
      'refunds/create',
      'products/create',
      'products/update',
    ];

    const results: Record<string, string> = {};

    for (const topic of topics) {
      try {
        const res = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: webhookAddress,
              format: 'json',
            },
          }),
        });

        if (res.status === 201) {
          results[topic] = 'created';
        } else if (res.status === 422) {
          // Already registered
          results[topic] = 'already_exists';
        } else {
          const errText = await res.text();
          results[topic] = `status_${res.status}: ${errText.slice(0, 100)}`;
        }
      } catch (err: any) {
        results[topic] = `error: ${err.message}`;
      }
    }

    return NextResponse.json({
      success: true,
      shop,
      webhookAddress,
      results,
    });
  } catch (error: any) {
    console.error('[Shopify Register Webhooks Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to register webhooks.' },
      { status: 500 }
    );
  }
}
