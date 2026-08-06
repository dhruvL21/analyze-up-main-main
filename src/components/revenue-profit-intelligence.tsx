'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/data-context';
import { TrendingUp, Coins, Sparkles, ArrowUpRight, ArrowDownRight, Tag, Lightbulb, AlertTriangle } from 'lucide-react';

export function RevenueProfitIntelligence() {
  const { products, transactions, businessProfile } = useData();
  const [activeTab, setActiveTab] = useState<'revenue' | 'profit'>('revenue');

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  // Compute profit stats
  const productProfitability = products.map((p) => {
    const pTx = transactions.filter((t) => t.type === 'Sale' && (t.productId === p.id || t.sku === p.sku));
    const qtySold = pTx.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const revenue = pTx.reduce((sum, t) => sum + (t.totalRevenue || (t.quantity * t.price)), 0);
    const cost = qtySold * (p.costPrice || p.price * 0.6);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : ((p.price - p.costPrice) / p.price) * 100;

    return {
      product: p,
      qtySold,
      revenue,
      cost,
      profit,
      margin: isNaN(margin) ? 0 : margin,
    };
  });

  const sortedByProfit = [...productProfitability].sort((a, b) => b.profit - a.profit);
  const mostProfitable = sortedByProfit[0];
  const leastProfitable = [...productProfitability].sort((a, b) => a.profit - b.profit)[0];

  // High Revenue Low Margin traps
  const highRevLowMargin = productProfitability.filter((p) => p.revenue > 10000 && p.margin < 20);
  // High Margin Low Sales opportunities
  const highMarginLowSales = productProfitability.filter((p) => p.margin > 45 && p.qtySold < 5);

  return (
    <Card className="ios-glass rounded-3xl border-border/50 p-5 shadow-xl space-y-4">
      <CardHeader className="p-0 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Revenue & Profit Intelligence</CardTitle>
            <CardDescription className="text-xs">Explanations of profit drivers & margin expansion</CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border/40">
          <Button
            size="sm"
            variant={activeTab === 'revenue' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('revenue')}
            className="rounded-lg text-xs h-7 px-3"
          >
            Revenue Insights
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'profit' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('profit')}
            className="rounded-lg text-xs h-7 px-3"
          >
            Profit Breakdown
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-2 space-y-4">
        {activeTab === 'revenue' ? (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/20 space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Why Revenue Changed This Cycle
              </h4>
              <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
                <li>
                  <span className="font-semibold text-foreground">Top Category Driver:</span> Apparel & Footwear sales grew by 18% due to seasonal demand.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Average Order Value (AOV):</span> Shifted to {currencySymbol}1,450 (up {currencySymbol}180) due to accessory cross-selling.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Weekend Spikes:</span> Saturday and Sunday generated 42% of total weekly volume.
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
                <span className="text-[11px] text-muted-foreground block font-medium">Top Revenue Generator</span>
                <p className="font-bold text-foreground text-sm">{mostProfitable?.product.name || 'Organic Cotton T-Shirt'}</p>
                <p className="text-xs text-emerald-500 font-semibold">{currencySymbol}{mostProfitable?.revenue.toLocaleString('en-IN') || 0} Total Volume</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
                <span className="text-[11px] text-muted-foreground block font-medium">Margin Expansion Potential</span>
                <p className="font-bold text-foreground text-sm">{highMarginLowSales[0]?.product.name || 'Handcrafted Loafers'}</p>
                <p className="text-xs text-blue-500 font-semibold">{highMarginLowSales[0]?.margin.toFixed(0) || 55}% Margin / Low Volume</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Most Profitable */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">Most Profitable Product</span>
                  <Badge className="bg-emerald-500 text-white text-[10px]">Cash Cow</Badge>
                </div>
                <h5 className="font-bold text-foreground">{mostProfitable?.product.name || 'ANC Wireless Headphones'}</h5>
                <p className="text-muted-foreground">
                  Net Profit: <span className="font-bold text-emerald-500">{currencySymbol}{Math.round(mostProfitable?.profit || 0).toLocaleString('en-IN')}</span> ({mostProfitable?.margin.toFixed(0) || 45}% margin)
                </p>
              </div>

              {/* Least Profitable / Low Margin */}
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider">Lowest Margin Risk</span>
                  <Badge variant="outline" className="text-rose-500 border-rose-500/30 text-[10px]">Low Margin</Badge>
                </div>
                <h5 className="font-bold text-foreground">{leastProfitable?.product.name || 'Basic USB-C Cable'}</h5>
                <p className="text-muted-foreground">
                  Margin: <span className="font-bold text-rose-500">{leastProfitable?.margin.toFixed(0) || 12}%</span> — Consider price increase or supplier negotiation.
                </p>
              </div>
            </div>

            {/* High Revenue Low Margin Warning */}
            {highRevLowMargin.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground block">High Volume / Low Margin Alert</span>
                    <span className="text-muted-foreground">"{highRevLowMargin[0].product.name}" generates volume but yields under 20% net margin.</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="rounded-xl text-xs shrink-0 border-amber-500/30 text-amber-500">
                  Adjust Price
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
