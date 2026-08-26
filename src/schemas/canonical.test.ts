import { describe, it, expect } from 'vitest';
import {
  CanonicalProductSchema,
  CanonicalSaleSchema,
  CanonicalSupplierSchema,
  CanonicalPurchaseOrderSchema,
} from './canonical';

describe('Canonical Schemas (analyzeup_v1)', () => {
  it('validates canonical product schema with defaults', () => {
    const validProduct = CanonicalProductSchema.parse({
      product_name: 'Wireless Mouse',
      price: 999,
      inventory_quantity: 45,
    });

    expect(validProduct.product_name).toBe('Wireless Mouse');
    expect(validProduct.category).toBe('General');
    expect(validProduct.min_stock).toBe(5);
    expect(validProduct.cost_price).toBe(0);
  });

  it('rejects product without a name', () => {
    expect(() => {
      CanonicalProductSchema.parse({
        price: 500,
      });
    }).toThrow();
  });

  it('validates canonical sale schema', () => {
    const validSale = CanonicalSaleSchema.parse({
      product_name: 'Office Chair',
      units_sold: 2,
      selling_price: 4500,
      revenue: 9000,
    });

    expect(validSale.units_sold).toBe(2);
    expect(validSale.customer_name).toBe('Retail Customer');
    expect(validSale.status).toBe('Completed');
  });

  it('validates canonical supplier and purchase order schemas', () => {
    const supplier = CanonicalSupplierSchema.parse({
      supplier_name: 'Tech Distributor India',
    });
    expect(supplier.lead_time_days).toBe(7);
    expect(supplier.performance_score).toBe(85);

    const po = CanonicalPurchaseOrderSchema.parse({
      supplier_id: 'sup-1',
      product_id: 'prod-1',
      quantity: 50,
      unit_cost: 200,
    });
    expect(po.status).toBe('Pending');
  });
});
