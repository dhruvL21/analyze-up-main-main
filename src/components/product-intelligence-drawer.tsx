'use client';

import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Product } from '@/lib/types';
import { computeProductIntelligence } from '@/lib/product-intelligence-engine';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  TrendingUp,
  PackagePlus,
  Tag,
  ShieldAlert,
  Clock,
  ArrowRight,
  Coins,
  Truck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ProductIntelligenceDrawerProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductIntelligenceDrawer({ product, open, onOpenChange }: ProductIntelligenceDrawerProps) {
  const { transactions, returns, suppliers, updateProduct, addOrder, addTransaction, businessProfile } = useData();
  const { toast } = useToast();

  if (!product) return null;

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';
  const report = computeProductIntelligence(product, transactions, returns, suppliers);

  const handleExecuteReorder = async () => {
    const reorderQty = report.reorderAdvice.suggestedQty;
    const costPrice = product.costPrice || (product.price || 500) * 0.6;
    const totalCost = Math.round(costPrice * reorderQty);

    try {
      await addOrder({
        supplierId: product.supplierId || suppliers[0]?.id || 'sup-1',
        productId: product.id,
        quantity: reorderQty,
        orderDate: new Date().toISOString(),
        expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        status: 'Pending',
      });

      await addTransaction({
        productId: product.id,
        productName: product.name,
        sku: product.sku || '',
        type: 'Purchase',
        quantity: reorderQty,
        price: costPrice,
        totalCost: totalCost,
        supplier: product.supplier || suppliers[0]?.name || 'Supplier',
        transactionDate: new Date().toISOString(),
        status: 'Completed',
      });

      await updateProduct({
        ...product,
        stock: product.stock + reorderQty,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: '📦 Restock Purchase Order Executed!',
        description: `Added ${reorderQty} units to "${product.name}" (${currencySymbol}${totalCost.toLocaleString('en-IN')}). Logged in Orders & Transactions.`,
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyClearance = async () => {
    const newPrice = Math.round((product.price || 500) * 0.8);
    await updateProduct({
      ...product,
      price: newPrice,
      updatedAt: new Date().toISOString(),
    });
    toast({
      title: '🏷️ 20% Clearance Discount Applied!',
      description: `Updated selling price of "${product.name}" to ${currencySymbol}${newPrice} in database.`,
    });
    onOpenChange(false);
  };

  const handleApplyPriceUp = async () => {
    const newPrice = Math.round((product.price || 500) * 1.08);
    await updateProduct({
      ...product,
      price: newPrice,
      updatedAt: new Date().toISOString(),
    });
    toast({
      title: '📈 Selling Price Optimized (+8%)!',
      description: `Updated selling price of "${product.name}" to ${currencySymbol}${newPrice} in database.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto ios-glass p-6 space-y-4">
        <DialogHeader className="p-0 pb-3 border-b border-border/40 pr-8">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground font-black text-lg flex items-center justify-center shadow-md shrink-0">
              {report.performanceGrade}
            </span>
            <div>
              <DialogTitle className="text-lg font-extrabold text-foreground leading-tight">
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-xs font-mono">
                SKU: {product.sku || 'N/A'} • {product.category || 'General Category'} • {product.brand || 'Brand'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* AI Executive Summary */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-secondary/40 to-transparent border border-primary/25 space-y-1.5 text-xs">
          <span className="font-bold text-primary uppercase tracking-wider flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" /> AI Executive Summary
          </span>
          <p className="text-foreground leading-relaxed">{report.executiveSummary}</p>
        </div>

        {/* Key Operational Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-secondary/40 border border-border/40 space-y-0.5">
            <span className="text-[10px] text-muted-foreground font-medium block">Current Stock</span>
            <p className="text-lg font-bold text-foreground">{product.stock} {product.unit || 'units'}</p>
          </div>

          <div className="p-3 rounded-2xl bg-secondary/40 border border-border/40 space-y-0.5">
            <span className="text-[10px] text-muted-foreground font-medium block">Stock Runway</span>
            <p className="text-lg font-bold text-foreground">
              {report.daysOfStockRemaining >= 999 ? '∞ Days' : `~${report.daysOfStockRemaining} Days`}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-secondary/40 border border-border/40 space-y-0.5">
            <span className="text-[10px] text-muted-foreground font-medium block">Daily Velocity</span>
            <p className="text-lg font-bold text-foreground">{report.averageDailySales} / day</p>
          </div>

          <div className="p-3 rounded-2xl bg-secondary/40 border border-border/40 space-y-0.5">
            <span className="text-[10px] text-muted-foreground font-medium block">Profit Margin</span>
            <p className={`text-lg font-bold ${report.profitMarginPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{report.profitMarginPercent}%</p>
          </div>
        </div>

        {/* 1-Click Action Boxes */}
        {report.reorderAdvice.needed && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <PackagePlus className="w-4 h-4" /> Restock Recommendation
              </span>
              <p className="text-muted-foreground">{report.reorderAdvice.reason}</p>
            </div>
            <Button
              size="sm"
              onClick={handleExecuteReorder}
              className="rounded-xl text-xs gap-1 bg-amber-600 hover:bg-amber-500 text-white shrink-0"
            >
              Execute Reorder PO ({report.reorderAdvice.suggestedQty} Units)
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {report.opportunityAdvice.hasOpportunity && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> {report.opportunityAdvice.title}
              </span>
              <p className="text-muted-foreground">{report.opportunityAdvice.description}</p>
            </div>
            <Button
              size="sm"
              onClick={report.opportunityAdvice.type === 'clearance' ? handleApplyClearance : handleApplyPriceUp}
              className="rounded-xl text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
            >
              Execute 1-Click Action
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Supplier Procurement Intelligence */}
        {report.supplierIntelligence && (
          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Truck className="w-4 h-4 text-primary" /> Supplier Procurement Intelligence
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">
                {report.supplierIntelligence.supplierStatus}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1 bg-background/50 p-2 rounded-xl text-center">
              <div>
                <span className="text-[10px] text-muted-foreground block">Supplier</span>
                <span className="font-bold text-foreground truncate block">{report.supplierIntelligence.supplierName}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Score</span>
                <span className="font-bold text-primary block">
                  {report.supplierIntelligence.supplierScore !== null ? `${report.supplierIntelligence.supplierScore}/100` : 'Insufficient History'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Lead Time</span>
                <span className="font-bold text-foreground block">{report.supplierIntelligence.leadTimeDays} days</span>
              </div>
            </div>
            {report.supplierIntelligence.costTrendPercent !== 0 && (
              <p className="text-[11px] text-muted-foreground">
                <AlertTriangle className="w-3 h-3 inline text-amber-400 mr-1" />
                Supplier purchase cost changed {report.supplierIntelligence.costTrendPercent > 0 ? `+${report.supplierIntelligence.costTrendPercent}%` : `${report.supplierIntelligence.costTrendPercent}%`}. Impact on product margin: {report.supplierIntelligence.marginImpactPercentagePoints} percentage points.
              </p>
            )}
          </div>
        )}

        {/* Predictive Forecast Profile */}
        {report.forecastingProfile && (
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/25 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-primary flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-4 h-4 text-primary" /> Predictive Demand & Stockout Forecast
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  report.forecastingProfile.stockoutRiskLevel === 'HIGH'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {report.forecastingProfile.stockoutRiskLevel} Risk
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1 bg-background/60 p-2 rounded-xl text-center">
              <div>
                <span className="text-[10px] text-muted-foreground block">30D Forecast</span>
                <span className="font-bold text-primary block">{report.forecastingProfile.forecast30Days} units</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Velocity Change</span>
                <span className="font-bold text-foreground block">
                  {report.forecastingProfile.velocityChangePercent >= 0 ? `+${report.forecastingProfile.velocityChangePercent}%` : `${report.forecastingProfile.velocityChangePercent}%`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Stockout Date</span>
                <span className="font-bold text-foreground block">
                  {report.forecastingProfile.projectedStockoutDate
                    ? new Date(report.forecastingProfile.projectedStockoutDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                    : 'No stockout'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tags / Badges */}
        <div className="space-y-1.5 text-xs">
          <span className="font-semibold text-muted-foreground block text-[11px]">AI Intelligence Labels:</span>
          <div className="flex flex-wrap gap-1.5">
            {report.tags.map(t => (
              <Badge key={t} variant="outline" className="text-xs bg-background/60">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button variant="secondary" className="rounded-xl text-xs">Close Report</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
