import { describe, it, expect } from 'vitest';
import { calculateDynamicBrief } from './ai-brief-generator';
import type { Product, Transaction } from '@/lib/types';

function createTestProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Test Product',
    price: 500,
    costPrice: 300,
    stock: 50,
    minStock: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('AI Brief Generator (Deterministic Analysis)', () => {
  it('should return safe zero-state values when product array is empty', async () => {
    const result = await calculateDynamicBrief([], []);
    expect(result.healthScore).toBe(0);
    expect(result.stockoutItem.name).toBe('No Data Connected');
    expect(result.slowMovingItem.name).toBe('No Data Connected');
    expect(result.savingsText).toContain('₹0');
  });

  it('should calculate health score correctly for 100% healthy inventory', async () => {
    const products: Product[] = [
      createTestProduct({ id: '1', name: 'Widget A', stock: 100, minStock: 10, price: 500, costPrice: 300, averageDailySales: 2 }),
      createTestProduct({ id: '2', name: 'Widget B', stock: 80, minStock: 10, price: 400, costPrice: 250, averageDailySales: 1 }),
    ];
    const transactions: Transaction[] = [];

    const result = await calculateDynamicBrief(products, transactions);
    expect(result.healthScore).toBe(100);
    expect(result.savingsText).toContain('Cash Locked in Inventory: ₹');
  });

  it('should deduct health score points for stockouts and low stock items', async () => {
    const products: Product[] = [
      createTestProduct({ id: '1', name: 'Stockout Item', stock: 0, minStock: 10, price: 500, costPrice: 300, averageDailySales: 2 }),
      createTestProduct({ id: '2', name: 'Low Stock Item', stock: 3, minStock: 10, price: 400, costPrice: 200, averageDailySales: 1 }),
      createTestProduct({ id: '3', name: 'Healthy Item', stock: 50, minStock: 5, price: 100, costPrice: 50, averageDailySales: 1 }),
    ];
    const transactions: Transaction[] = [];

    const result = await calculateDynamicBrief(products, transactions);
    expect(result.healthScore).toBeLessThan(100);
    expect(result.stockoutItem.name).toBe('Stockout Item');
  });

  it('should identify the item with highest capital blocked as the slow-moving item', async () => {
    const products: Product[] = [
      createTestProduct({ id: '1', name: 'Cheap Widget', stock: 10, price: 50, costPrice: 25, averageDailySales: 1 }),
      createTestProduct({ id: '2', name: 'Expensive Heavy Asset', stock: 50, price: 10000, costPrice: 6000, averageDailySales: 0.1 }),
    ];
    const transactions: Transaction[] = [];

    const result = await calculateDynamicBrief(products, transactions);
    expect(result.slowMovingItem.name).toBe('Expensive Heavy Asset');
    expect(result.slowMovingItem.costText).toContain('3,00,000');
  });
});
