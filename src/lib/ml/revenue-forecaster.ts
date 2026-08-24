/**
 * MODEL 2 — Revenue & Profit Forecasting Subsystem
 * 
 * Computes 30-day projected revenue, gross profit, and growth rates.
 */
import { CanonicalProduct, CanonicalSale } from '@/schemas/canonical';
import { ProductDemandForecastResult } from './demand-forecaster';
import { EvaluationMetrics } from '@/schemas/prediction-contract';
import { evaluateModelPerformance } from './model-evaluator';

export interface AggregateRevenueForecastResult {
  projected_30_day_revenue: number;
  projected_30_day_profit: number;
  projected_margin_percent: number;
  revenue_growth_rate_percent: number;
  critical_stockouts_count: number;
  tied_up_dead_stock_capital: number;
  overall_confidence: number;
  evaluation_metrics: EvaluationMetrics;
}

export function forecastBusinessRevenue(
  products: CanonicalProduct[],
  sales: CanonicalSale[],
  demandForecasts: ProductDemandForecastResult[]
): AggregateRevenueForecastResult {
  let totalProjectedRevenue = 0;
  let totalProjectedCOGS = 0;
  let tiedUpDeadStock = 0;

  const demandMap = new Map(demandForecasts.map(df => [df.product_id || df.sku, df]));

  products.forEach(p => {
    const key = p.product_id || p.sku;
    const df = demandMap.get(key);
    const expectedQty = df ? df.forecast_30_days : 0;
    
    // Revenue projection for available stock
    const sellableQty = Math.min(expectedQty, p.inventory_quantity + (expectedQty > p.inventory_quantity ? expectedQty * 0.5 : 0));
    const prodRev = sellableQty * p.price;
    const prodCost = sellableQty * p.cost_price;

    totalProjectedRevenue += prodRev;
    totalProjectedCOGS += prodCost;

    if (df && df.daily_velocity === 0 && p.inventory_quantity > 0) {
      tiedUpDeadStock += p.inventory_quantity * p.cost_price;
    }
  });

  const totalProjectedProfit = totalProjectedRevenue - totalProjectedCOGS;
  const marginPercent = totalProjectedRevenue > 0
    ? Math.round((totalProjectedProfit / totalProjectedRevenue) * 100)
    : 35;

  // Calculate historical 30-day revenue vs previous 30-day for growth rate
  const now = new Date();
  const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const past60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  let recent30Revenue = 0;
  let prev30Revenue = 0;

  sales.forEach(s => {
    const sDate = s.sale_date ? new Date(s.sale_date) : null;
    if (!sDate || isNaN(sDate.getTime())) return;

    if (sDate >= past30) {
      recent30Revenue += s.revenue;
    } else if (sDate >= past60 && sDate < past30) {
      prev30Revenue += s.revenue;
    }
  });

  let growthRate = 0;
  if (prev30Revenue > 0) {
    growthRate = Math.round(((recent30Revenue - prev30Revenue) / prev30Revenue) * 100);
  } else if (recent30Revenue > 0) {
    growthRate = 15;
  }

  // Model evaluation on sales
  const evalMetrics = evaluateModelPerformance(
    [recent30Revenue],
    [totalProjectedRevenue]
  );

  const confidences = demandForecasts.map(d => d.confidence);
  const overallConfidence = confidences.length > 0
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
    : 75;

  return {
    projected_30_day_revenue: Math.round(totalProjectedRevenue),
    projected_30_day_profit: Math.round(totalProjectedProfit),
    projected_margin_percent: marginPercent,
    revenue_growth_rate_percent: growthRate,
    critical_stockouts_count: products.filter(p => p.inventory_quantity === 0).length,
    tied_up_dead_stock_capital: Math.round(tiedUpDeadStock),
    overall_confidence: overallConfidence,
    evaluation_metrics: evalMetrics,
  };
}
