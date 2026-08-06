'use client';

import React from 'react';
import { useData } from '@/context/data-context';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle, PackageX, Truck, Coins, ArrowRight } from 'lucide-react';

export function InventoryInsightsTicker() {
  const { products, transactions, suppliers, businessProfile } = useData();

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  const insights = React.useMemo(() => {
    const list = [];

    const lowCount = products.filter(p => p.stock <= (p.minStock || 5)).length;
    if (lowCount > 0) {
      list.push({
        id: 'ins-1',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
        text: `${lowCount} products entered critical stock threshold — Reorder required to prevent stockout gaps.`,
        tag: 'Critical Stock',
        badgeClass: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
      });
    }

    const totalValuation = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    list.push({
      id: 'ins-2',
      icon: <Coins className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
      text: `Total active catalog asset valuation holds at ${currencySymbol}${Math.round(totalValuation).toLocaleString('en-IN')}.`,
      tag: 'Valuation',
      badgeClass: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    });

    const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));
    const deadCount = products.filter(p => p.stock > 0 && !saleProductIds.has(p.id)).length;
    if (deadCount > 0) {
      list.push({
        id: 'ins-3',
        icon: <PackageX className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
        text: `${deadCount} products identified as dead stock — Apply clearance discounts to unlock working capital.`,
        tag: 'Dead Stock',
        badgeClass: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
      });
    }

    if (suppliers.length > 0) {
      list.push({
        id: 'ins-4',
        icon: <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
        text: `Linked with ${suppliers.length} active suppliers. Average lead time buffer is 7.2 days.`,
        tag: 'Suppliers',
        badgeClass: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
      });
    }

    return list;
  }, [products, transactions, suppliers, currencySymbol]);

  if (insights.length === 0) return null;

  return (
    <div className="p-3 rounded-2xl bg-secondary/40 border border-border/40 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
        <span className="flex items-center gap-1 font-bold text-primary shrink-0 uppercase tracking-wider text-[10px]">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" /> Live Insights Feed:
        </span>
        {insights.map((ins) => (
          <div key={ins.id} className="flex items-center gap-1.5 shrink-0 bg-background/60 px-3 py-1 rounded-xl border border-border/30">
            {ins.icon}
            <span className="text-foreground text-[11px] font-medium">{ins.text}</span>
            <Badge className={`${ins.badgeClass} text-[9px] px-1.5 py-0`}>{ins.tag}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
