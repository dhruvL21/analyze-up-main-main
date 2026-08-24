import { describe, it, expect } from 'vitest';
import { FILE_TYPE_DEFINITIONS } from './import-mapper-constants';

describe('Import Engine Constants & Definitions', () => {
  it('should define valid internal schemas for all supported file types', () => {
    expect(FILE_TYPE_DEFINITIONS.INVENTORY_MASTER).toBeDefined();
    expect(FILE_TYPE_DEFINITIONS.SALES_REPORT).toBeDefined();
    expect(FILE_TYPE_DEFINITIONS.PURCHASE_ORDERS).toBeDefined();
    expect(FILE_TYPE_DEFINITIONS.SUPPLIER_LIST).toBeDefined();
    expect(FILE_TYPE_DEFINITIONS.CUSTOMER_LIST).toBeDefined();
    expect(FILE_TYPE_DEFINITIONS.RETURNS_REPORT).toBeDefined();
  });

  it('should contain mandatory fields in inventory master definition', () => {
    const invFields = FILE_TYPE_DEFINITIONS.INVENTORY_MASTER.fields;
    const fieldKeys = invFields.map(f => f.key);
    expect(fieldKeys).toContain('name');
    expect(fieldKeys).toContain('price');
    expect(fieldKeys).toContain('stock');
    expect(fieldKeys).toContain('costPrice');
  });

  it('should contain mandatory fields in sales report definition', () => {
    const salesFields = FILE_TYPE_DEFINITIONS.SALES_REPORT.fields;
    const fieldKeys = salesFields.map(f => f.key);
    expect(fieldKeys).toContain('productName');
    expect(fieldKeys).toContain('quantity');
    expect(fieldKeys).toContain('sellingPrice');
  });
});
