'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/data-context';
import {
  Trophy,
  TrendingUp,
  AlertTriangle,
  Coins,
  Sparkles,
  Zap,
  Layers,
  HelpCircle
} from 'lucide-react';

export function RevenueProfitIntelligence() {
  const { products = [], transactions = [], businessProfile } = useData();
  const [activeTab, setActiveTab] = useState<'revenue' | 'profit' | 'performance'>('profit');

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  // Calculate Product Financial Metrics strictly from context
  const productMetrics = React.useMemo(() => {
    return products.map((p) => {
      const pSales = transactions.filter((t) => t.type === 'Sale' && (t.productId === p.id || t.sku === p.sku));
      const qtySold = pSales.reduce((sum, t) => sum + (t.quantity || 0), 0);
      const revenue = pSales.reduce((sum, t) => sum + (t.totalRevenue || (t.quantity * (t.price || 0))), 0);
      
      const unitCost = p.costPrice || p.price * 0.6;
      const totalCost = qtySold * unitCost;
      const profit = revenue - totalCost;
      
      // Unit potential profit
      const unitProfit = p.price - unitCost;
      const unitMargin = p.price > 0 ? (unitProfit / p.price) * 100 : 0;
      const unitRoi = unitCost > 0 ? (unitProfit / unitCost) * 100 : 0;
      
      // Margin calculation
      const margin = revenue > 0 ? (profit / revenue) * 100 : unitMargin;
      
      // ROI calculation: Net Profit / Tied Inventory Capital Investment * 100
      const inventoryInvestment = (p.stock || 0) * unitCost;
      const roi = inventoryInvestment > 0 && profit > 0 ? (profit / inventoryInvestment) * 100 : unitRoi;
      
      // Inventory Turnover
      const turnover = (p.stock || 0) > 0 ? (qtySold / p.stock) : 0;

      return {
        product: p,
        qtySold,
        revenue,
        cost: totalCost,
        unitCost,
        unitProfit,
        unitMargin,
        unitRoi,
        profit,
        margin: isNaN(margin) ? 0 : margin,
        inventoryInvestment,
        roi: isNaN(roi) ? 0 : roi,
        turnover,
        asp: qtySold > 0 ? revenue / qtySold : p.price,
      };
    });
  }, [products, transactions]);

  // Overall Business Totals
  const totalBusinessProfit = productMetrics.reduce((sum, item) => sum + (item.profit > 0 ? item.profit : 0), 0);
  const totalBusinessRevenue = productMetrics.reduce((sum, item) => sum + item.revenue, 0);
  const hasActualSales = transactions.some(t => t.type === 'Sale');

  // 1. CARD 1: Highest Profit Product
  const sortedByProfit = [...productMetrics].sort((a, b) => {
    if (hasActualSales) return b.profit - a.profit;
    return b.unitProfit - a.unitProfit;
  });
  const highestProfitItem = sortedByProfit[0];

  // 2. CARD 2: Highest Revenue Product
  const sortedByRevenue = [...productMetrics].sort((a, b) => {
    if (hasActualSales) return b.revenue - a.revenue;
    return b.product.price - a.product.price;
  });
  const highestRevenueItem = sortedByRevenue[0];

  // 3. CARD 3: Lowest Margin Product
  const sortedByMargin = [...productMetrics].sort((a, b) => a.margin - b.margin);
  const lowestMarginItem = sortedByMargin[0];

  // 4. CARD 4: Highest ROI Product
  const sortedByRoi = [...productMetrics].sort((a, b) => {
    if (hasActualSales && a.profit > 0) return b.roi - a.roi;
    return b.unitRoi - a.unitRoi;
  });
  const highestRoiItem = sortedByRoi[0];

  const hasNoProducts = products.length === 0;

  return (
    <Card className="ios-glass rounded-3xl border-border/50 p-5 shadow-xl space-y-4 h-full flex flex-col justify-between">
      <div>
        {/* Header with 3 Tabs */}
        <CardHeader className="p-0 pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Revenue & Profit Intelligence</CardTitle>
              <CardDescription className="text-xs">Financial insights, margin expansion & product ROI</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border/40 shrink-0">
            <Button
              size="sm"
              variant={activeTab === 'revenue' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('revenue')}
              className="rounded-lg text-xs h-7 px-3"
            >
              Revenue
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'profit' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('profit')}
              className="rounded-lg text-xs h-7 px-3 font-semibold"
            >
              Profit
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'performance' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('performance')}
              className="rounded-lg text-xs h-7 px-3"
            >
              Product Performance
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 pt-3 space-y-4 text-xs">
          {hasNoProducts ? (
            <div className="p-6 text-center text-muted-foreground space-y-2">
              <HelpCircle className="w-8 h-8 mx-auto text-muted-foreground/60" />
              <p className="font-semibold text-foreground">No product data available in your app yet.</p>
              <p className="text-xs">Add products or import a CSV/Excel file to populate your executive financial intelligence board.</p>
            </div>
          ) : activeTab === 'profit' ? (
            /* PROFIT TAB: 4 FINANCIAL INTELLIGENCE CARDS */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* CARD 1: Highest Profit Product */}
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-emerald-500/30 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-emerald-400" /> Highest Profit Product
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      {hasActualSales && highestProfitItem.qtySold > 0 ? 'Top Performer' : 'Highest Potential'}
                    </Badge>
                  </div>

                  {highestProfitItem ? (
                    <div className="mt-2 space-y-1.5">
                      <h4 className="font-bold text-foreground text-sm">{highestProfitItem.product.name}</h4>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block">{hasActualSales ? 'Total Revenue' : 'Selling Price'}</span>
                          <span className="font-semibold text-foreground">
                            {currencySymbol}{Math.round(hasActualSales && highestProfitItem.revenue > 0 ? highestProfitItem.revenue : highestProfitItem.product.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">{hasActualSales ? 'Net Profit' : 'Unit Profit'}</span>
                          <span className="font-bold text-emerald-400">
                            {currencySymbol}{Math.round(hasActualSales && highestProfitItem.profit > 0 ? highestProfitItem.profit : highestProfitItem.unitProfit).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Profit Margin</span>
                          <span className="font-semibold text-emerald-400">{highestProfitItem.margin.toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Units Sold / Stock</span>
                          <span className="font-semibold text-foreground">
                            {highestProfitItem.qtySold} sold ({highestProfitItem.product.stock} in stock)
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground italic flex items-start gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    {hasActualSales && highestProfitItem.profit > 0
                      ? `Contributes ${totalBusinessProfit > 0 ? Math.round((highestProfitItem.profit / totalBusinessProfit) * 100) : 0}% of total profit with a healthy ${highestProfitItem.margin.toFixed(0)}% margin.`
                      : `Yields the highest unit profit (${currencySymbol}${Math.round(highestProfitItem.unitProfit)}) with a strong ${highestProfitItem.margin.toFixed(0)}% margin in your catalog.`}
                  </span>
                </div>
              </div>

              {/* CARD 2: Highest Revenue Product */}
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-primary/30 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" /> Highest Revenue Product
                    </span>
                    <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold">
                      {hasActualSales && highestRevenueItem.revenue > 0 ? 'Best Seller' : 'Catalog Leader'}
                    </Badge>
                  </div>

                  {highestRevenueItem ? (
                    <div className="mt-2 space-y-1.5">
                      <h4 className="font-bold text-foreground text-sm">{highestRevenueItem.product.name}</h4>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block">Revenue</span>
                          <span className="font-bold text-primary">
                            {currencySymbol}{Math.round(hasActualSales && highestRevenueItem.revenue > 0 ? highestRevenueItem.revenue : highestRevenueItem.product.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Units Sold</span>
                          <span className="font-semibold text-foreground">{highestRevenueItem.qtySold} units</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Avg Selling Price</span>
                          <span className="font-semibold text-foreground">{currencySymbol}{Math.round(highestRevenueItem.asp)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Stock Level</span>
                          <span className="font-semibold text-foreground">{highestRevenueItem.product.stock} units</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground italic flex items-start gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    {hasActualSales && highestRevenueItem.revenue > 0
                      ? `Generates highest sales revenue (${currencySymbol}${Math.round(highestRevenueItem.revenue).toLocaleString('en-IN')}). Monitor margin to maximize cash flow.`
                      : `Highest priced item (${currencySymbol}${highestRevenueItem.product.price}) in your imported catalog.`}
                  </span>
                </div>
              </div>

              {/* CARD 3: Lowest Margin Product */}
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-rose-500/30 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Lowest Margin Product
                    </span>
                    <Badge variant="outline" className="text-rose-400 border-rose-500/30 text-[10px] font-bold">
                      {lowestMarginItem && lowestMarginItem.margin < 0 ? 'Loss Making' : 'Needs Attention'}
                    </Badge>
                  </div>

                  {lowestMarginItem ? (
                    <div className="mt-2 space-y-1.5">
                      <h4 className="font-bold text-foreground text-sm">{lowestMarginItem.product.name}</h4>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block">Margin %</span>
                          <span className="font-bold text-rose-400">{lowestMarginItem.margin.toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Selling / Cost</span>
                          <span className="font-semibold text-foreground">
                            {currencySymbol}{lowestMarginItem.product.price} / {currencySymbol}{Math.round(lowestMarginItem.unitCost)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-amber-400 font-semibold pt-0.5">
                        Action: Increase price by 5-10% or negotiate supplier cost.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground italic flex items-start gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    Operating below target margins ({lowestMarginItem?.margin.toFixed(0)}%). Consider price tweaks or supplier negotiations.
                  </span>
                </div>
              </div>

              {/* CARD 4: Highest ROI Product */}
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-amber-500/30 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Highest ROI Product
                    </span>
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px] font-bold">
                      High ROI
                    </Badge>
                  </div>

                  {highestRoiItem ? (
                    <div className="mt-2 space-y-1.5">
                      <h4 className="font-bold text-foreground text-sm">{highestRoiItem.product.name}</h4>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block">Return on Investment</span>
                          <span className="font-bold text-amber-400">{highestRoiItem.roi.toFixed(0)}% ROI</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Tied Inventory Capital</span>
                          <span className="font-semibold text-foreground">{currencySymbol}{Math.round(highestRoiItem.inventoryInvestment).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Unit Profit</span>
                          <span className="font-semibold text-emerald-400">{currencySymbol}{Math.round(highestRoiItem.unitProfit)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Stock Turnover</span>
                          <span className="font-semibold text-foreground">{highestRoiItem.turnover.toFixed(1)}x</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground italic flex items-start gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Delivers the highest return ({highestRoiItem?.roi.toFixed(0)}% ROI) for every rupee invested in stock. Prioritize in reorders.
                  </span>
                </div>
              </div>
            </div>
          ) : activeTab === 'revenue' ? (
            /* REVENUE TAB */
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Revenue Drivers & Catalog Demand Insights
                </h4>
                <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
                  <li>
                    <span className="font-semibold text-foreground">Total Revenue Generated:</span> {currencySymbol}{Math.round(totalBusinessRevenue).toLocaleString('en-IN')} across active catalog transactions.
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">Top Catalog Asset:</span> {highestRevenueItem?.product.name || 'Catalog Item'} ({currencySymbol}{highestRevenueItem?.product.price}).
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">Active Products:</span> {products.length} items loaded in inventory.
                  </li>
                </ul>
              </div>

              <div className="divide-y divide-border/40 rounded-2xl border border-border/40 overflow-hidden bg-secondary/20">
                {productMetrics.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-secondary/40 transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-bold text-foreground text-xs">{item.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.product.stock} units in stock • Unit Cost: {currencySymbol}{Math.round(item.unitCost)}</p>
                    </div>
                    <span className="font-bold text-primary text-sm">{currencySymbol}{Math.round(item.product.price).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* PRODUCT PERFORMANCE TAB */
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-secondary/40 border border-border/40 space-y-2">
                <h4 className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                  <Layers className="w-4 h-4 text-primary" />
                  Executive Product Performance & Supplier Margin Impact
                </h4>
                <p className="text-muted-foreground">
                  Combined catalog view evaluating how supplier purchase costs directly impact product profit margins.
                </p>
                <div className="p-3 rounded-xl bg-background/60 border border-primary/20 text-[11px] space-y-1 font-mono text-primary">
                  <span>SUPPLIER ➔ PURCHASE COST ➔ PRODUCT COST ➔ PRODUCT MARGIN ➔ BUSINESS PROFIT ➔ AI RECOMMENDATION</span>
                </div>
              </div>

              <div className="divide-y divide-border/40 rounded-2xl border border-border/40 overflow-hidden bg-secondary/20 text-xs">
                {productMetrics.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-secondary/40 transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate text-xs">{item.product.name}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                          {item.margin > 30 ? 'Top Performer' : item.margin < 15 ? 'Needs Attention' : 'Best Seller'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Price: {currencySymbol}{item.product.price} • Margin: {item.margin.toFixed(0)}% • Stock: {item.product.stock} units
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-bold block text-xs ${item.unitProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.unitProfit >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(Math.round(item.unitProfit)).toLocaleString('en-IN')} / unit
                      </span>
                      <span className={`text-[10px] font-mono ${item.unitRoi >= 0 ? 'text-muted-foreground' : 'text-rose-400 font-semibold'}`}>
                        {item.unitRoi >= 0 ? '+' : ''}{item.unitRoi.toFixed(0)}% ROI
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
