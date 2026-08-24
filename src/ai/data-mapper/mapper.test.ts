import { describe, it, expect } from 'vitest';
import { executeUniversalDataMapping } from './mapper-ai';
import { normalizeToProducts, normalizeToSales } from '@/lib/ingestion/data-validator';

describe('Model 1: Universal Data Mapper & Normalization', () => {
  it('maps standard inventory CSV headers to canonical product schema', async () => {
    const headers = ['Item Name', 'Available Stock', 'Selling Price (₹)', 'Item Code', 'Product Category'];
    const sampleRows = [
      { 'Item Name': 'USB Cable', 'Available Stock': '100', 'Selling Price (₹)': '299', 'Item Code': 'USB-001', 'Product Category': 'Electronics' },
    ];

    const result = await executeUniversalDataMapping(headers, sampleRows);
    expect(result.normalizedSchema).toBe('analyzeup_v1');
    expect(result.detectedFileType).toBe('INVENTORY_MASTER');
    expect(result.mapping['Item Name']).toBe('name');
    expect(result.mapping['Available Stock']).toBe('stock');
    expect(result.mapping['Selling Price (₹)']).toBe('price');
    expect(result.fieldConfidence['Item Name']).toBeGreaterThanOrEqual(80);
  });

  it('detects sales report file types correctly', async () => {
    const headers = ['Invoice Number', 'Product Sold', 'Quantity Sold', 'Revenue', 'Customer Name', 'Order Date'];
    const sampleRows = [
      { 'Invoice Number': 'INV-101', 'Product Sold': 'Gaming Mouse', 'Quantity Sold': '2', 'Revenue': '2400', 'Customer Name': 'Amit Sharma', 'Order Date': '2026-08-10' },
    ];

    const result = await executeUniversalDataMapping(headers, sampleRows);
    expect(result.detectedFileType).toBe('SALES_REPORT');
    expect(result.mapping['Product Sold']).toBe('product_name');
    expect(result.mapping['Quantity Sold']).toBe('units_sold');
  });

  it('deterministically normalizes raw rows into validated canonical products', () => {
    const rawRows = [
      { 'Item Title': 'Ergonomic Keyboard', 'Stock': '25', 'Price': '₹1,999.00', 'SKU': 'KB-01' },
      { 'Item Title': 'Mouse Pad', 'Stock': '150', 'Price': '₹299', 'SKU': 'MP-01' },
      { 'Item Title': '', 'Stock': '10', 'Price': '100', 'SKU': 'INVALID' }, // Missing name
    ];

    const mapping = {
      'Item Title': 'name',
      'Stock': 'stock',
      'Price': 'price',
      'SKU': 'sku',
    };

    const output = normalizeToProducts(rawRows, mapping);
    expect(output.success).toBe(true);
    expect(output.validRecords.length).toBe(2);
    expect(output.validRecords[0].product_name).toBe('Ergonomic Keyboard');
    expect(output.validRecords[0].price).toBe(1999);
    expect(output.validRecords[0].inventory_quantity).toBe(25);
    expect(output.errorRecords.length).toBe(1);
  });

  it('deterministically normalizes sales rows into canonical sales', () => {
    const rawRows = [
      { 'Item': 'Coffee Mug', 'Qty': '3', 'Rate': '₹350', 'Total': '₹1050', 'Date': '15/08/2026' },
    ];

    const mapping = {
      'Item': 'product_name',
      'Qty': 'units_sold',
      'Rate': 'selling_price',
      'Total': 'revenue',
      'Date': 'sale_date',
    };

    const output = normalizeToSales(rawRows, mapping);
    expect(output.success).toBe(true);
    expect(output.validRecords.length).toBe(1);
    expect(output.validRecords[0].product_name).toBe('Coffee Mug');
    expect(output.validRecords[0].units_sold).toBe(3);
    expect(output.validRecords[0].selling_price).toBe(350);
    expect(output.validRecords[0].revenue).toBe(1050);
    expect(output.validRecords[0].sale_date).toBe('2026-08-15');
  });
});
