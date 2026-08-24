import { describe, it, expect } from 'vitest';
import { runAIBusinessAnalyst } from './business-analyst-ai';
import { runPredictiveAnalytics } from '@/lib/ml/predictive-engine';
import { CanonicalProduct, CanonicalSale } from '@/schemas/canonical';

describe('Model 3: AI Business Analyst', () => {
  it('generates structured 5-part explanations without throwing', async () => {
    const products: CanonicalProduct[] = [
      {
        product_id: 'prod-critical',
        product_name: 'Fast Moving Item',
        sku: 'FM-01',
        category: 'Essentials',
        inventory_quantity: 2,
        min_stock: 10,
        max_stock: 100,
        price: 500,
        cost_price: 250,
        supplier_name: 'Prime Vendor',
        supplier_id: 'sup-1',
        lead_time_days: 7,
        unit: 'Piece',
        brand: '',
        barcode: '',
        description: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const sales: CanonicalSale[] = [
      {
        sale_id: 's-1',
        order_number: 'INV-1',
        product_id: 'prod-critical',
        product_name: 'Fast Moving Item',
        sku: 'FM-01',
        category: 'Essentials',
        units_sold: 5,
        selling_price: 500,
        cost_per_unit: 250,
        revenue: 2500,
        total_cost: 1250,
        customer_name: 'Customer A',
        supplier_name: 'Prime Vendor',
        sale_date: new Date().toISOString().split('T')[0],
        payment_method: 'UPI',
        status: 'Completed',
        created_at: new Date().toISOString(),
      },
    ];

    const predictions = runPredictiveAnalytics(products, sales);
    const analystResult = await runAIBusinessAnalyst(products, sales, predictions, {
      businessName: 'Apex Store',
      businessType: 'Retail',
      businessSize: '2-10 Employees',
      currency: 'INR (₹)',
    });

    expect(analystResult.executive_scorecard).toBeDefined();
    expect(analystResult.business_insights.length).toBeGreaterThan(0);
    expect(analystResult.recommendations.length).toBeGreaterThan(0);

    const rec = analystResult.recommendations[0];
    expect(rec.explanation).toBeDefined();
    expect(rec.explanation.what_happened.length).toBeGreaterThan(0);
    expect(rec.explanation.why_it_matters.length).toBeGreaterThan(0);
    expect(rec.explanation.prediction_indicated.length).toBeGreaterThan(0);
    expect(rec.explanation.recommended_action.length).toBeGreaterThan(0);
    expect(rec.explanation.supporting_data.length).toBeGreaterThan(0);
    expect(rec.supporting_metrics.actual_data).toBeDefined();
    expect(rec.supporting_metrics.model_prediction).toBeDefined();
  });
});
