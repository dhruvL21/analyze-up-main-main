'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useData } from '@/context/data-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  AlertTriangle,
  PackageX,
  Truck,
  Coins,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function InventoryInsightsTicker() {
  const { products, transactions, suppliers, businessProfile } = useData();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  const insights = React.useMemo(() => {
    const list = [];

    const lowCount = products.filter((p) => p.stock <= (p.minStock || 5)).length;
    if (lowCount > 0) {
      list.push({
        id: 'ins-1',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
        text: `${lowCount} products entered critical stock threshold — Reorder required to prevent stockout gaps.`,
        tag: 'Critical Stock',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      });
    }

    const totalValuation = products.reduce((sum, p) => sum + p.stock * p.price, 0);
    list.push({
      id: 'ins-2',
      icon: <Coins className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
      text: `Total active catalog asset valuation holds at ${currencySymbol}${Math.round(totalValuation).toLocaleString('en-IN')}.`,
      tag: 'Valuation',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    });

    const saleProductIds = new Set(transactions.filter((t) => t.type === 'Sale').map((t) => t.productId));
    const deadCount = products.filter((p) => p.stock > 0 && !saleProductIds.has(p.id)).length;
    if (deadCount > 0) {
      list.push({
        id: 'ins-3',
        icon: <PackageX className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
        text: `${deadCount} products identified as dead stock — Apply clearance discounts to unlock working capital.`,
        tag: 'Dead Stock',
        badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      });
    }

    if (suppliers.length > 0) {
      list.push({
        id: 'ins-4',
        icon: <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
        text: `Linked with ${suppliers.length} active suppliers. Average lead time buffer is 7.2 days.`,
        tag: 'Suppliers',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      });
    }

    return list;
  }, [products, transactions, suppliers, currencySymbol]);

  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScrollability, { passive: true });
    window.addEventListener('resize', checkScrollability);

    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [checkScrollability, insights]);

  const scrollByAmount = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: offset,
        behavior: 'smooth',
      });
    }
  };

  if (insights.length === 0) return null;

  return (
    <div className="relative p-2.5 sm:p-3 rounded-2xl bg-secondary/40 border border-border/40 backdrop-blur-md flex items-center justify-between gap-2.5 text-xs group">
      {/* Label on Left */}
      <span className="flex items-center gap-1.5 font-bold text-emerald-400 shrink-0 uppercase tracking-wider text-[10px] pl-1 pr-1 border-r border-border/40 whitespace-nowrap">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="hidden sm:inline">Live Insights Feed:</span>
        <span className="sm:hidden">Live:</span>
      </span>

      {/* Horizontal Scroll Area */}
      <div className="relative flex-1 min-w-0 overflow-hidden">
        {/* Left Fade Gradient */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/90 to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
        >
          {insights.map((ins) => (
            <div
              key={ins.id}
              className="flex items-center gap-1.5 shrink-0 bg-background/60 hover:bg-background/90 px-3 py-1.5 rounded-xl border border-border/30 transition-colors shadow-xs"
            >
              {ins.icon}
              <span className="text-foreground text-[11px] font-medium whitespace-nowrap">{ins.text}</span>
              <Badge className={`${ins.badgeClass} text-[9px] px-1.5 py-0 font-bold shrink-0`}>
                {ins.tag}
              </Badge>
            </div>
          ))}
        </div>

        {/* Right Fade Gradient */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/90 to-transparent z-10 pointer-events-none" />
        )}
      </div>

      {/* Interactive Navigation Arrows */}
      <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-border/40">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => scrollByAmount(-280)}
          disabled={!canScrollLeft}
          className={`h-7 w-7 rounded-lg transition-all ${
            canScrollLeft
              ? 'text-foreground hover:bg-secondary hover:text-foreground active:scale-95'
              : 'text-muted-foreground/30 opacity-40 cursor-not-allowed'
          }`}
          title="Scroll to previous insight"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => scrollByAmount(280)}
          disabled={!canScrollRight}
          className={`h-7 w-7 rounded-lg transition-all ${
            canScrollRight
              ? 'text-foreground hover:bg-secondary hover:text-foreground active:scale-95'
              : 'text-muted-foreground/30 opacity-40 cursor-not-allowed'
          }`}
          title="Scroll to next insight"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
