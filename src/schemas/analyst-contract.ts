/**
 * Model 3 Contract — AI Business Analyst
 * Defines structured 5-part explanations, recommendations, and clear segregation of Facts vs Predictions vs Recommendations.
 */
import { z } from 'zod';

export const FivePartExplanationSchema = z.object({
  what_happened: z.string().describe('1. What happened? Observed factual business data.'),
  why_it_matters: z.string().describe('2. Why does it matter? Financial / operational business impact.'),
  prediction_indicated: z.string().describe('3. What does the prediction indicate? Model 2 quantitative forecast.'),
  recommended_action: z.string().describe('4. What should the business owner do? Concrete actionable step.'),
  supporting_data: z.string().describe('5. What data supports the recommendation? Precise metrics backing this decision.'),
});

export type FivePartExplanation = z.infer<typeof FivePartExplanationSchema>;

export const BusinessInsightSchema = z.object({
  id: z.string(),
  category: z.enum(['sales', 'inventory', 'supplier', 'profitability', 'growth']),
  type: z.enum(['trend', 'anomaly', 'performance', 'opportunity', 'risk']),
  title: z.string(),
  insight: z.string(),
  observed_fact: z.string().describe('Actual historical data point, not an AI hallucination'),
  severity: z.enum(['high', 'medium', 'low', 'positive']).default('medium'),
});

export type BusinessInsight = z.infer<typeof BusinessInsightSchema>;

export const ActionableRecommendationSchema = z.object({
  id: z.string(),
  type: z.enum(['reorder', 'clearance_promo', 'price_optimization', 'supplier_negotiation', 'inventory_audit', 'restock_safety']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  title: z.string(),
  explanation: FivePartExplanationSchema,
  recommendation_summary: z.string(),
  estimated_benefit: z.string(),
  
  supporting_metrics: z.object({
    actual_data: z.record(z.any()).describe('Ground truth observed historical values'),
    model_prediction: z.record(z.any()).describe('Model 2 mathematical predictions & probabilities'),
  }),
  
  target_entity: z.object({
    type: z.enum(['product', 'supplier', 'category']),
    id: z.string(),
    name: z.string(),
  }).optional(),
});

export type ActionableRecommendation = z.infer<typeof ActionableRecommendationSchema>;

export const Model3AnalystResultSchema = z.object({
  executive_scorecard: z.object({
    health_comment: z.string(),
    biggest_immediate_decision: z.string(),
    confidence_level: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    analysis_timestamp: z.string(),
  }),
  business_insights: z.array(BusinessInsightSchema),
  recommendations: z.array(ActionableRecommendationSchema),
  generated_at: z.string().default(() => new Date().toISOString()),
});

export type Model3AnalystResult = z.infer<typeof Model3AnalystResultSchema>;
