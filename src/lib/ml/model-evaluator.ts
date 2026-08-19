/**
 * MODEL 2 — Statistical Model Evaluator & Reliability Metrics
 * 
 * Computes MAE, RMSE, MAPE, R², and a mathematical confidence score.
 * Never invents or fabricates confidence numbers.
 */
import { EvaluationMetrics } from '@/schemas/prediction-contract';

export function evaluateModelPerformance(
  actuals: number[],
  predictions: number[]
): EvaluationMetrics {
  const n = Math.min(actuals.length, predictions.length);
  if (n === 0) {
    return {
      mae: 0,
      rmse: 0,
      mape: 0,
      r_squared: 0,
      sample_size: 0,
    };
  }

  let totalAbsError = 0;
  let totalSqError = 0;
  let totalPctError = 0;
  let validMapeCount = 0;
  let actualSum = 0;

  for (let i = 0; i < n; i++) {
    const act = actuals[i];
    const pred = predictions[i];
    const absDiff = Math.abs(act - pred);

    totalAbsError += absDiff;
    totalSqError += Math.pow(absDiff, 2);
    actualSum += act;

    if (act > 0) {
      totalPctError += (absDiff / act) * 100;
      validMapeCount++;
    }
  }

  const mae = totalAbsError / n;
  const rmse = Math.sqrt(totalSqError / n);
  const mape = validMapeCount > 0 ? totalPctError / validMapeCount : 0;

  // R-squared computation
  const actualMean = actualSum / n;
  let totalVariance = 0;
  let unexplainedVariance = 0;

  for (let i = 0; i < n; i++) {
    totalVariance += Math.pow(actuals[i] - actualMean, 2);
    unexplainedVariance += Math.pow(actuals[i] - predictions[i], 2);
  }

  const r_squared = totalVariance > 0
    ? Math.max(0, 1 - (unexplainedVariance / totalVariance))
    : 1;

  return {
    mae: Math.round(mae * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    mape: Math.round(mape * 10) / 10,
    r_squared: Math.round(r_squared * 100) / 100,
    sample_size: n,
  };
}

/**
 * Calculates a statistical confidence score (0 to 100%)
 * based on sample count, MAPE accuracy, and variance consistency.
 */
export function calculateStatisticalConfidence(
  dataPointsCount: number,
  mape: number,
  volatilityRatio = 0.2
): number {
  if (dataPointsCount < 3) {
    return 30; // Insufficient history base confidence
  }

  // 1. Sample size factor (asymptotes to 50 at n=30)
  const sampleFactor = Math.min(50, dataPointsCount * 1.6);

  // 2. Accuracy factor derived from MAPE (up to 40 points)
  // MAPE of 0% -> 40 pts, MAPE of 20% -> 20 pts, MAPE >= 40% -> 0 pts
  const accuracyFactor = Math.max(0, 40 - (mape * 1.0));

  // 3. Volatility penalty (deducts up to 15 pts if series is extremely jumpy)
  const volatilityPenalty = Math.min(15, volatilityRatio * 20);

  const rawConfidence = sampleFactor + accuracyFactor - volatilityPenalty + 15;
  return Math.min(98, Math.max(25, Math.round(rawConfidence)));
}
