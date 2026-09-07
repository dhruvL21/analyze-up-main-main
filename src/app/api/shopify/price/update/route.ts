import { NextRequest, NextResponse } from 'next/server';
import { updateShopifyVariantPrice } from '@/lib/shopify-price-sync';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      shop,
      accessToken,
      productId,
      shopifyProductId,
      shopifyVariantId,
      sku,
      productName,
      newPrice,
      oldPrice,
      compareAtPrice,
    } = body;

    if (!shop || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Shop domain and access token are required to sync price.' },
        { status: 400 }
      );
    }

    if (newPrice === undefined || isNaN(Number(newPrice)) || Number(newPrice) < 0) {
      return NextResponse.json(
        { success: false, error: 'A valid non-negative newPrice is required.' },
        { status: 400 }
      );
    }

    const result = await updateShopifyVariantPrice({
      shop,
      accessToken,
      productId,
      shopifyProductId,
      shopifyVariantId,
      sku,
      productName,
      newPrice: Number(newPrice),
      oldPrice: oldPrice !== undefined ? Number(oldPrice) : undefined,
      compareAtPrice: compareAtPrice !== undefined ? Number(compareAtPrice) : undefined,
    });

    if (!result.success) {
      if (result.status === 403) {
        return NextResponse.json(
          {
            success: false,
            status: 403,
            error: result.error || 'Shopify permission denied (403). If you recently added "write_products" in Shopify Admin, click "Reinstall app" under API credentials to apply it to your token.',
            scopeMissing: 'write_products',
            reinstallRequired: true,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to update price on Shopify.',
          status: result.status || 400,
          scopeMissing: result.scopeMissing,
        },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Shopify Price Update Route Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error updating price in Shopify.' },
      { status: 500 }
    );
  }
}
