'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, ArrowRight, CheckCircle2, TrendingUp, PackagePlus, Tag } from 'lucide-react';

export function InventoryRecommendationsPanel() {
  const { products, transactions, updateProduct, addOrder, addTransaction, suppliers, businessProfile } = useData();
  const { toast } = useToast();

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  // Find 1 Low Stock Reorder candidate
  const lowStockProd = products.find(p => p && p.stock <= (p.minStock || 5));
  // Find 1 Dead Stock Clearance candidate
  const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));
  const deadStockProd = products.find(p => p && p.stock > 0 && !saleProductIds.has(p.id));
  // Find 1 Price Increase candidate
  const priceUpProd = products.find(p => p && (p.averageDailySales || 0) >= 0.8 && (p.price || 0) > 0);

  const handleReorder = async (prod: any) => {
    const reorderQty = (prod.minStock || 5) * 4 || 50;
    const costPrice = prod.costPrice || (prod.price || 500) * 0.6;
    const totalCost = Math.round(costPrice * reorderQty);

    try {
      await addOrder({
        supplierId: prod.supplierId || suppliers[0]?.id || 'sup-1',
        productId: prod.id,
        quantity: reorderQty,
        orderDate: new Date().toISOString(),
        expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        status: 'Pending',
      });

      await addTransaction({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku || '',
        type: 'Purchase',
        quantity: reorderQty,
        price: costPrice,
        totalCost: totalCost,
        supplier: prod.supplier || suppliers[0]?.name || 'Supplier',
        transactionDate: new Date().toISOString(),
        status: 'Completed',
      });

      await updateProduct({
        ...prod,
        stock: prod.stock + reorderQty,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: '📦 Reorder Purchase Order Created!',
        description: `Added ${reorderQty} units to "${prod.name}" (${currencySymbol}${totalCost.toLocaleString('en-IN')}). Logged in Orders.`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearance = async (prod: any) => {
    const newPrice = Math.round((prod.price || 500) * 0.8);
    await updateProduct({
      ...prod,
      price: newPrice,
      updatedAt: new Date().toISOString(),
    });
    toast({
      title: '🏷️ Clearance Promo Applied!',
      description: `Reduced price of "${prod.name}" by 20% to ${currencySymbol}${newPrice} in database.`,
    });
  };

  const handlePriceUp = async (prod: any) => {
    const newPrice = Math.round((prod.price || 500) * 1.08);
    await updateProduct({
      ...prod,
      price: newPrice,
      updatedAt: new Date().toISOString(),
    });
    toast({
      title: '📈 Selling Price Optimized!',
      description: `Adjusted price of "${prod.name}" by +8% to ${currencySymbol}${newPrice}. Profit margin expanded!`,
    });
  };

  if (!lowStockProd && !deadStockProd && !priceUpProd) return null;

  return (
    <Card className="ios-glass rounded-3xl border-primary/20 p-5 shadow-xl space-y-3">
      <CardHeader className="p-0 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Proactive AI Inventory Recommendations</CardTitle>
            <CardDescription className="text-xs">Continuous 1-click optimization advice for your catalog</CardDescription>
          </div>
        </div>

        <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
          Live Actions
        </Badge>
      </CardHeader>

      <CardContent className="p-0 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
        {/* Recommendation 1: Reorder */}
        {lowStockProd && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1 text-xs">
                  <PackagePlus className="w-3.5 h-3.5 text-amber-400" /> Restock Urgently
                </span>
                <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px]">High Priority</Badge>
              </div>
              <p className="font-semibold text-foreground text-xs">{lowStockProd.name}</p>
              <p className="text-muted-foreground text-[11px]">Current stock: {lowStockProd.stock} units. Reorder 50 units immediately to avoid stockout.</p>
            </div>
            <Button
              size="sm"
              onClick={() => handleReorder(lowStockProd)}
              className="w-full rounded-xl text-xs gap-1 bg-amber-600 hover:bg-amber-500 text-white shadow-sm h-8"
            >
              Execute Reorder PO
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Recommendation 2: Clearance */}
        {deadStockProd && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1 text-xs">
                  <Tag className="w-3.5 h-3.5 text-rose-400" /> Liquidate Dead Stock
                </span>
                <Badge variant="outline" className="text-rose-400 border-rose-500/30 text-[10px]">Clear Capital</Badge>
              </div>
              <p className="font-semibold text-foreground text-xs">{deadStockProd.name}</p>
              <p className="text-muted-foreground text-[11px]">{deadStockProd.stock} units sitting unsold. Launch 20% discount to unlock cash flow.</p>
            </div>
            <Button
              size="sm"
              onClick={() => handleClearance(deadStockProd)}
              className="w-full rounded-xl text-xs gap-1 bg-rose-600 hover:bg-rose-500 text-white shadow-sm h-8"
            >
              Apply 20% Clearance
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Recommendation 3: Price Up */}
        {priceUpProd && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Optimize Margin (+8%)
                </span>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">High Demand</Badge>
              </div>
              <p className="font-semibold text-foreground text-xs">{priceUpProd.name}</p>
              <p className="text-muted-foreground text-[11px]">Strong velocity. Increase selling price to {currencySymbol}{Math.round((priceUpProd.price || 500) * 1.08)} for margin expansion.</p>
            </div>
            <Button
              size="sm"
              onClick={() => handlePriceUp(priceUpProd)}
              className="w-full rounded-xl text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm h-8"
            >
              Optimize Price (+8%)
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
