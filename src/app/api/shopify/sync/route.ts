import { NextRequest, NextResponse } from 'next/server';
import {
  convertShopifyToCanonicalProducts,
  convertShopifyToCanonicalTransactions,
  convertShopifyToCanonicalReturns,
  convertShopifyGraphQLReturnsToCanonical,
  mergeAndDeduplicateReturns,
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
        { method: 'GET', headers, signal: AbortSignal.timeout(15000) }
      );

      if (productsRes.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Shopify authentication failed (401). Invalid or revoked access token. Please re-connect your store in Settings.' },
          { status: 401 }
        );
      }
      if (productsRes.status === 429) {
        return NextResponse.json(
          { success: false, error: 'Shopify API rate limit reached (429). Please wait a moment before syncing again.' },
          { status: 429 }
        );
      }
      if (productsRes.ok) {
        const prodData = await productsRes.json();
        rawProducts = prodData.products || [];
      } else {
        const errText = await productsRes.text();
        console.warn(`[Shopify Sync] Could not fetch products (${productsRes.status}):`, errText);
        return NextResponse.json(
          { success: false, error: `Shopify API error (${productsRes.status}): Could not fetch products.` },
          { status: productsRes.status }
        );
      }
    } catch (prodErr: any) {
      console.warn('[Shopify Sync] Error fetching products:', prodErr);
      const isTimeout = prodErr?.name === 'TimeoutError' || prodErr?.name === 'AbortError';
      return NextResponse.json(
        { success: false, error: isTimeout ? 'Shopify API request timed out while fetching products.' : (prodErr?.message || 'Failed to fetch Shopify products.') },
        { status: 504 }
      );
    }

    // 2. Fetch Orders from Shopify Admin API
    let rawOrders: any[] = [];
    try {
      const ordersRes = await fetch(
        `https://${shop}/admin/api/2024-01/orders.json?status=any&limit=250`,
        { method: 'GET', headers, signal: AbortSignal.timeout(15000) }
      );

      if (ordersRes.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Shopify authentication failed (401). Invalid or revoked access token.' },
          { status: 401 }
        );
      }
      if (ordersRes.status === 429) {
        return NextResponse.json(
          { success: false, error: 'Shopify API rate limit reached (429). Please wait a moment before syncing again.' },
          { status: 429 }
        );
      }
      if (ordersRes.ok) {
        const orderData = await ordersRes.json();
        rawOrders = orderData.orders || [];
      } else {
        const errText = await ordersRes.text();
        console.warn(`[Shopify Sync] Could not fetch orders (${ordersRes.status}):`, errText);
        return NextResponse.json(
          { success: false, error: `Shopify API error (${ordersRes.status}): Could not fetch orders.` },
          { status: ordersRes.status }
        );
      }
    } catch (orderErr: any) {
      console.warn('[Shopify Sync] Error fetching orders:', orderErr);
      const isTimeout = orderErr?.name === 'TimeoutError' || orderErr?.name === 'AbortError';
      return NextResponse.json(
        { success: false, error: isTimeout ? 'Shopify API request timed out while fetching orders.' : (orderErr?.message || 'Failed to fetch Shopify orders.') },
        { status: 504 }
      );
    }

    // 3. Fetch Native Returns via Shopify GraphQL Admin API (utilizes read_returns scope)
    let rawGraphQLReturns: any[] = [];
    try {
      const gqlQuery = `
        query GetShopifyReturns {
          returns(first: 50, reverse: true) {
            nodes {
              id
              name
              status
              createdAt
              totalQuantity
              order {
                id
                name
                customer {
                  firstName
                  lastName
                }
              }
              returnLineItems(first: 50) {
                nodes {
                  id
                  quantity
                  returnReason
                  returnReasonNote
                  ... on ReturnLineItem {
                    fulfillmentLineItem {
                      id
                      lineItem {
                        id
                        title
                        sku
                        originalUnitPriceSet {
                          shopMoney {
                            amount
                          }
                        }
                        product {
                          id
                          title
                        }
                        variant {
                          id
                          title
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const gqlRes = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: gqlQuery }),
        signal: AbortSignal.timeout(15000),
      });

      if (gqlRes.ok) {
        const gqlData = await gqlRes.json();
        if (Array.isArray(gqlData?.data?.returns?.nodes)) {
          rawGraphQLReturns = gqlData.data.returns.nodes;
        } else if (Array.isArray(gqlData?.data?.returns?.edges)) {
          rawGraphQLReturns = gqlData.data.returns.edges.map((e: any) => e.node);
        }
      } else {
        console.warn(`[Shopify Sync] GraphQL returns query status: ${gqlRes.status}`);
      }
    } catch (gqlErr) {
      console.warn('[Shopify Sync] Optional GraphQL returns fetch failed (continuing with orders):', gqlErr);
    }

    // 4. Transform to Canonical Models
    const canonicalProducts = convertShopifyToCanonicalProducts(rawProducts);
    const canonicalTransactions = convertShopifyToCanonicalTransactions(rawOrders);
    const orderReturns = convertShopifyToCanonicalReturns(rawOrders);
    const graphQLReturns = convertShopifyGraphQLReturnsToCanonical(rawGraphQLReturns);
    const canonicalReturns = mergeAndDeduplicateReturns(orderReturns, graphQLReturns);

    return NextResponse.json({
      success: true,
      shop,
      products: canonicalProducts,
      transactions: canonicalTransactions,
      returns: canonicalReturns,
      stats: {
        rawProductsCount: rawProducts.length,
        canonicalProductsCount: canonicalProducts.length,
        rawOrdersCount: rawOrders.length,
        canonicalTransactionsCount: canonicalTransactions.length,
        rawReturnsCount: rawGraphQLReturns.length,
        canonicalReturnsCount: canonicalReturns.length,
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
