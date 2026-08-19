/**
 * 3-Tier AI Architecture Visual Badge
 * Distinguishes Actual Data (Ground Truth), Model 2 Predictions, and Model 3 AI Recommendations.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Database, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type DataTier = 'ACTUAL_DATA' | 'MODEL_2_PREDICTION' | 'MODEL_3_RECOMMENDATION';

interface ThreeTierBadgeProps {
  tier: DataTier;
  confidence?: number;
  algorithm?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function ThreeTierBadge({
  tier,
  confidence,
  algorithm,
  className = '',
  size = 'sm',
}: ThreeTierBadgeProps) {
  const isSm = size === 'sm';

  if (tier === 'ACTUAL_DATA') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`inline-flex items-center gap-1 font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all ${
                isSm ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
              } ${className}`}
            >
              <Database className={isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
              <span>Actual Data</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p className="font-semibold text-emerald-400">Ground Truth Observation</p>
            <p className="text-muted-foreground mt-0.5">
              Verified historical record from imported CSV, Excel, Google Drive, or connected Shopify store.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (tier === 'MODEL_2_PREDICTION') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`inline-flex items-center gap-1 font-semibold border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all ${
                isSm ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
              } ${className}`}
            >
              <TrendingUp className={isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
              <span>Model 2 Prediction</span>
              {confidence !== undefined && (
                <span className="ml-0.5 opacity-85 font-mono text-[9px]">({confidence}%)</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p className="font-semibold text-purple-400">Predictive Analytics Engine (Model 2)</p>
            <p className="text-muted-foreground mt-0.5">
              {algorithm ? `Algorithm: ${algorithm}. ` : ''}
              Statistical ML forecasting (Holt-Winters / GBDT autoregressive lags) with mathematical confidence evaluation.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`inline-flex items-center gap-1 font-semibold border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all ${
              isSm ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
            } ${className}`}
          >
            <Sparkles className={isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            <span>Model 3 AI Guidance</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <p className="font-semibold text-blue-400">AI Business Analyst (Model 3)</p>
          <p className="text-muted-foreground mt-0.5">
            LLM business reasoning turning quantitative predictions into actionable 5-part tactical decisions.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
