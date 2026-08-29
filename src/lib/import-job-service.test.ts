import { describe, it, expect } from 'vitest';
import {
  generateDeterministicId,
  generateProductDocId,
  generateTransactionDocId,
} from './import-job-service';
import { normalizeToProducts, normalizeToSales } from './ingestion/data-validator';
import { DEFAULT_ANALYTICS_SUMMARY } from './analytics-aggregator';

describe('Import Scalability & Idempotency Architecture', () => {
  it('generates consistent deterministic document IDs for identical SKUs/names (Idempotency)', () => {
    const id1 = generateProductDocId('SKU-WIRELESS-MOUSE', 'Ergonomic Mouse');
    const id2 = generateProductDocId('SKU-WIRELESS-MOUSE', 'Ergonomic Mouse');
    const id3 = generateProductDocId('sku-wireless-mouse', 'Ergonomic Mouse');

    expect(id1).toBe(id2);
    expect(id1).toBe(id3);
    expect(id1).toBe('prod_sku-wireless-mouse');
  });

  it('generates consistent deterministic transaction IDs', () => {
    const tx1 = generateTransactionDocId('INV-2026-001', 'SKU-COFFEE-1K', '2026-08-30', 1);
    const tx2 = generateTransactionDocId('INV-2026-001', 'SKU-COFFEE-1K', '2026-08-30', 1);

    expect(tx1).toBe(tx2);
    expect(tx1).toBe('tx_inv-2026-001_sku-coffee-1k');
  });

  it('handles 2,000 records in chunked batches of 100 with 100% data integrity', () => {
    // Generate 2,000 synthetic product rows
    const mock2kRows = Array.from({ length: 2000 }, (_, i) => ({
      'Item Name': `Product ${i + 1}`,
      'Item SKU': `SKU-PROD-${1000 + i}`,
      'Stock Qty': (i % 50) + 1,
      'Selling Price': 499 + (i % 100),
      'Cost Price': 299 + (i % 50),
      'Supplier': `Supplier ${(i % 10) + 1}`,
      'Category': `Category ${(i % 5) + 1}`,
    }));

    const fieldMapping = {
      'Item Name': 'name',
      'Item SKU': 'sku',
      'Stock Qty': 'stock',
      'Selling Price': 'price',
      'Cost Price': 'costPrice',
      'Supplier': 'supplier_name',
      'Category': 'category',
    };

    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(mock2kRows.length / BATCH_SIZE);
    expect(totalBatches).toBe(20);

    let totalValid = 0;
    let totalErrors = 0;
    const uniqueIds = new Set<string>();

    for (let b = 0; b < totalBatches; b++) {
      const slice = mock2kRows.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      const res = normalizeToProducts(slice, fieldMapping);

      totalValid += res.validRecords.length;
      totalErrors += res.errorRecords.length;

      res.validRecords.forEach(p => {
        const docId = generateProductDocId(p.sku, p.product_name);
        uniqueIds.add(docId);
      });
    }

    expect(totalValid).toBe(2000);
    expect(totalErrors).toBe(0);
    expect(uniqueIds.size).toBe(2000);
  });

  it('isolates invalid rows without failing the batch (Failure Isolation)', () => {
    const mixedRows = [
      { 'Item Name': 'Valid Product 1', 'Selling Price': '500', 'Item SKU': 'SKU-001' },
      { 'Item Name': '', 'Selling Price': '500', 'Item SKU': 'SKU-BAD-1' }, // Missing name
      { 'Item Name': 'Valid Product 2', 'Selling Price': '750', 'Item SKU': 'SKU-002' },
      { 'Item Name': '', 'Selling Price': '1000', 'Item SKU': 'SKU-BAD-2' }, // Missing name
      { 'Item Name': 'Valid Product 3', 'Selling Price': '1200', 'Item SKU': 'SKU-003' },
    ];

    const fieldMapping = {
      'Item Name': 'name',
      'Selling Price': 'price',
      'Item SKU': 'sku',
    };

    const res = normalizeToProducts(mixedRows, fieldMapping);

    expect(res.validRecords.length).toBe(3);
    expect(res.errorRecords.length).toBe(2);
    expect(res.errorRecords[0].rowNumber).toBe(2);
    expect(res.errorRecords[1].rowNumber).toBe(4);
    expect(res.validRecords.map(p => p.product_name)).toEqual([
      'Valid Product 1',
      'Valid Product 2',
      'Valid Product 3',
    ]);
  });

  it('demonstrates zero data duplication when a batch is retried (Idempotent Retry)', () => {
    const batch = [
      { 'Product': 'Air Purifier', 'SKU': 'AP-01', 'Price': '8999' },
      { 'Product': 'HEPA Filter', 'SKU': 'HF-02', 'Price': '1499' },
    ];

    const mapping = { 'Product': 'name', 'SKU': 'sku', 'Price': 'price' };

    // Run 1st attempt
    const res1 = normalizeToProducts(batch, mapping);
    const idsAttempt1 = res1.validRecords.map(p => generateProductDocId(p.sku, p.product_name));

    // Run 2nd attempt (simulating worker retry)
    const res2 = normalizeToProducts(batch, mapping);
    const idsAttempt2 = res2.validRecords.map(p => generateProductDocId(p.sku, p.product_name));

    expect(idsAttempt1).toEqual(idsAttempt2);
    expect(idsAttempt1).toEqual(['prod_ap-01', 'prod_hf-02']);
  });

  it('verifies default analytics summary schema integrity', () => {
    expect(DEFAULT_ANALYTICS_SUMMARY.healthScore).toBe(100);
    expect(DEFAULT_ANALYTICS_SUMMARY.totalProducts).toBe(0);
    expect(DEFAULT_ANALYTICS_SUMMARY.totalRevenue).toBe(0);
    expect(DEFAULT_ANALYTICS_SUMMARY.inventoryValuation).toBe(0);
  });
});
