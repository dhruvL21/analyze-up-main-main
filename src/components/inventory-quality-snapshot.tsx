'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { computeInventoryQuality } from '@/lib/command-center-engine';
import { useData } from '@/context/data-context';
import { Boxes, PackageCheck, AlertTriangle, XCircle, Flame, Clock, IndianRupee } from 'lucide-react';

export function InventoryQualitySnapshot() {
  const { products, transactions, businessProfile } = useData();
  const quality = computeInventoryQuality(products, transactions);

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  return (
    <Card className="ios-glass rounded-3xl border-border/50 p-5 shadow-xl space-y-4">
      <CardHeader className="p-0 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Inventory Quality Snapshot</CardTitle>
            <CardDescription className="text-xs">Asset health & catalog composition analytics</CardDescription>
          </div>
        </div>

        <Badge variant="outline" className="text-xs">
          {products.length} Total SKUs
        </Badge>
      </CardHeader>

      <CardContent className="p-0 pt-1 space-y-4 text-xs">
        {/* Quality Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
            <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
              <PackageCheck className="w-3.5 h-3.5" /> Healthy Stock
            </span>
            <p className="text-xl font-bold text-emerald-500">{quality.healthyCount}</p>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
            <span className="text-[11px] font-semibold text-amber-500 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
            </span>
            <p className="text-xl font-bold text-amber-500">{quality.lowStockCount}</p>
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-0.5">
            <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Out of Stock
            </span>
            <p className="text-xl font-bold text-rose-500">{quality.criticalStockCount}</p>
          </div>

          <div className="p-3 rounded-2xl bg-secondary/50 border border-border/40 space-y-0.5">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Dead Stock
            </span>
            <p className="text-xl font-bold text-foreground">{quality.deadStockCount}</p>
          </div>
        </div>

        {/* Top Valuable Products Table */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground flex items-center gap-1 text-xs">
            <Flame className="w-3.5 h-3.5 text-amber-500" /> Top 5 Highest Value Capital Assets
          </h4>

          <div className="divide-y divide-border/40 rounded-2xl border border-border/40 overflow-hidden bg-secondary/20">
            {quality.topValuableProducts.map((p, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-secondary/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground truncate max-w-[220px]">{p.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{p.sku} • {p.stock} units</p>
                </div>
                <span className="font-bold text-emerald-500">{currencySymbol}{Math.round(p.value).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
