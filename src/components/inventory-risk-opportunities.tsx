'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/data-context';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Zap, ArrowRight, AlertTriangle, Sparkles, TrendingUp, Tag, Layers } from 'lucide-react';

export function InventoryRiskOpportunities() {
  const { products, transactions, suppliers, businessProfile } = useData();
  const router = useRouter();

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  // Detect Risks
  const stockoutRisk = products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 5));
  const overstockRisk = products.filter(p => p.stock >= (p.maxStock || 100));
  const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));
  const deadStock = products.filter(p => p.stock > 0 && !saleProductIds.has(p.id));

  // Detect Opportunities
  const bundleCandidates = products.filter(p => p.stock > 30 && p.price < 2000);
  const priceIncreaseCandidates = products.filter(p => (p.averageDailySales || 0) > 1.5 && p.price > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Risk Panel */}
      <Card className="ios-glass rounded-3xl border-border/50 p-5 shadow-xl space-y-3">
        <CardHeader className="p-0 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">Inventory Risk Panel</CardTitle>
              <CardDescription className="text-xs">Financial impact & imminent stockout risks</CardDescription>
            </div>
          </div>

          <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
            {stockoutRisk.length + deadStock.length} Issues
          </Badge>
        </CardHeader>

        <CardContent className="p-0 space-y-2.5 text-xs">
          {stockoutRisk.length > 0 && (
            <div className="p-3 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Stockout Risk: {stockoutRisk[0].name}
                </span>
                <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">High Impact</Badge>
              </div>
              <p className="text-muted-foreground">Only {stockoutRisk[0].stock} units remaining. Expected stockout in 3 days.</p>
              <p className="font-bold text-foreground">Est. Loss: {currencySymbol}{Math.round(stockoutRisk[0].price * 25).toLocaleString('en-IN')}</p>
            </div>
          )}

          {deadStock.length > 0 && (
            <div className="p-3 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Dead Capital Lockup
                </span>
                <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">{deadStock.length} SKUs</Badge>
              </div>
              <p className="text-muted-foreground">{deadStock[0].name} ({deadStock[0].stock} units) has zero sales history.</p>
              <p className="font-bold text-foreground">Tied Capital: {currencySymbol}{Math.round(deadStock[0].stock * (deadStock[0].costPrice || deadStock[0].price * 0.6)).toLocaleString('en-IN')}</p>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/dashboard/inventory')}
            className="w-full rounded-xl text-xs gap-1 border-border text-foreground hover:bg-secondary mt-1"
          >
            Resolve All Inventory Risks
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* AI Business Opportunities Panel */}
      <Card className="ios-glass rounded-3xl border-primary/20 p-5 shadow-xl space-y-3">
        <CardHeader className="p-0 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">AI Business Opportunities</CardTitle>
              <CardDescription className="text-xs">Growth drivers, price tweaks & cross-sales</CardDescription>
            </div>
          </div>

          <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
            Growth Active
          </Badge>
        </CardHeader>

        <CardContent className="p-0 space-y-2.5 text-xs">
          {priceIncreaseCandidates.length > 0 && (
            <div className="p-3 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Price Optimization
                </span>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">+8% Margin</Badge>
              </div>
              <p className="text-muted-foreground">Increase price of {priceIncreaseCandidates[0].name} from {currencySymbol}{priceIncreaseCandidates[0].price} to {currencySymbol}{Math.round(priceIncreaseCandidates[0].price * 1.08)}.</p>
              <p className="font-bold text-emerald-400">Unlocks +{currencySymbol}{Math.round(priceIncreaseCandidates[0].price * 0.08 * priceIncreaseCandidates[0].stock).toLocaleString('en-IN')} Profit</p>
            </div>
          )}

          {bundleCandidates.length > 0 && (
            <div className="p-3 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Bundle & Cross-Sell Opportunity
                </span>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">Bundle Deal</Badge>
              </div>
              <p className="text-muted-foreground">Bundle {bundleCandidates[0].name} with high-margin accessories for a 12% combo discount.</p>
              <p className="font-bold text-emerald-400">Estimated AOV Lift: +{currencySymbol}350</p>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => router.push('/dashboard/ai-advisor')}
            className="w-full rounded-xl text-xs gap-1 bg-primary text-primary-foreground shadow-md mt-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Explore All AI Growth Opportunities
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
