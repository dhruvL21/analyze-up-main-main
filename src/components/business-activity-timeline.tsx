'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/data-context';
import { ShoppingCart, PackagePlus, AlertTriangle, Truck, Sparkles, Clock } from 'lucide-react';

export function BusinessActivityTimeline() {
  const { transactions = [], products = [], suppliers = [] } = useData();

  // Synthesize recent chronological events
  const events = React.useMemo(() => {
    const list = [];

    // Recent transactions
    transactions.slice(0, 5).forEach((t, i) => {
      list.push({
        id: `event-tx-${t.id || i}`,
        title: t.type === 'Sale' ? `Sale: ${t.productName || 'Product'}` : `Purchase Order Fulfilled`,
        description: `${t.quantity} units @ ₹${t.price} (${t.paymentMethod || 'Completed'})`,
        timestamp: t.transactionDate ? String(t.transactionDate).slice(0, 10) : 'Recent',
        type: t.type === 'Sale' ? 'sale' : 'order',
      });
    });

    // Low stock warnings
    const lowStock = products.filter(p => p.stock < 10).slice(0, 2);
    lowStock.forEach((p, i) => {
      list.push({
        id: `event-low-${i}`,
        title: `Low Stock: ${p.name}`,
        description: `Current stock level dropped to ${p.stock} units.`,
        timestamp: 'Today',
        type: 'alert',
      });
    });

    // Supplier event
    if (suppliers.length > 0) {
      list.push({
        id: 'event-sup-1',
        title: `Supplier Sync: ${suppliers[0].name}`,
        description: `Catalog linked with ${suppliers[0].contactName || 'Vendor'}.`,
        timestamp: 'Yesterday',
        type: 'supplier',
      });
    }

    return list.slice(0, 6);
  }, [transactions, products, suppliers]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />;
      case 'order':
        return <PackagePlus className="w-3.5 h-3.5 text-primary" />;
      case 'alert':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'supplier':
        return <Truck className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-primary" />;
    }
  };

  return (
    <Card className="ios-glass rounded-3xl border-border/50 p-5 shadow-xl space-y-3 h-full flex flex-col justify-between">
      <div>
        <CardHeader className="p-0 pb-3 border-b border-border/40 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-bold whitespace-nowrap">Business Activity Timeline</CardTitle>
              <CardDescription className="text-xs truncate">Real-time operational event feed</CardDescription>
            </div>
          </div>

          <Badge
            variant="outline"
            className="text-xs font-semibold whitespace-nowrap shrink-0 px-2.5 py-1 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1.5 shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            Live Feed
          </Badge>
        </CardHeader>

        <CardContent className="p-0 pt-4 text-xs">
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
            {events.map((evt) => (
              <div key={evt.id} className="relative flex items-start justify-between gap-3">
                <div className="absolute -left-6 top-0.5 p-1 rounded-full bg-background border border-border shadow-xs">
                  {getIcon(evt.type)}
                </div>
                <div className="min-w-0 space-y-0.5 pr-2">
                  <h5 className="font-semibold text-foreground truncate text-xs">{evt.title}</h5>
                  <p className="text-muted-foreground text-[11px] line-clamp-1">{evt.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0 whitespace-nowrap bg-secondary/50 px-1.5 py-0.5 rounded-md border border-border/40">
                  {evt.timestamp}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
