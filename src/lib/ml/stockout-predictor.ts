/**
 * MODEL 2 — Stockout & Inventory Risk Predictor
 * 
 * Computes:
 * - Stockout probability P(stockout) using lead-time buffer statistics
 * - Days until stockout
 * - Recommended safety stock via service level Z-factor: SS = Z * sigma_D * sqrt(L)
 * - Reorder urgency & quantity
 */
import { CanonicalProduct } from '@/schemas/canonical';
import { ProductDemandForecastResult } from './demand-forecaster';

export interface StockoutPredictionResult {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  probability: number; // 0.0 to 1.0
  days_until_stockout: number | null;
  projected_stockout_date: string | null;
  risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  recommended_safety_stock: number;
  reorder_urgency: 'CRITICAL' | 'MODERATE' | 'LOW' | 'NONE';
  recommended_reorder_qty: number;
  reason: string;
}

/**
 * Standard Normal Cumulative Distribution Function approximation
 */
function standardNormalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

export function predictStockout(
  product: CanonicalProduct,
  demandForecast: ProductDemandForecastResult
): StockoutPredictionResult {
  const stock = product.inventory_quantity;
  const leadTime = product.lead_time_days || 7;
  const dailyVel = demandForecast.daily_velocity;

  // 1. Days until stockout
  let daysUntilStockout: number | null = null;
  let projectedStockoutDate: string | null = null;

  if (dailyVel > 0) {
    daysUntilStockout = Math.max(0, Math.floor(stock / dailyVel));
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysUntilStockout);
    projectedStockoutDate = targetDate.toISOString().split('T')[0];
  }

  // 2. Safety Stock calculation (95% service level -> Z = 1.65)
  const zService = 1.65;
  const demandStdDev = Math.max(0.5, dailyVel * 0.4);
  const safetyStock = Math.round(zService * demandStdDev * Math.sqrt(leadTime));

  // 3. Expected demand during lead time
  const leadTimeDemand = dailyVel * leadTime;
  const reorderPoint = leadTimeDemand + safetyStock;

  // 4. Probability of stockout before restock arrival
  // Z_score = (Current Stock - Lead Time Demand) / (sigma_D * sqrt(L))
  const stdError = Math.max(0.1, demandStdDev * Math.sqrt(leadTime));
  const zScore = (stock - leadTimeDemand) / stdError;
  const stockoutProb = Math.min(1.0, Math.max(0.0, Math.round((1 - standardNormalCDF(zScore)) * 100) / 100));

  // 5. Risk and Urgency classification
  let risk: StockoutPredictionResult['risk'] = 'NONE';
  let reorderUrgency: StockoutPredictionResult['reorder_urgency'] = 'NONE';
  let reason = 'Stock is within optimal healthy thresholds.';

  if (stock === 0) {
    risk = 'HIGH';
    reorderUrgency = 'CRITICAL';
    reason = `Out of stock immediately! ${leadTime}-day vendor lead time required to replenish.`;
  } else if (daysUntilStockout !== null && daysUntilStockout <= leadTime) {
    risk = 'HIGH';
    reorderUrgency = 'CRITICAL';
    reason = `Projected stockout in ${daysUntilStockout} days, which is less than supplier lead time (${leadTime} days).`;
  } else if (daysUntilStockout !== null && daysUntilStockout <= leadTime * 1.5) {
    risk = 'MEDIUM';
    reorderUrgency = 'MODERATE';
    reason = `Stock buffer allows ${daysUntilStockout} days before depletion. Place order soon to prevent stockout.`;
  } else if (stock <= product.min_stock) {
    risk = 'LOW';
    reorderUrgency = 'LOW';
    reason = `Stock level (${stock}) is near minimum threshold (${product.min_stock}).`;
  }

  // 6. Recommended Reorder Quantity: Q* = LeadTimeDemand + SafetyStock + 14_DayBuffer - CurrentStock
  const buffer14Days = dailyVel * 14;
  const targetStock = reorderPoint + buffer14Days;
  const rawReorder = Math.ceil(targetStock - stock);
  const recommendedReorderQty = Math.max(0, Math.max(product.min_stock * 2, rawReorder));

  return {
    product_id: product.product_id,
    product_name: product.product_name,
    sku: product.sku,
    current_stock: stock,
    probability: stockoutProb,
    days_until_stockout: daysUntilStockout,
    projected_stockout_date: projectedStockoutDate,
    risk,
    recommended_safety_stock: safetyStock,
    reorder_urgency: reorderUrgency,
    recommended_reorder_qty: recommendedReorderQty,
    reason,
  };
}
