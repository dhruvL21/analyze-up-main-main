import { describe, it, expect } from 'vitest';
import { runPredictiveAnalytics } from './predictive-engine';
import { holtsExponentialSmoothing, extractAutoregressiveFeatures } from './time-series-models';
import { evaluateModelPerformance, calculateStatisticalConfidence } from './model-evaluator';
import { CanonicalProduct, CanonicalSale } from '@/schemas/canonical';

describe('Model 2: Predictive Analytics Engine', () => {
  it('computes Holt-Winters exponential smoothing without NaN or negative values', () => {
    const series = [10, 12, 14, 13, 16, 18, 20, 22];
    const result = holtsExponentialSmoothing(series, 7);
    expect(result.forecast.length).toBe(7);
    expect(result.forecast[0]).toBeGreaterThan(15);
    result.forecast.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
  });

  it('evaluates statistical metrics (MAE, RMSE, MAPE) correctly', () => {
    const actuals = [100, 120, 150, 130];
    const predictions = [105, 115, 140, 135];

    const metrics = evaluateModelPerformance(actuals, predictions);
    expect(metrics.mae).toBe(6.25);
    expect(metrics.rmse).toBeGreaterThan(0);
    expect(metrics.mape).toBeGreaterThan(0);
    expect(metrics.sample_size).toBe(4);
  });

  it('calculates statistical confidence reflecting sample size and accuracy', () => {
    const highConf = calculateStatisticalConfidence(30, 4.2);
    const lowConf = calculateStatisticalConfidence(2, 25.0);

    expect(highConf).toBeGreaterThan(70);
    expect(lowConf).toBeLessThan(50);
  });

  it('runs full predictive analytics pipeline on canonical products and sales', () => {
    const products: CanonicalProduct[] = [
      {
        product_id: 'prod-1',
        product_name: 'Wireless Earbuds',
        sku: 'EAR-01',
        category: 'Electronics',
        inventory_quantity: 15,
        min_stock: 5,
        max_stock: 100,
        price: 1999,
        cost_price: 1100,
        supplier_name: 'Sound Vendor',
        supplier_id: 'sup-1',
        lead_time_days: 7,
        unit: 'Piece',
        brand: 'SoundX',
        barcode: '',
        description: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        product_id: 'prod-2',
        product_name: 'Dead Stock Case',
        sku: 'CASE-01',
        category: 'Accessories',
        inventory_quantity: 40,
        min_stock: 5,
        max_stock: 100,
        price: 499,
        cost_price: 250,
        supplier_name: 'Plastic Co',
        supplier_id: 'sup-2',
        lead_time_days: 5,
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
        sale_id: 'sale-1',
        order_number: 'ORD-101',
        product_id: 'prod-1',
        product_name: 'Wireless Earbuds',
        sku: 'EAR-01',
        category: 'Electronics',
        units_sold: 3,
        selling_price: 1999,
        cost_per_unit: 1100,
        revenue: 5997,
        total_cost: 3300,
        customer_name: 'John Doe',
        supplier_name: 'Sound Vendor',
        sale_date: new Date().toISOString().split('T')[0],
        payment_method: 'UPI',
        status: 'Completed',
        created_at: new Date().toISOString(),
      },
    ];

    const result = runPredictiveAnalytics(products, sales);
    expect(result.model_version).toBe('predictive_ml_v1.0');
    expect(result.product_predictions.length).toBe(2);

    const earbudPred = result.product_predictions.find(p => p.sku === 'EAR-01')!;
    expect(earbudPred.demand_forecast['7_days']).toBeGreaterThan(0);
    expect(earbudPred.stockout.probability).toBeGreaterThanOrEqual(0);
    expect(earbudPred.stockout.probability).toBeLessThanOrEqual(1);

    expect(result.aggregate_forecast.projected_30_day_revenue).toBeGreaterThan(0);
  });
});
