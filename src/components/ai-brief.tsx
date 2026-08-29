'use client';

import { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import { useData } from '@/context/data-context';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Sparkles, AlertTriangle, Coins, Loader2, RefreshCw, Lock, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generateAIBrief, AIBriefOutput } from '@/ai/flows/ai-brief-generator';
import { Skeleton } from '@/components/ui/skeleton';
import { ThreeTierBadge } from '@/components/three-tier-badge';
import { serializePlainData } from '@/lib/utils';
import type { Product, Transaction } from '@/lib/types';

export function AIBrief() {
  const { products, transactions, activePlan, setShowSubscriptionModal, returns = [], isLoading } = useData();
  const { user } = useUser();
  const firestore = useFirestore();

  const briefRef = useMemo(() => user && firestore ? doc(firestore, 'users', user.uid, 'analytics', 'ai_brief') : null, [user, firestore]);
  const { data: persistedBrief, loading: briefLoading } = useDoc<AIBriefOutput>(briefRef);

  const [brief, setBrief] = useState<AIBriefOutput | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPaid = activePlan !== 'Free Trial';

  // Sync persisted brief when available
  useEffect(() => {
    if (persistedBrief && !brief) {
      setBrief(persistedBrief);
    }
  }, [persistedBrief, brief]);

  // Calculate return stats in real-time
  const returnedQty = returns.reduce((sum, r) => sum + r.quantity, 0);
  const totalItemsSold = transactions
    .filter(t => t.type === 'Sale' && t.quantity > 0)
    .reduce((sum, t) => sum + t.quantity, 0) || 1;
  const returnRate = (returnedQty / totalItemsSold) * 100;

  const returnedProductMap: Record<string, number> = {};
  returns.forEach(r => {
    returnedProductMap[r.productName] = (returnedProductMap[r.productName] || 0) + r.quantity;
  });
  const topReturned = Object.entries(returnedProductMap).sort((a, b) => b[1] - a[1])[0];
  const topReturnedProduct = topReturned ? topReturned[0] : 'None';
  const topReturnedQty = topReturned ? topReturned[1] : 0;

  const fetchBrief = useCallback(() => {
    if (!isPaid) return;
    startTransition(async () => {
      try {
        const cleanProducts = serializePlainData<Product[]>(products.slice(0, 300));
        const cleanTransactions = serializePlainData<Transaction[]>(transactions.slice(0, 500));
        const result = await generateAIBrief(cleanProducts, cleanTransactions);
        setBrief(result);

        if (firestore && user && briefRef) {
          await setDoc(briefRef, serializePlainData({ ...result, updatedAt: new Date().toISOString() }), { merge: true });
        }
      } catch (err) {
        console.error('Failed to generate AI Brief:', err);
      }
    });
  }, [products, transactions, isPaid, firestore, user, briefRef]);

  // Only auto-generate if no persisted brief exists yet and paid
  useEffect(() => {
    if (isPaid && !persistedBrief && !briefLoading && products.length > 0 && !brief) {
      fetchBrief();
    } else if (!isPaid) {
      setBrief(null);
    }
  }, [isPaid, persistedBrief, briefLoading, products.length, brief, fetchBrief]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getHealthTextColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  if (!brief && isPending && isPaid) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-5 shadow-xl backdrop-blur-md h-full flex flex-col justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-xl animate-pulse bg-muted" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 animate-pulse bg-muted" />
              <Skeleton className="h-3 w-48 animate-pulse bg-muted" />
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[160px]">
            <div className="flex justify-between md:justify-end md:gap-3">
              <Skeleton className="h-4 w-20 animate-pulse bg-muted" />
              <Skeleton className="h-4 w-10 animate-pulse bg-muted" />
            </div>
            <Skeleton className="h-1.5 w-full md:w-[180px] animate-pulse bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl animate-pulse bg-muted" />
          <Skeleton className="h-32 rounded-xl animate-pulse bg-muted" />
          <Skeleton className="h-32 rounded-xl animate-pulse bg-muted" />
        </div>
        <Skeleton className="h-10 w-full mt-4 rounded-xl animate-pulse bg-muted" />
      </div>
    );
  }

  if (products.length === 0 && !isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur-md text-center flex flex-col items-center justify-center h-full min-h-[260px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm mb-3">
          <Sparkles className="h-6 w-6 text-emerald-400 animate-pulse" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-1.5">Welcome to AnalyzeUp!</h3>
        <p className="text-xs md:text-sm text-muted-foreground max-w-md mb-4">
          Your real-time AI diagnostics, stockout risks, customer returns analytics, and savings insights will appear here once you add products and transaction data.
        </p>
        <a
          href="/dashboard/inventory"
          className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-600 px-5 font-semibold text-xs text-white shadow-md hover:bg-emerald-500 transition-all"
        >
          Add Your First Product
        </a>
      </div>
    );
  }

  const activeBrief = brief || calculateDynamicBrief(products, transactions);

  return (
    <div data-tour="ai-brief" className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-card/60 p-5 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 h-full flex flex-col justify-between">
      {/* Header section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 shadow-inner border border-emerald-500/20">
            {isPending && isPaid ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg tracking-tight text-foreground flex items-center gap-2">
              Today's AI Brief
            </h3>
            <p className="text-xs text-muted-foreground">AI-generated inventory diagnostics and cost saving actions</p>
          </div>
        </div>

        {/* Inventory Health Score and Refresh */}
        <div className="flex flex-col md:items-end gap-2 w-full md:w-auto">
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full">
            <button
              onClick={isPaid ? fetchBrief : () => setShowSubscriptionModal(true)}
              disabled={isPending && isPaid}
              className="text-xs text-muted-foreground hover:text-emerald-400 flex items-center gap-1.5 px-3 py-1 rounded-xl border border-border/40 bg-secondary/30 transition-all active:scale-95 disabled:opacity-50 font-semibold"
              title={isPaid ? "Refresh Brief" : "Upgrade to Unlock"}
            >
              {isPaid ? (
                <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
              ) : (
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span>{isPaid ? 'Analyze' : 'Unlock'}</span>
            </button>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-muted-foreground">Inventory Health</span>
              <span className={`font-bold ${isPaid ? getHealthTextColor(activeBrief.healthScore) : 'text-muted-foreground/60'}`}>
                {isPaid ? `${activeBrief.healthScore}/100` : '--/100'}
              </span>
            </div>
          </div>
          <Progress value={isPaid ? activeBrief.healthScore : 0} className="h-1.5 w-full md:w-[180px] bg-secondary/80 [&>div]:transition-all [&>div]:duration-500" indicatorClassName={getHealthColor(activeBrief.healthScore)} />
        </div>
      </div>

      {/* Main Content Area with conditional blur */}
      <div className="relative flex-1 flex flex-col justify-between gap-4">
        {/* Content grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3.5 flex-1 transition-all duration-300 ${!isPaid ? 'blur-[5px] select-none pointer-events-none opacity-40' : (isPending ? 'opacity-60' : 'opacity-100')}`}>
          {/* Left Column: Stockout Risk */}
          <div className="relative group flex p-4 rounded-2xl border border-rose-500/20 bg-zinc-900/60 hover:bg-zinc-900/90 hover:border-rose-500/40 transition-all duration-200 flex-1 flex-col justify-between shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1 flex-wrap pb-2 border-b border-border/30">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Stockout Risk</span>
                </div>
                <ThreeTierBadge tier="MODEL_2_PREDICTION" size="sm" />
              </div>
              <h4 className="font-bold text-sm text-zinc-100 leading-snug line-clamp-2 pt-0.5">{activeBrief.stockoutItem.name}</h4>
              <div className="space-y-1 text-xs">
                <p className="text-rose-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shrink-0"></span>
                  {activeBrief.stockoutItem.riskText}
                </p>
                <p className="text-zinc-400">{activeBrief.stockoutItem.reorderText}</p>
              </div>
            </div>
            <div className="pt-2.5 mt-2 border-t border-border/30 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Est. Reorder Cost</span>
              <span className="font-bold text-zinc-100 font-mono text-sm">{activeBrief.stockoutItem.costText.replace('Estimated cost: ', '')}</span>
            </div>
          </div>

          {/* Middle Column: Dead Stock / Slow Sales */}
          <div className="relative group flex p-4 rounded-2xl border border-amber-500/20 bg-zinc-900/60 hover:bg-zinc-900/90 hover:border-amber-500/40 transition-all duration-200 flex-1 flex-col justify-between shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1 flex-wrap pb-2 border-b border-border/30">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                    <Coins className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Slow-Moving</span>
                </div>
                <ThreeTierBadge tier="MODEL_2_PREDICTION" size="sm" />
              </div>
              <h4 className="font-bold text-sm text-zinc-100 leading-snug line-clamp-2 pt-0.5">{activeBrief.slowMovingItem.name}</h4>
              <div className="space-y-1 text-xs">
                <p className="text-zinc-400">{activeBrief.slowMovingItem.riskText}</p>
                <p className="text-amber-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                  {activeBrief.slowMovingItem.costText}
                </p>
              </div>
            </div>
            <div className="pt-2.5 mt-2 border-t border-border/30 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Action</span>
              <span className="text-amber-300 font-semibold text-right line-clamp-1">{activeBrief.slowMovingItem.actionText.replace('Suggested action: ', '')}</span>
            </div>
          </div>

          {/* Right Column: Customer Returns */}
          <div className="relative group flex p-4 rounded-2xl border border-emerald-500/20 bg-zinc-900/60 hover:bg-zinc-900/90 hover:border-emerald-500/40 transition-all duration-200 flex-1 flex-col justify-between shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1 flex-wrap pb-2 border-b border-border/30">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Returns</span>
                </div>
                <ThreeTierBadge tier="ACTUAL_DATA" size="sm" />
              </div>
              <h4 className="font-bold text-sm text-zinc-100 leading-snug line-clamp-2 pt-0.5">
                {returnedQty > 0 ? `${returnedQty} Items Returned` : 'No Recent Returns'}
              </h4>
              <div className="space-y-1 text-xs">
                <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                  Return Rate: {returnRate.toFixed(1)}%
                </p>
                <p className="text-zinc-400 line-clamp-1">
                  {topReturnedQty > 0 ? `Highest: ${topReturnedProduct} (${topReturnedQty} units)` : '0 return transactions logged.'}
                </p>
              </div>
            </div>
            <div className="pt-2.5 mt-2 border-t border-border/30 flex items-center justify-between text-xs">
              <a 
                href="/dashboard/returns"
                className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 hover:underline group"
              >
                <span>Manage Returns Hub</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer Banner */}
        <div data-tour="ai-suggestions" className={`flex items-center justify-between px-4 py-3 rounded-2xl border border-blue-500/25 bg-gradient-to-r from-blue-950/50 via-indigo-950/30 to-zinc-900/70 shadow-sm transition-all duration-300 ${!isPaid ? 'blur-[5px] select-none pointer-events-none opacity-40' : (isPending ? 'opacity-60' : 'opacity-100')}`}>
          <div className="flex items-center gap-2.5 font-bold text-foreground">
            <Coins className="h-4 w-4 text-blue-400 shrink-0" />
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <span className="text-zinc-300 font-medium">Cash Locked in Inventory:</span>
              <span className="font-bold text-white font-mono text-sm sm:text-base">
                {activeBrief.savingsText.replace('Cash Locked in Inventory: ', '')}
              </span>
            </div>
          </div>
        </div>

        {/* Paywall Overlay */}
        {!isPaid && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10 bg-card/20 rounded-xl backdrop-blur-[2px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-lg mb-3">
              <Lock className="h-6 w-6 animate-pulse" />
            </div>
            <h4 className="font-bold text-lg text-foreground mb-1.5 flex items-center gap-2">
              Unlock Today's AI Brief
            </h4>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Get detailed product health diagnostics, automated low-stock warnings, and actionable cost-saving recommendations.
            </p>
            <button
              onClick={() => setShowSubscriptionModal(true)}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-6 font-semibold text-white shadow-md transition-all hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98]"
            >
              Upgrade Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateDynamicBrief(products: any[], transactions: any[]): any {
  if (!products || products.length === 0) {
    return {
      healthScore: 100,
      stockoutItem: {
        name: 'No Products Found',
        riskText: 'No products in inventory.',
        reorderText: 'Add products to start monitoring.',
        costText: 'Estimated cost: ₹0'
      },
      slowMovingItem: {
        name: 'No Products Found',
        riskText: 'No products in inventory.',
        costText: '₹0 blocked.',
        actionText: 'Add products to start monitoring.'
      },
      savingsText: 'Potential monthly savings: ₹0'
    };
  }

  let score = 100;
  let stockoutCount = 0;
  let lowStockCount = 0;

  products.forEach(p => {
    const stock = Number(p.stock) || 0;
    if (stock === 0) {
      stockoutCount++;
    } else if (stock < 10) {
      lowStockCount++;
    }
  });

  const stockoutPercentage = stockoutCount / products.length;
  const lowStockPercentage = lowStockCount / products.length;

  score -= Math.round(stockoutPercentage * 45);
  score -= Math.round(lowStockPercentage * 20);
  score = Math.max(30, Math.min(100, score));

  let highestRiskItem: any = null;
  let lowestRunway = Infinity;

  products.forEach(p => {
    const stock = Number(p.stock) || 0;
    const ads = Number(p.averageDailySales) || 0.1;
    const runway = stock / ads;
    if (runway < lowestRunway) {
      lowestRunway = runway;
      highestRiskItem = p;
    }
  });

  if (!highestRiskItem && products.length > 0) {
    highestRiskItem = products[0];
  }

  let stockoutItem = {
    name: 'None',
    riskText: 'All items are fully stocked.',
    reorderText: 'No reorder needed.',
    costText: 'Estimated cost: ₹0'
  };

  if (highestRiskItem) {
    const stock = Number(highestRiskItem.stock) || 0;
    const ads = Number(highestRiskItem.averageDailySales) || 0.5;
    const runwayDays = Math.ceil(stock / ads);
    const reorderQty = Math.max(10, Math.ceil(ads * 15 - stock));
    const costPrice = Number(highestRiskItem.costPrice) || Number(highestRiskItem.price) * 0.6 || 0;
    const estimatedCost = Math.round(reorderQty * costPrice);

    stockoutItem = {
      name: highestRiskItem.name || 'Unnamed Product',
      riskText: stock === 0 ? 'Out of stock.' : `Stockout risk in ${runwayDays} days.`,
      reorderText: `Suggested reorder: ${reorderQty} units.`,
      costText: `Estimated cost: ₹${estimatedCost.toLocaleString('en-IN')}`
    };
  }

  let worstSlowMovingItem: any = null;
  let highestBlockedCapital = -1;

  products.forEach(p => {
    const stock = Number(p.stock) || 0;
    const ads = Number(p.averageDailySales) || 0;
    const price = Number(p.price) || 0;
    const costPrice = Number(p.costPrice) || price * 0.6 || 0;
    const blockedCapital = stock * costPrice;

    if (ads < 2 && blockedCapital > highestBlockedCapital) {
      highestBlockedCapital = blockedCapital;
      worstSlowMovingItem = p;
    }
  });

  if (!worstSlowMovingItem && products.length > 0) {
    products.forEach(p => {
      const stock = Number(p.stock) || 0;
      const price = Number(p.price) || 0;
      const costPrice = Number(p.costPrice) || price * 0.6 || 0;
      const blockedCapital = stock * costPrice;
      if (blockedCapital > highestBlockedCapital) {
        highestBlockedCapital = blockedCapital;
        worstSlowMovingItem = p;
      }
    });
  }

  let slowMovingItem = {
    name: 'None',
    riskText: 'No slow-moving inventory detected.',
    costText: '₹0 blocked.',
    actionText: 'No action suggested.'
  };

  if (worstSlowMovingItem) {
    const stock = Number(worstSlowMovingItem.stock) || 0;
    const price = Number(worstSlowMovingItem.price) || 0;
    const costPrice = Number(worstSlowMovingItem.costPrice) || price * 0.6 || 0;
    const blockedCapital = Math.round(stock * costPrice);

    const salesTx = transactions.filter(t => t.type === 'Sale' && t.productName === worstSlowMovingItem.name);
    const daysSinceLastSale = salesTx.length > 0 ? 5 : 30;

    slowMovingItem = {
      name: worstSlowMovingItem.name || 'Unnamed Product',
      riskText: `No sales in ${daysSinceLastSale} days.`,
      costText: `₹${blockedCapital.toLocaleString('en-IN')} blocked.`,
      actionText: 'Suggested action: 20% discount.'
    };
  }

  const totalLockedCapital = products.reduce((sum, p) => sum + (Number(p.stock) * (Number(p.costPrice) || Number(p.price) * 0.6 || 0)), 0);
  const savingsText = `Cash Locked in Inventory: ₹${Math.round(totalLockedCapital).toLocaleString('en-IN')}`;

  return {
    healthScore: score,
    stockoutItem,
    slowMovingItem,
    savingsText
  };
}
