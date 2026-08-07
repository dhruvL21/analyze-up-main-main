'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/data-context';
import { computeProductIntelligence } from '@/lib/product-intelligence-engine';
import { ArrowRightLeft, Sparkles, TrendingUp, DollarSign, Package } from 'lucide-react';

interface ProductComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductComparisonModal({ open, onOpenChange }: ProductComparisonModalProps) {
  const { products, transactions, returns, businessProfile } = useData();

  const [prodIdA, setProdIdA] = useState<string>(products[0]?.id || '');
  const [prodIdB, setProdIdB] = useState<string>(products[1]?.id || products[0]?.id || '');

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  const productA = products.find(p => p.id === prodIdA) || products[0];
  const productB = products.find(p => p.id === prodIdB) || products[1] || products[0];

  const reportA = productA ? computeProductIntelligence(productA, transactions, returns) : null;
  const reportB = productB ? computeProductIntelligence(productB, transactions, returns) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto ios-glass p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Product Decision Comparison Engine
          </DialogTitle>
          <DialogDescription className="text-xs">
            Compare two products side-by-side across sales velocity, profit margins, turnover, and AI recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-secondary/30 p-3 rounded-2xl border border-border/40">
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground block text-[11px]">Select Product A</span>
              <Select value={prodIdA} onValueChange={setProdIdA}>
                <SelectTrigger className="rounded-xl bg-background">
                  <SelectValue placeholder="Choose Product A" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground block text-[11px]">Select Product B</span>
              <Select value={prodIdB} onValueChange={setProdIdB}>
                <SelectTrigger className="rounded-xl bg-background">
                  <SelectValue placeholder="Choose Product B" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison Cards */}
          {reportA && reportB && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product A Card */}
              <div className="p-4 rounded-2xl bg-secondary/40 border border-primary/30 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div>
                    <Badge className="bg-primary text-primary-foreground text-[10px] mb-1">Grade {reportA.performanceGrade}</Badge>
                    <h4 className="font-bold text-foreground text-sm">{productA.name}</h4>
                  </div>
                  <Badge className={`${reportA.badgeClass} text-[10px]`}>{reportA.healthStatus}</Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock Level</span>
                    <span className="font-bold">{productA.stock} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selling Price</span>
                    <span className="font-bold">{currencySymbol}{productA.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit Margin</span>
                    <span className="font-bold text-emerald-400">{reportA.profitMarginPercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Sales Velocity</span>
                    <span className="font-bold">{reportA.averageDailySales} units/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock Runway</span>
                    <span className="font-bold">{reportA.daysOfStockRemaining} days</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-background/60 border border-border/40 space-y-1">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">AI Takeaway</span>
                  <p className="text-[11px] text-muted-foreground">{reportA.executiveSummary}</p>
                </div>
              </div>

              {/* Product B Card */}
              <div className="p-4 rounded-2xl bg-secondary/40 border border-primary/30 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div>
                    <Badge className="bg-primary text-primary-foreground text-[10px] mb-1">Grade {reportB.performanceGrade}</Badge>
                    <h4 className="font-bold text-foreground text-sm">{productB.name}</h4>
                  </div>
                  <Badge className={`${reportB.badgeClass} text-[10px]`}>{reportB.healthStatus}</Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock Level</span>
                    <span className="font-bold">{productB.stock} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selling Price</span>
                    <span className="font-bold">{currencySymbol}{productB.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit Margin</span>
                    <span className="font-bold text-emerald-400">{reportB.profitMarginPercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Sales Velocity</span>
                    <span className="font-bold">{reportB.averageDailySales} units/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock Runway</span>
                    <span className="font-bold">{reportB.daysOfStockRemaining} days</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-background/60 border border-border/40 space-y-1">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">AI Takeaway</span>
                  <p className="text-[11px] text-muted-foreground">{reportB.executiveSummary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Trade-off Verdict */}
          {reportA && reportB && (
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Sparkles className="w-4 h-4 text-primary" /> AI Comparison Decision Verdict
              </span>
              <p className="text-xs text-muted-foreground">
                {reportA.profitMarginPercent > reportB.profitMarginPercent
                  ? `"${productA.name}" yields higher profit margins (${reportA.profitMarginPercent}% vs ${reportB.profitMarginPercent}%), while "${productB.name}" provides steady sales volume.`
                  : `"${productB.name}" yields higher profit margins (${reportB.profitMarginPercent}% vs ${reportA.profitMarginPercent}%), while "${productA.name}" provides faster turnover.`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button variant="secondary" className="rounded-xl">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
