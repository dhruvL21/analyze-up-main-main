import { describe, it, expect } from 'vitest';
import { processCopilotQuery } from './copilot-engine';
import { BusinessProfile } from './types';

describe('Copilot Engine Query Processing', () => {
  const sampleProducts = [
    { id: '1', name: 'MacBook Pro Case', sku: 'SKU-MBP', stock: 5, minStock: 20, price: 2000, costPrice: 1200, category: 'Accessories' },
    { id: '2', name: 'USB-C Cable', sku: 'SKU-USBC', stock: 150, minStock: 30, price: 500, costPrice: 200, category: 'Cables' },
  ];

  const sampleTransactions = [
    { id: 'tx-1', type: 'Sale', productId: '1', productName: 'MacBook Pro Case', total: 4000, quantity: 2, price: 2000, date: new Date().toISOString() },
  ];

  const sampleProfile: BusinessProfile = {
    businessName: 'TechStore',
    currency: 'INR (₹)',
    businessType: 'Retail',
    businessSize: '2-10 Employees',
  };

  it('should generate a 5-day sales plan when user asks for next 5 day plan for sales', () => {
    const res = processCopilotQuery(
      'give me the next 5 day plan for sales',
      [],
      sampleProducts as any,
      sampleTransactions as any,
      [],
      [],
      [],
      sampleProfile
    );

    expect(res).toBeDefined();
    expect(res.intent).toBe('SALES_PLAN_OR_STRATEGY');
    expect(res.answerMarkdown).toContain('5-DAY STRATEGIC SALES & REVENUE PLAN');
    expect(res.answerMarkdown).toContain('Day 1');
    expect(res.answerMarkdown).toContain('Day 5');
    expect(res.supportingData.length).toBeGreaterThan(0);
  });

  it('should identify dead stock clearance intent', () => {
    const res = processCopilotQuery(
      'Which products are tying up capital in dead stock?',
      [],
      sampleProducts as any,
      sampleTransactions as any,
      [],
      [],
      [],
      sampleProfile
    );

    expect(res).toBeDefined();
    expect(res.intent).toBe('DEAD_STOCK_ANALYSIS');
    expect(res.answerMarkdown).toContain('DEAD STOCK');
  });

  it('should look up a specific product diagnostic when mentioned by name', () => {
    const res = processCopilotQuery(
      'How is MacBook Pro Case performing?',
      [],
      sampleProducts as any,
      sampleTransactions as any,
      [],
      [],
      [],
      sampleProfile
    );

    expect(res).toBeDefined();
    expect(res.intent).toBe('SPECIFIC_PRODUCT_LOOKUP');
    expect(res.answerMarkdown).toContain('SKU DIAGNOSTIC: MACBOOK PRO CASE');
  });

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
    expect(res.answerMarkdown).toContain('STRATEGIC BUSINESS ADVISOR ANALYSIS');
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
