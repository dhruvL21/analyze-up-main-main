'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { computeBusinessHealth } from '@/lib/command-center-engine';
import { useData } from '@/context/data-context';
import { Activity, ShieldCheck, AlertCircle, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';

export function BusinessHealthCard() {
  const { products, transactions, suppliers, returns = [] } = useData();
  const health = computeBusinessHealth(products, transactions, suppliers, returns);

  return (
    <Card className="ios-glass rounded-3xl border-primary/20 p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-2xl -z-10 pointer-events-none" />

      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Business Health Score</CardTitle>
              <CardDescription className="text-xs">Overall operational vitality & margin index</CardDescription>
            </div>
          </div>
          <Badge className={`${health.badgeClass} text-xs px-3 py-1 font-semibold`}>
            {health.category}
          </Badge>
        </div>

        {/* Score & Gauge */}
        <div className="flex items-center justify-between py-4">
          <div className="space-y-0.5">
            <div className="text-4xl font-extrabold tracking-tight flex items-baseline gap-1" style={{ color: health.color }}>
              {health.score}
              <span className="text-base font-medium text-muted-foreground">/ 100</span>
            </div>
            <p className="text-xs text-muted-foreground">{health.summarySentence}</p>
          </div>

          <div className="relative w-16 h-16 flex items-center justify-center rounded-2xl bg-secondary/60 border border-border/50 shadow-inner shrink-0">
            <ShieldCheck className="w-8 h-8" style={{ color: health.color }} />
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="space-y-2.5 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Inventory Health</span>
              <span>{health.factors.inventoryHealth}%</span>
            </div>
            <Progress value={health.factors.inventoryHealth} className="h-1.5 rounded-full" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Profit Margin Index</span>
              <span>{health.factors.marginHealth}%</span>
            </div>
            <Progress value={health.factors.marginHealth} className="h-1.5 rounded-full" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Capital Efficiency</span>
              <span>{health.factors.capitalEfficiency}%</span>
            </div>
            <Progress value={health.factors.capitalEfficiency} className="h-1.5 rounded-full" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Supplier Performance</span>
              <span>{health.factors.supplierPerformance}%</span>
            </div>
            <Progress value={health.factors.supplierPerformance} className="h-1.5 rounded-full" />
          </div>
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" /> Auto-computed live
        </span>
        <span className="font-mono text-primary">Updated just now</span>
      </div>
    </Card>
  );
}
