'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Database, TrendingUp, Cpu, CheckCircle2 } from 'lucide-react';
import { AnalyzeUpIcon } from './analyze-up-icon';

export function DashboardLoadingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 350);
    const t2 = setTimeout(() => setStep(2), 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
      <div className="relative w-full max-w-md p-8 rounded-3xl ios-glass border border-emerald-500/25 bg-card/70 shadow-2xl backdrop-blur-2xl text-center space-y-6 overflow-hidden">
        {/* Top glowing ambient strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/40 via-primary to-emerald-400" />
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Central Animated Glowing Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/30 via-primary/20 to-transparent animate-pulse" />
          <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-md animate-ping opacity-60" />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/80 border border-emerald-500/40 shadow-inner text-emerald-400">
            <AnalyzeUpIcon className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black shadow-md">
            <Sparkles className="h-3 w-3 animate-spin" />
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
            Loading Your Data...
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto font-medium">
            Synchronizing live inventory, sales transactions, and executive AI brief.
          </p>
        </div>

        {/* Shimmering Progress Bar */}
        <div className="w-full bg-secondary/60 h-2 rounded-full overflow-hidden p-0.5 border border-border/40">
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-400 h-full rounded-full animate-pulse transition-all duration-700 w-3/4 shadow-sm shadow-emerald-500/50" />
        </div>

        {/* Live Synchronization Stages */}
        <div className="space-y-2 text-left pt-2 border-t border-border/40">
          <div className="flex items-center justify-between text-xs py-1">
            <span className="flex items-center gap-2 text-muted-foreground font-medium">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Inventory & Products
            </span>
            <span className="flex items-center gap-1 font-semibold text-emerald-400 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="flex items-center gap-2 text-muted-foreground font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Sales & Financial Metrics
            </span>
            <span className="flex items-center gap-1 font-semibold text-emerald-400 text-[11px]">
              {step >= 1 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Loaded
                </>
              ) : (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" /> Syncing...
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="flex items-center gap-2 text-muted-foreground font-medium">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Executive AI Diagnostics
            </span>
            <span className="flex items-center gap-1 font-semibold text-[11px]">
              {step >= 2 ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Initialized
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
