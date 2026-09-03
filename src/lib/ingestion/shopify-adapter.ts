/**
 * Ingestion: Shopify Data Adapter
 * Converts raw Shopify API responses (products, orders) into tabular rows for Model 1 mapping.
 */
import { ParsedTabularData } from './csv-parser';

export function parseShopifyProducts(shopifyProducts: any[]): ParsedTabularData {
  const rows: Record<string, any>[] = [];

  shopifyProducts.forEach((p) => {
    const title = p.title || p.name || 'Untitled Product';
    const category = p.product_type || p.category || 'General';
    const vendor = p.vendor || p.supplier || '';
    const description = p.body_html ? p.body_html.replace(/<[^>]*>?/gm, '') : (p.description || '');

    const variants = p.variants && p.variants.length > 0 ? p.variants : [{
      price: p.price || 0,
      sku: p.sku || `SHOPIFY-${p.id}`,
      inventory_quantity: p.inventory_quantity || 0,
    }];

    variants.forEach((v: any) => {
      rows.push({
        'Shopify Product ID': String(p.id || ''),
        'Item Title': variants.length > 1 ? `${title} - ${v.title || 'Variant'}` : title,
        'SKU Code': String(v.sku || `SKU-${p.id}`),
        'Product Category': category,
        'Selling Price': String(v.price || '0'),
        'Cost Price': String(v.cost || Math.round(Number(v.price || 0) * 0.6)),
        'Available Inventory': String(v.inventory_quantity !== undefined ? v.inventory_quantity : 0),
        'Vendor Name': vendor,
        'Description': description,
      });
    });
  });

  const headers = rows[0] ? Object.keys(rows[0]) : [];

  return {
    headers,
    rows,
    rowCount: rows.length,
    rawText: JSON.stringify(shopifyProducts, null, 2),
    delimiter: ',',
  };
}

export function parseShopifyOrders(shopifyOrders: any[]): ParsedTabularData {
  const rows: Record<string, any>[] = [];

  shopifyOrders.forEach((order) => {
    const orderNo = order.name || order.order_number || `ORD-${order.id}`;
    const orderDate = order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    const customer = order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Online Customer' : 'Retail Customer';
    const payment = order.gateway || (order.payment_gateway_names ? order.payment_gateway_names[0] : 'Online');

    const lineItems = order.line_items && order.line_items.length > 0 ? order.line_items : [{
      title: 'Order Item',
      quantity: 1,
      price: order.total_price || 0,
      sku: '',
    }];

    lineItems.forEach((item: any) => {
      rows.push({
        'Order Number': orderNo,
        'Transaction Date': orderDate,
        'Customer Name': customer,
        'Item Purchased': item.title || item.name || 'Item',
        'SKU': item.sku || '',
        'Quantity Sold': String(item.quantity || 1),
        'Unit Price': String(item.price || '0'),
        'Total Order Revenue': String(Number(item.price || 0) * Number(item.quantity || 1)),
        'Payment Gateway': payment,
      });
    });
  });

  const headers = rows[0] ? Object.keys(rows[0]) : [];

  return {
    headers,
    rows,
    rowCount: rows.length,
    rawText: JSON.stringify(shopifyOrders, null, 2),
    delimiter: ',',
  };
}

import type { Product, Transaction } from '@/lib/types';

/**
 * Converts Shopify raw products into AnalyzeUp canonical Product objects.
 */
export function convertShopifyToCanonicalProducts(shopifyProducts: any[]): Product[] {
  const products: Product[] = [];

  shopifyProducts.forEach((p) => {
    const title = p.title || p.name || 'Untitled Product';
    const category = p.product_type || p.category || 'General';
    const vendor = p.vendor || p.supplier || 'Shopify Vendor';

    const variants =
      p.variants && p.variants.length > 0
        ? p.variants
        : [
            {
              id: p.id,
              price: p.price || 0,
              sku: p.sku || `SKU-${p.id}`,
              inventory_quantity: p.inventory_quantity || 0,
            },
          ];

    variants.forEach((v: any) => {
      const price = Number(v.price) || 0;
      const costPrice = Number(v.cost) || Math.round(price * 0.6);
      const stock = Math.max(0, Number(v.inventory_quantity !== undefined ? v.inventory_quantity : 0));
      const sku = String(v.sku || (v.barcode ? v.barcode : `SKU-${p.id}-${v.id || '0'}`));
      const name = variants.length > 1 && v.title ? `${title} (${v.title})` : title;

      products.push({
        id: `shopify_${p.id}_${v.id || 'default'}`,
        name,
        sku,
        category,
        price,
        costPrice,
        stock,
        reorderPoint: Math.max(5, Math.round(stock * 0.2)),
        supplier: vendor,
        source: 'SHOPIFY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  });

  return products;
}

/**
 * Converts Shopify raw orders into AnalyzeUp canonical Transaction objects.
 */
export function convertShopifyToCanonicalTransactions(shopifyOrders: any[]): Transaction[] {
  const transactions: Transaction[] = [];

  shopifyOrders.forEach((order) => {
    const orderId = String(order.name || order.order_number || `ORD-${order.id}`);
    const dateStr = order.created_at
      ? order.created_at.split('T')[0]
      : new Date().toISOString().split('T')[0];

    const customer = order.customer
      ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Online Customer'
      : 'Retail Customer';

    const paymentMethod =
      order.gateway ||
      (order.payment_gateway_names && order.payment_gateway_names.length > 0
        ? order.payment_gateway_names[0]
        : 'Shopify Payments');

    const lineItems =
      order.line_items && order.line_items.length > 0
        ? order.line_items
        : [
            {
              id: order.id,
              title: 'Order Item',
              quantity: 1,
              price: order.total_price || 0,
              sku: '',
            },
          ];

    lineItems.forEach((item: any, idx: number) => {
      const qty = Math.max(1, Number(item.quantity || 1));
      const unitPrice = Number(item.price || 0);
      const totalRevenue = unitPrice * qty;
      const costPerUnit = Math.round(unitPrice * 0.6);
      const totalCost = costPerUnit * qty;

      transactions.push({
        id: `tx_shopify_${order.id}_${item.id || idx}`,
        productId: String(item.product_id || item.id || `shopify_prod_${idx}`),
        orderNumber: orderId,
        transactionDate: dateStr,
        productName: item.title || item.name || 'Order Item',
        sku: item.sku || '',
        type: 'Sale',
        quantity: qty,
        price: unitPrice,
        unitPrice,
        totalRevenue,
        costPrice: costPerUnit,
        costPerUnit,
        totalCost,
        customerName: customer,
        paymentMethod,
        source: 'SHOPIFY',
        createdAt: dateStr,
        updatedAt: dateStr,
      });
    });
  });

  return transactions;
}
