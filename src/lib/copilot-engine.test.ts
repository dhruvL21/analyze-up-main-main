import { describe, it, expect } from 'vitest';
import { processCopilotQuery } from './copilot-engine';
import { BusinessProfile } from './types';

describe('Copilot Engine Query Processing', () => {
  const sampleProducts = [
    { id: '1', name: 'MacBook Pro Case', stock: 5, minStock: 20, price: 2000, costPrice: 1200, category: 'Accessories' },
    { id: '2', name: 'USB-C Cable', stock: 150, minStock: 30, price: 500, costPrice: 200, category: 'Cables' },
  ];

  const sampleTransactions = [
    { id: 'tx-1', type: 'Sale', productName: 'MacBook Pro Case', total: 4000, quantity: 2, date: new Date().toISOString() },
  ];

  const sampleProfile: BusinessProfile = {
    businessName: 'TechStore',
    currency: 'INR (₹)',
    businessType: 'Retail',
    businessSize: '2-10 Employees',
  };

  it('should identify inventory/reorder intent for reorder queries', () => {
    const res = processCopilotQuery(
      'Which products should I reorder?',
      [],
      sampleProducts as any,
      sampleTransactions as any,
      [],
      [],
      [],
      sampleProfile
    );

    expect(res).toBeDefined();
    expect(res.intent).toBe('INVENTORY_ANALYSIS');
    expect(res.answerMarkdown).toBeTruthy();
    expect(res.supportingData.length).toBeGreaterThan(0);
  });

  it('should identify revenue analysis intent for sales/revenue queries', () => {
    const res = processCopilotQuery(
      'What is my total sales and revenue?',
      [],
      sampleProducts as any,
      sampleTransactions as any,
      [],
      [],
      [],
      sampleProfile
    );

    expect(res).toBeDefined();
    expect(res.intent).toBe('REVENUE_ANALYSIS');
    expect(res.what).toContain('Revenue');
  });

  it('should provide fallback answer for unknown/unmatched queries gracefully', () => {
    const res = processCopilotQuery(
      'Random unpredictable query about something else',
      [],
      sampleProducts as any,
      sampleTransactions as any,
      [],
      [],
      [],
      sampleProfile
    );

    expect(res).toBeDefined();
    expect(res.answerMarkdown).toBeTruthy();
  });
});
