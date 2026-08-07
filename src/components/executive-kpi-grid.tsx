'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { computeExecutiveKPIs } from '@/lib/command-center-engine';
import { useData } from '@/context/data-context';
import { IndianRupee, CreditCard, ArrowUpRight, ArrowDownRight, Package, ShoppingCart } from 'lucide-react';

export function ExecutiveKPIGrid() {
  const { products, transactions, businessProfile } = useData();
  const kpis = computeExecutiveKPIs(products, transactions, businessProfile);

  const getIcon = (key: string) => {
    switch (key) {
      case 'revenue':
        return <IndianRupee className="w-4 h-4 text-emerald-500" />;
      case 'inventory_value':
        return <Package className="w-4 h-4 text-primary" />;
      case 'net_profit':
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      default:
        return <ShoppingCart className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.key} className="ios-glass rounded-2xl border-border/50 hover:border-primary/40 transition-all p-4">
          <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">{kpi.title}</CardTitle>
            <div className="p-2 rounded-xl bg-secondary/80 border border-border/40">
              {getIcon(kpi.key)}
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-1.5 pt-1">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</div>
              <Badge
                className={
                  kpi.isPositiveChange
                    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20 text-[10px] gap-0.5'
                    : 'bg-rose-500/15 text-rose-500 border-rose-500/20 text-[10px] gap-0.5'
                }
              >
                {kpi.isPositiveChange ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.change}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{kpi.interpretation}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
