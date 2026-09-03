import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const topic = req.headers.get('x-shopify-topic');
    const shop = req.headers.get('x-shopify-shop-domain');
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');

    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (clientSecret && hmacHeader) {
      const isValid = verifyWebhookHmac(rawBody, hmacHeader, clientSecret);
      if (!isValid) {
        console.warn(`[Shopify Webhook] Invalid HMAC signature for shop: ${shop}, topic: ${topic}`);
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = {};
    }

    console.log(`[Shopify Webhook Received] Topic: ${topic} from Shop: ${shop}`);

    // Process different topics if needed:
    // - orders/create or orders/updated
    // - products/create or products/update
    // - inventory_levels/connect or inventory_levels/update

    return NextResponse.json({
      received: true,
      topic,
      shop,
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
