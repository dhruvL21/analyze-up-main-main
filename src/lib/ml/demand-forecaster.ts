/**
 * MODEL 2 — Demand Forecasting Subsystem
 * 
 * Generates 7-day, 14-day, and 30-day demand predictions using statistical & ML models.
 */
import { CanonicalProduct, CanonicalSale } from '@/schemas/canonical';
import {
  holtsExponentialSmoothing,
  extractAutoregressiveFeatures,
  GradientBoostedDemandModel,
  calculateEWMA,
  TabularFeatures,
} from './time-series-models';
import { evaluateModelPerformance, calculateStatisticalConfidence } from './model-evaluator';
import { EvaluationMetrics } from '@/schemas/prediction-contract';

export interface ProductDemandForecastResult {
  product_id: string;
  product_name: string;
  sku: string;
  daily_velocity: number;
  forecast_7_days: number;
  forecast_14_days: number;
  forecast_30_days: number;
  expected_future_quantity: number;
  trend: 'Increasing' | 'Stable' | 'Declining' | 'Volatile';
  confidence: number;
  algorithm_used: string;
  evaluation_metrics: EvaluationMetrics;
  insufficient_data: boolean;
  data_points_count: number;
}

export function forecastProductDemand(
  product: CanonicalProduct,
  sales: CanonicalSale[]
): ProductDemandForecastResult {
  const pName = product.product_name || 'Product';
  const sku = product.sku || '';

  // Filter sales matching this product
  const productSales = sales.filter(s => {
    return (
      (product.product_id && s.product_id === product.product_id) ||
      (sku && s.sku && s.sku.toUpperCase() === sku.toUpperCase()) ||
      (s.product_name && s.product_name.toLowerCase() === pName.toLowerCase())
    );
  });

  // Build daily sales map over the last 60 days
  const dailyMap: Record<string, number> = {};
  const today = new Date();
  
  for (let d = 59; d >= 0; d--) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - d);
    const dateStr = dt.toISOString().split('T')[0];
    dailyMap[dateStr] = 0;
  }

  productSales.forEach(s => {
    const dStr = s.sale_date ? s.sale_date.split('T')[0] : '';
    if (dailyMap[dStr] !== undefined) {
      dailyMap[dStr] += s.units_sold;
    }
  });

  const dailyValues = Object.values(dailyMap);
  const nonZeroDays = dailyValues.filter(v => v > 0).length;
  const totalUnitsSold = dailyValues.reduce((a, b) => a + b, 0);

  // Insufficient history handling
  if (productSales.length === 0 || totalUnitsSold === 0) {
    const fallbackDaily = 0.5; // Baseline prior
    return {
      product_id: product.product_id,
      product_name: pName,
      sku,
      daily_velocity: fallbackDaily,
      forecast_7_days: Math.round(fallbackDaily * 7),
      forecast_14_days: Math.round(fallbackDaily * 14),
      forecast_30_days: Math.round(fallbackDaily * 30),
      expected_future_quantity: Math.round(fallbackDaily * 30),
      trend: 'Stable',
      confidence: 30,
      algorithm_used: 'Prior Baseline (Zero Historical Sales)',
      evaluation_metrics: { mae: 0, rmse: 0, mape: 0, r_squared: 0, sample_size: 0 },
      insufficient_data: true,
      data_points_count: 0,
    };
  }

  let algorithm_used = 'Holt-Winters EWMA';
  let forecast7 = 0;
  let forecast14 = 0;
  let forecast30 = 0;
  let dailyVelocity = 0;
  let evaluation_metrics: EvaluationMetrics = { mae: 0, rmse: 0, mape: 0, r_squared: 1, sample_size: dailyValues.length };

  if (nonZeroDays >= 8) {
    // Train GBDT Autoregressive Model on daily slices
    const X: TabularFeatures[] = [];
    const y: number[] = [];

    for (let i = 14; i < dailyValues.length; i++) {
      const slice = dailyValues.slice(0, i);
      X.push(extractAutoregressiveFeatures(slice));
      y.push(dailyValues[i]);
    }

    if (X.length >= 8) {
      algorithm_used = 'Gradient Boosted Autoregressive Lags';
      const gbdt = new GradientBoostedDemandModel();
      
      // Train / Validation split (last 7 days for test)
      const trainLen = Math.max(4, X.length - 7);
      const trainX = X.slice(0, trainLen);
      const trainY = y.slice(0, trainLen);
      const testX = X.slice(trainLen);
      const testY = y.slice(trainLen);

      gbdt.fit(trainX, trainY);
      const testPreds = testX.map(feat => gbdt.predict(feat));
      evaluation_metrics = evaluateModelPerformance(testY, testPreds);

      // Now predict forward
      const currentFeatures = extractAutoregressiveFeatures(dailyValues);
      dailyVelocity = gbdt.predict(currentFeatures);
      
      // Multi-step forward projection
      const holt = holtsExponentialSmoothing(dailyValues, 30);
      forecast7 = Math.round(holt.forecast.slice(0, 7).reduce((a, b) => a + b, 0));
      forecast14 = Math.round(holt.forecast.slice(0, 14).reduce((a, b) => a + b, 0));
      forecast30 = Math.round(holt.forecast.reduce((a, b) => a + b, 0));
    } else {
      const holt = holtsExponentialSmoothing(dailyValues, 30);
      forecast7 = Math.round(holt.forecast.slice(0, 7).reduce((a, b) => a + b, 0));
      forecast14 = Math.round(holt.forecast.slice(0, 14).reduce((a, b) => a + b, 0));
      forecast30 = Math.round(holt.forecast.reduce((a, b) => a + b, 0));
      dailyVelocity = Math.max(0.1, forecast30 / 30);
    }
  } else {
    // Simple EWMA for sparse data
    algorithm_used = 'EWMA Smoothing (Sparse Data)';
    dailyVelocity = calculateEWMA(dailyValues.slice(-14));
    if (dailyVelocity <= 0) dailyVelocity = totalUnitsSold / Math.max(1, nonZeroDays);

    forecast7 = Math.max(1, Math.round(dailyVelocity * 7));
    forecast14 = Math.max(2, Math.round(dailyVelocity * 14));
    forecast30 = Math.max(4, Math.round(dailyVelocity * 30));
  }

  // Trend detection
  const recent7Total = dailyValues.slice(-7).reduce((a, b) => a + b, 0);
  const prev7Total = dailyValues.slice(-14, -7).reduce((a, b) => a + b, 0);
  let trend: ProductDemandForecastResult['trend'] = 'Stable';

  if (prev7Total > 0) {
    const diffPct = (recent7Total - prev7Total) / prev7Total;
    if (diffPct >= 0.25) trend = 'Increasing';
    else if (diffPct <= -0.25) trend = 'Declining';
    else trend = 'Stable';
  } else if (recent7Total > 0) {
    trend = 'Increasing';
  }

  const confidence = calculateStatisticalConfidence(nonZeroDays, evaluation_metrics.mape);

  return {
    product_id: product.product_id,
    product_name: pName,
    sku,
    daily_velocity: Math.round(dailyVelocity * 100) / 100,
    forecast_7_days: forecast7,
    forecast_14_days: forecast14,
    forecast_30_days: forecast30,
    expected_future_quantity: forecast30,
    trend,
    confidence,
    algorithm_used,
    evaluation_metrics,
    insufficient_data: nonZeroDays < 3,
    data_points_count: nonZeroDays,
  };
}
