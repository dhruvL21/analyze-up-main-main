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

  it('should provide clear onboarding guide for fresh user with 0 products asking what to focus on', () => {
    const res = processCopilotQuery(
      'What should I focus on today?',
      [],
      [],
      [],
      [],
      [],
      [],
      sampleProfile
    );

    expect(res).toBeDefined();
    expect(res.intent).toBe('ONBOARDING_GUIDE');
    expect(res.what).toContain('workspace is initialized and awaiting your business data');
    expect(res.actionText).toContain('22-column CSV database template');
    expect(res.recommendedAction?.targetRoute).toBe('/dashboard/inventory');
  });

  it('should explain the 22-column CSV template schema when asked about template columns', () => {
    const res = processCopilotQuery(
      'What 22 columns are in the CSV template?',
      [],
      [],
      [],
      [],
      [],
      [],
      sampleProfile
    );

    expect(res).toBeDefined();
    expect(res.intent).toBe('ONBOARDING_GUIDE');
    expect(res.answerMarkdown).toContain('22 standardized columns');
    expect(res.answerMarkdown).toContain('Invoice No');
    expect(res.answerMarkdown).toContain('Current Stock');
  });
});
