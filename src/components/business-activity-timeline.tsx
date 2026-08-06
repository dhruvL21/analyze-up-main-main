'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/data-context';
import { Activity, ShoppingCart, PackagePlus, AlertTriangle, Truck, Sparkles, Clock } from 'lucide-react';

export function BusinessActivityTimeline() {
  const { transactions = [], products = [], suppliers = [], orders = [] } = useData();

  // Synthesize recent chronological events
  const events = React.useMemo(() => {
    const list = [];

    // Recent transactions
    transactions.slice(0, 5).forEach((t, i) => {
      list.push({
        id: `event-tx-${t.id || i}`,
        title: t.type === 'Sale' ? `Sale Recorded: ${t.productName || 'Product'}` : `Purchase Order Fulfilled`,
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
        title: `Low Stock Alert: ${p.name}`,
        description: `Current stock level dropped to ${p.stock} units.`,
        timestamp: 'Today',
        type: 'alert',
      });
    });

    // Supplier event
    if (suppliers.length > 0) {
      list.push({
        id: 'event-sup-1',
        title: `Active Supplier Sync: ${suppliers[0].name}`,
        description: `Catalog linked with ${suppliers[0].contactName}.`,
        timestamp: 'Yesterday',
        type: 'supplier',
      });
    }

    return list.slice(0, 6);
  }, [transactions, products, suppliers]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" />;
      case 'order':
        return <PackagePlus className="w-3.5 h-3.5 text-blue-500" />;
      case 'alert':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
      case 'supplier':
        return <Truck className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-primary" />;
    }
  };

  return (
    <Card className="ios-glass rounded-3xl border-border/50 p-5 shadow-xl space-y-3">
      <CardHeader className="p-0 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Business Activity Timeline</CardTitle>
            <CardDescription className="text-xs">Real-time operational event feed</CardDescription>
          </div>
        </div>

        <Badge variant="outline" className="text-xs">Live Feed</Badge>
      </CardHeader>

      <CardContent className="p-0 pt-1 text-xs">
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
          {events.map((evt) => (
            <div key={evt.id} className="relative flex items-start justify-between gap-3">
              <div className="absolute -left-6 top-0.5 p-1 rounded-full bg-background border border-border shadow-sm">
                {getIcon(evt.type)}
              </div>
              <div>
                <h5 className="font-semibold text-foreground">{evt.title}</h5>
                <p className="text-muted-foreground">{evt.description}</p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono shrink-0">{evt.timestamp}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
