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
