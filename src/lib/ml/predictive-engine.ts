/**
 * MODEL 2 — Predictive Analytics Engine Entry Point
 * 
 * Unified orchestrator executing demand forecasting, stockout prediction,
 * revenue prediction, and model evaluation metrics on standardized AnalyzeUp datasets.
 */
import { CanonicalProduct, CanonicalSale } from '@/schemas/canonical';
import { Model2PredictionResult, Model2PredictionResultSchema, ProductPrediction } from '@/schemas/prediction-contract';
import { forecastProductDemand } from './demand-forecaster';
import { predictStockout } from './stockout-predictor';
import { forecastBusinessRevenue } from './revenue-forecaster';
import { evaluateModelPerformance } from './model-evaluator';

export function runPredictiveAnalytics(
  products: CanonicalProduct[],
  sales: CanonicalSale[] = []
): Model2PredictionResult {
  const demandResults = products.map(product => forecastProductDemand(product, sales));
  
  const productPredictions: ProductPrediction[] = products.map((product, idx) => {
    const demand = demandResults[idx];
    const stockout = predictStockout(product, demand);

    const projectedRevenue30 = Math.round(demand.forecast_30_days * product.price);
    const projectedProfit30 = Math.round(demand.forecast_30_days * (product.price - product.cost_price));

    return {
      product_id: product.product_id,
      product_name: product.product_name,
      sku: product.sku,
      category: product.category,
      current_stock: product.inventory_quantity,
      price: product.price,
      cost_price: product.cost_price,
      supplier_name: product.supplier_name,
      supplier_lead_time_days: product.lead_time_days,

      demand_forecast: {
        "7_days": demand.forecast_7_days,
        "14_days": demand.forecast_14_days,
        "30_days": demand.forecast_30_days,
        daily_velocity: demand.daily_velocity,
        trend: demand.trend,
        expected_future_quantity: demand.expected_future_quantity,
      },

      stockout: {
        probability: stockout.probability,
        days_until_stockout: stockout.days_until_stockout,
        projected_stockout_date: stockout.projected_stockout_date,
        risk: stockout.risk,
        recommended_safety_stock: stockout.recommended_safety_stock,
        reorder_urgency: stockout.reorder_urgency,
        recommended_reorder_qty: stockout.recommended_reorder_qty,
        reason: stockout.reason,
      },

      revenue_forecast: {
        "30_days": projectedRevenue30,
        "30_days_profit": projectedProfit30,
      },

      model_confidence: demand.confidence,
      algorithm_used: demand.algorithm_used,
      evaluation_metrics: demand.evaluation_metrics,
      insufficient_data: demand.insufficient_data,
      data_points_count: demand.data_points_count,
    };
  });

  const aggregate = forecastBusinessRevenue(products, sales, demandResults);

  const confidences = productPredictions.map(p => p.model_confidence);
  const overallSystemConfidence = confidences.length > 0
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
    : 75;

  const sufficientCount = productPredictions.filter(p => !p.insufficient_data).length;

  return Model2PredictionResultSchema.parse({
    model_version: 'predictive_ml_v1.0',
    evaluated_at: new Date().toISOString(),
    product_predictions: productPredictions,
    aggregate_forecast: aggregate,
    overall_system_confidence: overallSystemConfidence,
    total_products_evaluated: productPredictions.length,
    products_with_sufficient_history: sufficientCount,
  });
}
