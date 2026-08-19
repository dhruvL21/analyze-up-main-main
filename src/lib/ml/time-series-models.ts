/**
 * MODEL 2 — Time Series & Tabular Machine Learning Models
 * 
 * Implements:
 * 1. Holt-Winters Exponential Smoothing with trend & dampening
 * 2. Autoregressive Feature Generator (Lags & Moving Averages)
 * 3. Gradient Boosted Tree / Ensemble Regressor for tabular demand
 * 4. Exponentially Weighted Moving Average (EWMA) Baseline
 */

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

/**
 * 1. Holt-Winters / Double Exponential Smoothing (Holt's Linear Trend)
 * alpha: level smoothing factor (0.0 to 1.0)
 * beta: trend smoothing factor (0.0 to 1.0)
 * phi: trend dampening parameter (0.0 to 1.0)
 */
export function holtsExponentialSmoothing(
  series: number[],
  forecastHorizon: number,
  alpha = 0.3,
  beta = 0.1,
  phi = 0.95
): { forecast: number[]; finalLevel: number; finalTrend: number } {
  if (series.length === 0) {
    return {
      forecast: new Array(forecastHorizon).fill(0),
      finalLevel: 0,
      finalTrend: 0,
    };
  }

  if (series.length === 1) {
    return {
      forecast: new Array(forecastHorizon).fill(series[0]),
      finalLevel: series[0],
      finalTrend: 0,
    };
  }

  let level = series[0];
  let trend = series[1] - series[0];

  for (let i = 1; i < series.length; i++) {
    const prevLevel = level;
    const y = series[i];
    level = alpha * y + (1 - alpha) * (prevLevel + phi * trend);
    trend = beta * (level - prevLevel) + (1 - beta) * (phi * trend);
  }

  const forecast: number[] = [];
  for (let h = 1; h <= forecastHorizon; h++) {
    const dampenedFactor = Math.pow(phi, h);
    const pred = Math.max(0, level + h * trend * dampenedFactor);
    forecast.push(Math.round(pred * 100) / 100);
  }

  return { forecast, finalLevel: level, finalTrend: trend };
}

/**
 * 2. Autoregressive Feature Extractor for Tabular ML
 */
export interface TabularFeatures {
  lag1: number;
  lag7: number;
  lag14: number;
  rollingMean7: number;
  rollingMean14: number;
  rollingStd7: number;
  trendSlope: number;
}

export function extractAutoregressiveFeatures(dailySeries: number[]): TabularFeatures {
  const n = dailySeries.length;
  if (n === 0) {
    return { lag1: 0, lag7: 0, lag14: 0, rollingMean7: 0, rollingMean14: 0, rollingStd7: 0, trendSlope: 0 };
  }

  const lag1 = dailySeries[n - 1] || 0;
  const lag7 = n >= 7 ? dailySeries[n - 7] : lag1;
  const lag14 = n >= 14 ? dailySeries[n - 14] : lag7;

  const slice7 = dailySeries.slice(Math.max(0, n - 7));
  const slice14 = dailySeries.slice(Math.max(0, n - 14));

  const mean7 = slice7.reduce((a, b) => a + b, 0) / (slice7.length || 1);
  const mean14 = slice14.reduce((a, b) => a + b, 0) / (slice14.length || 1);

  const variance7 = slice7.reduce((acc, val) => acc + Math.pow(val - mean7, 2), 0) / (slice7.length || 1);
  const std7 = Math.sqrt(variance7);

  const trendSlope = mean14 > 0 ? (mean7 - mean14) / mean14 : 0;

  return {
    lag1,
    lag7,
    lag14,
    rollingMean7: mean7,
    rollingMean14: mean14,
    rollingStd7: std7,
    trendSlope,
  };
}

/**
 * 3. Decision Stump for Boosting
 */
interface DecisionStump {
  feature: keyof TabularFeatures;
  threshold: number;
  leftVal: number;
  rightVal: number;
}

/**
 * 4. Gradient Boosted Lag Regressor (GBDT) on Autoregressive Features
 * Pure, deterministic TypeScript ML model with zero external native binaries.
 */
export class GradientBoostedDemandModel {
  private stumps: DecisionStump[] = [];
  private basePrediction = 0;
  private learningRate = 0.1;
  private numEstimators = 15;

  public fit(X: TabularFeatures[], y: number[]): void {
    if (X.length === 0 || y.length === 0) return;

    this.basePrediction = y.reduce((a, b) => a + b, 0) / y.length;
    let residuals = y.map(actual => actual - this.basePrediction);
    this.stumps = [];

    const featureKeys: (keyof TabularFeatures)[] = [
      'lag1',
      'lag7',
      'lag14',
      'rollingMean7',
      'rollingMean14',
      'trendSlope',
    ];

    for (let iter = 0; iter < this.numEstimators; iter++) {
      let bestFeature: keyof TabularFeatures = 'rollingMean7';
      let bestThreshold = 0;
      let bestLeftVal = 0;
      let bestRightVal = 0;
      let minLoss = Infinity;

      for (const feat of featureKeys) {
        const values = X.map(row => row[feat]).sort((a, b) => a - b);
        const candidateThresholds = [
          values[Math.floor(values.length * 0.25)] || 0,
          values[Math.floor(values.length * 0.5)] || 0,
          values[Math.floor(values.length * 0.75)] || 0,
        ];

        for (const thresh of candidateThresholds) {
          const leftResiduals: number[] = [];
          const rightResiduals: number[] = [];

          X.forEach((row, i) => {
            if (row[feat] <= thresh) {
              leftResiduals.push(residuals[i]);
            } else {
              rightResiduals.push(residuals[i]);
            }
          });

          const leftMean = leftResiduals.length > 0
            ? leftResiduals.reduce((a, b) => a + b, 0) / leftResiduals.length
            : 0;
          const rightMean = rightResiduals.length > 0
            ? rightResiduals.reduce((a, b) => a + b, 0) / rightResiduals.length
            : 0;

          let loss = 0;
          X.forEach((row, i) => {
            const pred = row[feat] <= thresh ? leftMean : rightMean;
            loss += Math.pow(residuals[i] - pred, 2);
          });

          if (loss < minLoss) {
            minLoss = loss;
            bestFeature = feat;
            bestThreshold = thresh;
            bestLeftVal = leftMean;
            bestRightVal = rightMean;
          }
        }
      }

      this.stumps.push({
        feature: bestFeature,
        threshold: bestThreshold,
        leftVal: bestLeftVal * this.learningRate,
        rightVal: bestRightVal * this.learningRate,
      });

      // Update residuals
      residuals = residuals.map((r, i) => {
        const featVal = X[i][bestFeature];
        const step = featVal <= bestThreshold ? bestLeftVal * this.learningRate : bestRightVal * this.learningRate;
        return r - step;
      });
    }
  }

  public predict(features: TabularFeatures): number {
    let score = this.basePrediction;
    for (const stump of this.stumps) {
      const val = features[stump.feature];
      score += val <= stump.threshold ? stump.leftVal : stump.rightVal;
    }
    return Math.max(0, score);
  }
}

/**
 * 5. Exponentially Weighted Moving Average (EWMA) Baseline
 */
export function calculateEWMA(series: number[], alpha = 0.25): number {
  if (series.length === 0) return 0;
  let ewma = series[0];
  for (let i = 1; i < series.length; i++) {
    ewma = alpha * series[i] + (1 - alpha) * ewma;
  }
  return Math.max(0, ewma);
}
