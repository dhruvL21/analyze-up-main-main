'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useData } from '@/context/data-context';
import { PieChart, Boxes, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

export function InventoryDistributionCard() {
  const { products, transactions } = useData();

  const totalSKUs = products.length || 1;
  const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));

  const healthyCount = products.filter(p => p.stock > (p.minStock || 5) && p.stock <= (p.maxStock || 100)).length;
  const lowCount = products.filter(p => p.stock <= (p.minStock || 5) && p.stock > 0).length;
  const criticalCount = products.filter(p => p.stock === 0).length;
  const deadCount = products.filter(p => p.stock > 0 && !saleProductIds.has(p.id)).length;
  const overstockCount = products.filter(p => p.stock >= (p.maxStock || 100)).length;

  const healthyPct = Math.round((healthyCount / totalSKUs) * 100);
  const lowPct = Math.round((lowCount / totalSKUs) * 100);
  const criticalPct = Math.round((criticalCount / totalSKUs) * 100);
  const deadPct = Math.round((deadCount / totalSKUs) * 100);
  const overstockPct = Math.round((overstockCount / totalSKUs) * 100);

  return (
    <Card className="ios-glass rounded-3xl border-border/50 p-5 shadow-xl space-y-3">
      <CardHeader className="p-0 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Inventory Asset Distribution</CardTitle>
            <CardDescription className="text-xs">Operational quality breakdown across all SKUs</CardDescription>
          </div>
        </div>

        <Badge variant="outline" className="text-xs">
          {totalSKUs} Active SKUs
        </Badge>
      </CardHeader>

      <CardContent className="p-0 pt-1 space-y-3 text-xs">
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Healthy Stock
              </span>
              <span>{healthyCount} SKUs ({healthyPct}%)</span>
            </div>
            <Progress value={healthyPct} className="h-1.5 rounded-full bg-emerald-500/20" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Warning
              </span>
              <span>{lowCount} SKUs ({lowPct}%)</span>
            </div>
            <Progress value={lowPct} className="h-1.5 rounded-full bg-amber-500/20" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-rose-500 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Critical / Out of Stock
              </span>
              <span>{criticalCount} SKUs ({criticalPct}%)</span>
            </div>
            <Progress value={criticalPct} className="h-1.5 rounded-full bg-rose-500/20" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Dead Stock Capital Lockup
              </span>
              <span>{deadCount} SKUs ({deadPct}%)</span>
            </div>
            <Progress value={deadPct} className="h-1.5 rounded-full bg-slate-500/20" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-blue-500 flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5" /> Overstocked Items
              </span>
              <span>{overstockCount} SKUs ({overstockPct}%)</span>
            </div>
            <Progress value={overstockPct} className="h-1.5 rounded-full bg-blue-500/20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
