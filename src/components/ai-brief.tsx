'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useData } from '@/context/data-context';
import { Sparkles, AlertTriangle, Coins, Loader2, RefreshCw, Lock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generateAIBrief, AIBriefOutput } from '@/ai/flows/ai-brief-generator';
import { Skeleton } from '@/components/ui/skeleton';

export function AIBrief() {
  const { products, transactions, activePlan, setShowSubscriptionModal, returns = [], isLoading } = useData();
  const [brief, setBrief] = useState<AIBriefOutput | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPaid = activePlan !== 'Free Trial';

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
        const simplifiedProducts = products.map((p) => ({
          name: p.name,
          sku: p.sku || '',
          stock: p.stock || 0,
          price: p.price || 0,
          costPrice: p.costPrice || p.price * 0.6 || 0,
          averageDailySales: p.averageDailySales || 0,
          leadTimeDays: p.leadTimeDays || 7,
        }));

        const simplifiedTransactions = (transactions || []).slice(0, 30).map((t) => {
          // Format date safely as a string
          let dateStr = 'Recent';
          if (t.transactionDate) {
            if (typeof t.transactionDate === 'object' && t.transactionDate !== null && 'seconds' in t.transactionDate) {
              // It's a Firestore Timestamp
              dateStr = new Date((t.transactionDate as any).seconds * 1000).toLocaleDateString();
            } else if (t.transactionDate instanceof Date) {
              dateStr = t.transactionDate.toLocaleDateString();
            } else {
              dateStr = String(t.transactionDate);
            }
          }

          return {
            productName: t.productName || '',
            sku: t.sku || '',
            type: t.type,
            quantity: t.quantity || 0,
            price: t.price || 0,
            date: dateStr,
          };
        });

        const result = await generateAIBrief(simplifiedProducts, simplifiedTransactions);
        setBrief(result);
      } catch (err) {
        console.error('Failed to generate AI Brief:', err);
      }
    });
  }, [products, transactions, isPaid]);

  // Re-fetch AI brief when products or transactions change and plan is paid
  useEffect(() => {
    if (isPaid) {
      fetchBrief();
    } else {
      setBrief(null);
    }
  }, [isPaid, fetchBrief]);

  // Determine health color based on score
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-destructive';
  };

  const getHealthTextColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-destructive';
  };

  if (!brief && isPending && isPaid) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-4 mb-5">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-3.5 p-4 rounded-xl border border-border/30 bg-secondary/10">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg animate-pulse bg-muted" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-3 w-16 animate-pulse bg-muted" />
              <Skeleton className="h-4 w-1/2 animate-pulse bg-muted" />
              <Skeleton className="h-3.5 w-3/4 animate-pulse bg-muted" />
            </div>
          </div>
          <div className="flex gap-3.5 p-4 rounded-xl border border-border/30 bg-secondary/10">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg animate-pulse bg-muted" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-3 w-24 animate-pulse bg-muted" />
              <Skeleton className="h-4 w-1/2 animate-pulse bg-muted" />
              <Skeleton className="h-3.5 w-3/4 animate-pulse bg-muted" />
            </div>
          </div>
          <div className="flex gap-3.5 p-4 rounded-xl border border-border/30 bg-secondary/10">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg animate-pulse bg-muted" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-3 w-24 animate-pulse bg-muted" />
              <Skeleton className="h-4 w-1/2 animate-pulse bg-muted" />
              <Skeleton className="h-3.5 w-3/4 animate-pulse bg-muted" />
            </div>
          </div>
        </div>
        <Skeleton className="h-12 w-full mt-5 rounded-xl animate-pulse bg-muted" />
      </div>
    );
  }

  if (products.length === 0 && !isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-8 shadow-xl backdrop-blur-md text-center flex flex-col items-center justify-center min-h-[220px]">
        {/* Decorative top gradient glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/10 blur-[80px]" />
        
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-sm mb-4">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-1.5">Welcome to AnalyzeUp!</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-5">
          Your real-time AI diagnostics, stockout risks, customer returns analytics, and savings insights will appear here once you add products and transaction data.
        </p>
        <a
          href="/dashboard/inventory"
          className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-5 font-semibold text-xs text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
        >
          Add Your First Product
        </a>
      </div>
    );
  }

  // Fallback if data loading failed completely or while loading initial state
  const activeBrief = brief || calculateDynamicBrief(products, transactions);

  return (
    <div data-tour="ai-brief" className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-primary/40 scroll-reveal-item revealed">
      {/* Decorative top gradient glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/10 blur-[80px]" />
      <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/5 blur-[80px]" />

      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-inner">
            {isPending && isPaid ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
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
        <div className="flex flex-col md:items-end gap-2.5 w-full md:w-auto">
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full">
            <button
              onClick={isPaid ? fetchBrief : () => setShowSubscriptionModal(true)}
              disabled={isPending && isPaid}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/30 bg-secondary/20 transition-all active:scale-95 disabled:opacity-50"
              title={isPaid ? "Refresh Brief" : "Upgrade to Unlock"}
            >
              {isPaid ? (
                <RefreshCw className={`h-3 w-3 ${isPending ? 'animate-spin' : ''}`} />
              ) : (
                <Lock className="h-3 w-3 text-primary" />
              )}
              <span>{isPaid ? 'Analyze' : 'Unlock'}</span>
            </button>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-medium text-muted-foreground">Inventory Health</span>
              <span className={`font-bold ${isPaid ? getHealthTextColor(activeBrief.healthScore) : 'text-muted-foreground/60'}`}>
                {isPaid ? `${activeBrief.healthScore}/100` : '--/100'}
              </span>
            </div>
          </div>
          <Progress value={isPaid ? activeBrief.healthScore : 0} className="h-1.5 w-full md:w-[180px] bg-secondary/80 [&>div]:transition-all [&>div]:duration-500" indicatorClassName={getHealthColor(activeBrief.healthScore)} />
        </div>
      </div>

      {/* Main Content Area with conditional blur */}
      <div className="relative">
        {/* Content grid */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-300 ${!isPaid ? 'blur-[5px] select-none pointer-events-none opacity-40' : (isPending ? 'opacity-60' : 'opacity-100')}`}>
          {/* Left Column: Stockout Risk */}
          <div className="relative group flex gap-3.5 p-4 rounded-xl border border-border/30 bg-secondary/20 hover:bg-secondary/30 transition-all duration-200 min-h-[140px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-500/80">Stockout Risk</span>
              <h4 className="font-bold text-base text-foreground truncate">{activeBrief.stockoutItem.name}</h4>
              <div className="space-y-1 mt-1 text-sm">
                <p className="text-amber-400 font-medium">{activeBrief.stockoutItem.riskText}</p>
                <p className="text-muted-foreground">{activeBrief.stockoutItem.reorderText}</p>
                <p className="text-muted-foreground font-semibold">{activeBrief.stockoutItem.costText}</p>
              </div>
            </div>
          </div>

          {/* Middle Column: Dead Stock / Slow Sales */}
          <div className="relative group flex gap-3.5 p-4 rounded-xl border border-border/30 bg-secondary/20 hover:bg-secondary/30 transition-all duration-200 min-h-[140px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Coins className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Slow-Moving Inventory</span>
              <h4 className="font-bold text-base text-foreground truncate">{activeBrief.slowMovingItem.name}</h4>
              <div className="space-y-1 mt-1 text-sm">
                <p className="text-muted-foreground">{activeBrief.slowMovingItem.riskText}</p>
                <p className="text-emerald-400 font-semibold">{activeBrief.slowMovingItem.costText}</p>
                <p className="text-primary font-medium">{activeBrief.slowMovingItem.actionText}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Customer Returns */}
          <div className="relative group flex gap-3.5 p-4 rounded-xl border border-border/30 bg-secondary/20 hover:bg-secondary/30 transition-all duration-200 min-h-[140px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col gap-1 min-w-0 w-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Customer Returns</span>
              <h4 className="font-bold text-base text-foreground truncate">
                {returnedQty > 0 ? `${returnedQty} Items Returned` : 'No Recent Returns'}
              </h4>
              <div className="space-y-1 mt-1 text-sm">
                <p className="text-primary font-medium">Return Rate: {returnRate.toFixed(1)}%</p>
                <p className="text-muted-foreground truncate">
                  {topReturnedQty > 0 ? `Highest: ${topReturnedProduct} (${topReturnedQty} units)` : '0 return transactions logged.'}
                </p>
                <a 
                  href="/dashboard/returns"
                  className="text-primary hover:underline font-semibold block pt-0.5 text-xs"
                >
                  Manage Returns Hub &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Banner */}
        <div data-tour="ai-suggestions" className={`mt-5 flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm font-semibold transition-all duration-300 ${!isPaid ? 'blur-[5px] select-none pointer-events-none opacity-40' : (isPending ? 'opacity-60' : 'opacity-100')}`}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{activeBrief.savingsText}</span>
          </div>
          <span className="text-xs font-medium text-emerald-500/70 hidden sm:inline">Optimized via AI Copilot</span>
        </div>

        {/* Paywall Overlay */}
        {!isPaid && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10 bg-card/20 rounded-xl backdrop-blur-[2px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-lg mb-3">
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
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
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

  // 1. Calculate Health Score
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

  // 2. Identify Stockout Risk Item
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

  // 3. Identify Slow-Moving Item
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
      actionText: 'Suggested action: 15% discount.'
    };
  }

  // 4. Savings Text
  const savings = worstSlowMovingItem ? Math.round((Number(worstSlowMovingItem.stock) * (Number(worstSlowMovingItem.costPrice) || Number(worstSlowMovingItem.price) * 0.6 || 0)) * 0.15) : 0;
  const savingsText = `Potential monthly savings: ₹${(savings || 1500).toLocaleString('en-IN')}`;

  return {
    healthScore: score,
    stockoutItem,
    slowMovingItem,
    savingsText
  };
}
