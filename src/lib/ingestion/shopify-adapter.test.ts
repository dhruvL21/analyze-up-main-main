import { describe, it, expect } from 'vitest';
import {
  parseShopifyProducts,
  parseShopifyOrders,
  convertShopifyToCanonicalProducts,
  convertShopifyToCanonicalTransactions,
} from './shopify-adapter';

describe('Shopify Adapter & Ingestion Engine', () => {
  const mockShopifyProducts = [
    {
      id: 8001,
      title: 'Premium Wireless Headphones',
      product_type: 'Electronics',
      vendor: 'SoundCore Audio',
      body_html: '<p>High-end active noise cancellation headphones.</p>',
      variants: [
        {
          id: 9001,
          title: 'Matte Black',
          price: '4999.00',
          cost: '2499.00',
          sku: 'SKU-HEAD-BLK',
          inventory_quantity: 45,
        },
        {
          id: 9002,
          title: 'Silver Edition',
          price: '5499.00',
          sku: 'SKU-HEAD-SLV',
          inventory_quantity: 12,
        },
      ],
    },
    {
      id: 8002,
      title: 'Ergonomic Mousepad',
      product_type: 'Accessories',
      vendor: 'DeskPro',
      variants: [
        {
          id: 9003,
          price: '699.00',
          sku: 'SKU-PAD-01',
          inventory_quantity: 80,
        },
      ],
    },
  ];

  const mockShopifyOrders = [
    {
      id: 7001,
      name: '#1001',
      order_number: 1001,
      created_at: '2026-08-25T14:30:00Z',
      gateway: 'Shopify Payments',
      customer: {
        first_name: 'Aditi',
        last_name: 'Verma',
        email: 'aditi@example.com',
      },
      line_items: [
        {
          id: 6001,
          title: 'Premium Wireless Headphones - Matte Black',
          sku: 'SKU-HEAD-BLK',
          price: '4999.00',
          quantity: 2,
        },
        {
          id: 6002,
          title: 'Ergonomic Mousepad',
          sku: 'SKU-PAD-01',
          price: '699.00',
          quantity: 1,
        },
      ],
    },
  ];

  it('parses raw products into tabular rows for mapping wizard', () => {
    const parsed = parseShopifyProducts(mockShopifyProducts);
    expect(parsed.rowCount).toBe(3); // 2 variants for headphones + 1 variant for mousepad
    expect(parsed.headers).toContain('Shopify Product ID');
    expect(parsed.headers).toContain('Item Title');
    expect(parsed.headers).toContain('SKU Code');
    expect(parsed.rows[0]['SKU Code']).toBe('SKU-HEAD-BLK');
    expect(parsed.rows[1]['SKU Code']).toBe('SKU-HEAD-SLV');
  });

  it('parses raw orders into tabular rows', () => {
    const parsed = parseShopifyOrders(mockShopifyOrders);
    expect(parsed.rowCount).toBe(2); // 2 line items
    expect(parsed.rows[0]['Order Number']).toBe('#1001');
    expect(parsed.rows[0]['Customer Name']).toBe('Aditi Verma');
    expect(parsed.rows[0]['Quantity Sold']).toBe('2');
    expect(parsed.rows[0]['Total Order Revenue']).toBe('9998');
  });

  it('converts raw Shopify products into canonical Product objects', () => {
    const canonical = convertShopifyToCanonicalProducts(mockShopifyProducts);
    expect(canonical.length).toBe(3);

    const item1 = canonical[0];
    expect(item1.id).toBe('shopify_8001_9001');
    expect(item1.name).toContain('Matte Black');
    expect(item1.sku).toBe('SKU-HEAD-BLK');
    expect(item1.price).toBe(4999);
    expect(item1.costPrice).toBe(2499);
    expect(item1.stock).toBe(45);
    expect(item1.supplier).toBe('SoundCore Audio');
    expect(item1.source).toBe('SHOPIFY');

    // Default cost estimation when variant cost is absent
    const item2 = canonical[1];
    expect(item2.costPrice).toBe(Math.round(5499 * 0.6));
  });

  it('converts raw Shopify orders into canonical Transaction objects', () => {
    const canonical = convertShopifyToCanonicalTransactions(mockShopifyOrders);
    expect(canonical.length).toBe(2);

    const tx1 = canonical[0];
    expect(tx1.orderNumber).toBe('#1001');
    expect(tx1.transactionDate).toBe('2026-08-25');
    expect(tx1.customerName).toBe('Aditi Verma');
    expect(tx1.sku).toBe('SKU-HEAD-BLK');
    expect(tx1.type).toBe('Sale');
    expect(tx1.quantity).toBe(2);
    expect(tx1.price).toBe(4999);
    expect(tx1.totalRevenue).toBe(9998);
    expect(tx1.paymentMethod).toBe('Shopify Payments');
  });
});
