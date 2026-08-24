/**
 * Model 2 Contract — Predictive Analytics Engine
 * Output structure for numerical demand, stockout risk, revenue, and statistical evaluation.
 */
import { z } from 'zod';

export const EvaluationMetricsSchema = z.object({
  mae: z.number().nonnegative().describe('Mean Absolute Error'),
  rmse: z.number().nonnegative().describe('Root Mean Squared Error'),
  mape: z.number().nonnegative().describe('Mean Absolute Percentage Error in percentage (e.g. 5.4%)'),
  r_squared: z.number().optional().describe('Coefficient of Determination'),
  sample_size: z.number().int().nonnegative().default(0),
});

export type EvaluationMetrics = z.infer<typeof EvaluationMetricsSchema>;

export const ProductPredictionSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  sku: z.string().default(''),
  category: z.string().default('General'),
  current_stock: z.number().nonnegative(),
  price: z.number().nonnegative(),
  cost_price: z.number().nonnegative(),
  supplier_name: z.string().default(''),
  supplier_lead_time_days: z.number().default(7),
  
  demand_forecast: z.object({
    "7_days": z.number().nonnegative(),
    "14_days": z.number().nonnegative(),
    "30_days": z.number().nonnegative(),
    daily_velocity: z.number().nonnegative(),
    trend: z.enum(['Increasing', 'Stable', 'Declining', 'Volatile']),
    expected_future_quantity: z.number().nonnegative(),
  }),
  
  stockout: z.object({
    probability: z.number().min(0).max(1).describe('Stockout probability between 0.0 and 1.0'),
    days_until_stockout: z.number().nullable(),
    projected_stockout_date: z.string().nullable(),
    risk: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']),
    recommended_safety_stock: z.number().nonnegative(),
    reorder_urgency: z.enum(['CRITICAL', 'MODERATE', 'LOW', 'NONE']),
    recommended_reorder_qty: z.number().nonnegative(),
    reason: z.string(),
  }),
  
  revenue_forecast: z.object({
    "30_days": z.number().nonnegative(),
    "30_days_profit": z.number(),
  }),
  
  model_confidence: z.number().min(0).max(100).describe('Real statistical model confidence 0-100%'),
  algorithm_used: z.string().describe('e.g. Holt-Winters EWMA, GBDT Lag Regressor, Baseline MA'),
  evaluation_metrics: EvaluationMetricsSchema,
  insufficient_data: z.boolean().default(false),
  data_points_count: z.number().int().default(0),
});

export type ProductPrediction = z.infer<typeof ProductPredictionSchema>;

export const Model2PredictionResultSchema = z.object({
  model_version: z.string().default('predictive_ml_v1.0'),
  evaluated_at: z.string().default(() => new Date().toISOString()),
  product_predictions: z.array(ProductPredictionSchema),
  
  aggregate_forecast: z.object({
    projected_30_day_revenue: z.number().nonnegative(),
    projected_30_day_profit: z.number(),
    projected_margin_percent: z.number(),
    revenue_growth_rate_percent: z.number(),
    critical_stockouts_count: z.number().int().nonnegative(),
    tied_up_dead_stock_capital: z.number().nonnegative(),
    overall_confidence: z.number().min(0).max(100),
    evaluation_metrics: EvaluationMetricsSchema,
  }),
  
  overall_system_confidence: z.number().min(0).max(100),
  total_products_evaluated: z.number().int().nonnegative(),
  products_with_sufficient_history: z.number().int().nonnegative(),
});

export type Model2PredictionResult = z.infer<typeof Model2PredictionResultSchema>;
