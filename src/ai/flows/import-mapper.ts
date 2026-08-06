'use server';

import { openai } from '@/ai/openai';

export type FieldMapping = Record<string, string>;

const PRODUCT_FIELDS_LIST = [
  // Products
  'name', 'sku', 'product_id', 'description', 'category_id', 'category', 'brand_id', 'selling_price', 'price', 'cost_price', 'costPrice', 'weight', 'status',
  // Users
  'user_id', 'user_name', 'email', 'phone', 'password_hash', 'role', 'user_status', 'user_created_at',
  // Customers
  'customer_id', 'gender', 'DOB', 'loyalty_points', 'lifetime_value',
  // Addresses
  'address_id', 'address_line1', 'city', 'state', 'country', 'pincode', 'address_type',
  // Categories & Brands
  'category_name', 'parent_category_id', 'brand_name', 'brand_description',
  // Product Variants
  'variant_id', 'color', 'size', 'material', 'variant_sku', 'variant_price',
  // Inventory
  'inventory_id', 'stock_quantity', 'stock', 'reserved_stock', 'reorder_level', 'current_stock', 'reorder_point',
  // Warehouses
  'warehouse_id', 'warehouse_name', 'location', 'manager', 'capacity',
  // Suppliers
  'supplier_id', 'company_name', 'contact_person', 'supplier_email', 'supplier_phone', 'supplier_name', 'lead_time', 'rating',
  // Purchase Orders & Items
  'po_id', 'order_date', 'expected_delivery', 'expected_date', 'po_status', 'po_item_id', 'po_item_quantity', 'unit_cost',
  // Orders & Items
  'order_id', 'total_amount', 'payment_status', 'order_status', 'order_item_id', 'order_item_quantity', 'unit_price', 'discount',
  // Payments
  'payment_id', 'payment_method', 'amount', 'transaction_id', 'payment_status_details',
  // Refunds
  'refund_id', 'refund_amount', 'refund_reason', 'refund_status',
  // Shipments
  'shipment_id', 'courier_name', 'tracking_number', 'shipped_date', 'delivered_date',
  // Returns
  'return_id', 'return_reason', 'return_status',
  // Coupons
  'coupon_id', 'coupon_code', 'discount_type', 'discount_value', 'expiry_date',
  // Reviews
  'review_id', 'review_rating', 'review_comment', 'review_created_at',
  // Wishlist
  'wishlist_id', 'wishlist_added_at',
  // Cart
  'cart_id', 'cart_created_at', 'cart_item_id', 'cart_item_quantity',
  // Employees & Vendors
  'employee_id', 'employee_name', 'department', 'employee_role', 'salary', 'vendor_id', 'vendor_name', 'service_type', 'contact_details',
  // Campaigns & Support
  'campaign_id', 'campaign_name', 'budget', 'start_date', 'end_date', 'ticket_id', 'issue_type', 'ticket_status', 'assigned_to',
  // Notifications & Audit Logs
  'notification_id', 'notification_title', 'notification_message', 'read_status', 'log_id', 'log_action', 'log_timestamp', 'IP_address',
  // Stock Movements & Forecasts & Alerts
  'quantity_change', 'movement_type', 'timestamp', 'predicted_sales', 'confidence_score', 'alert_type', 'severity', 'recommendation',
  // Business Metrics
  'revenue', 'profit', 'inventory_turnover', 'stockout_rate'
];

const TRANSACTION_FIELDS_LIST: string[] = [];

export async function getSmartMapping(
  externalHeaders: string[],
  importType: 'products' | 'sales' = 'products'
): Promise<FieldMapping> {
  const targetFields = importType === 'products' ? PRODUCT_FIELDS_LIST : TRANSACTION_FIELDS_LIST;
  
  const prompt = `
You are an AI data assistant. Your task is to map columns from an external "brand" database to our "AnalyzeUp" ${importType === 'products' ? 'Inventory' : 'Transaction'} schema.

AVAILABLE TARGET FIELDS:
${targetFields.join(', ')}

EXTERNAL COLUMNS:
${externalHeaders.join(', ')}

INSTRUCTIONS:
1. Map each external column to the MOST RELEVANT target field.
2. If a column has no clear match, map it to "skip".
3. Return ONLY a JSON object where keys are the external columns and values are the target fields.

Example:
{
  "Product_Name": "name",
  "Qty_Available": "stock",
  "Selling_Price": "price",
  "Unknown_Col": "skip"
}

Respond ONLY with the JSON object.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful data migration assistant.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty AI response');

    const rawMapping = JSON.parse(content);
    
    // Ensure all headers are present in the mapping
    const mapping: FieldMapping = {};
    externalHeaders.forEach(header => {
      const match = rawMapping[header];
      if (match && (targetFields.includes(match) || match === 'skip')) {
        mapping[header] = match;
      } else {
        mapping[header] = 'skip';
      }
    });

    return mapping;
  } catch (error) {
    console.error('Error in getSmartMapping:', error);
    // Fallback to basic mapping if AI fails
    const fallback: FieldMapping = {};
    const normalizedTarget = targetFields.map(f => f.toLowerCase());
    
    externalHeaders.forEach(header => {
      const hLower = header.toLowerCase();
      const matchIdx = normalizedTarget.findIndex(t => hLower.includes(t) || t.includes(hLower));
      fallback[header] = matchIdx !== -1 ? targetFields[matchIdx] : 'skip';
    });
    return fallback;
  }
}
