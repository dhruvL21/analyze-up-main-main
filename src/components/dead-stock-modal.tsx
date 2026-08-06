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
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { PackageX, Tag, ArrowRight, Check } from 'lucide-react';

interface DeadStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeadStockModal({ open, onOpenChange }: DeadStockModalProps) {
  const { products, transactions, updateProduct, businessProfile } = useData();
  const { toast } = useToast();

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));
  const deadStockItems = products.filter(p => p.stock > 0 && !saleProductIds.has(p.id));

  const totalDeadCapital = deadStockItems.reduce((acc, p) => acc + (p.stock * (p.costPrice || p.price * 0.6)), 0);

  const handleApplyDiscount = (product: any, percent: number) => {
    const newPrice = Math.round(product.price * (1 - percent / 100));
    updateProduct({
      ...product,
      price: newPrice,
      updatedAt: new Date().toISOString(),
    });
    toast({
      title: 'Clearance Discount Applied!',
      description: `Reduced price of "${product.name}" by ${percent}% to ${currencySymbol}${newPrice}.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto ios-glass p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-rose-500">
            <PackageX className="w-5 h-5 text-rose-500" />
            Dead Stock & Locked Capital Inspector
          </DialogTitle>
          <DialogDescription className="text-xs">
            Identify stagnant inventory items with zero customer sales and clear locked working capital.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider block">Locked Working Capital</span>
              <span className="text-2xl font-bold text-foreground">{currencySymbol}{Math.round(totalDeadCapital).toLocaleString('en-IN')}</span>
            </div>
            <Badge className="bg-rose-500 text-white text-xs px-3 py-1 font-semibold">
              {deadStockItems.length} Stagnant SKUs
            </Badge>
          </div>

          {/* List of items */}
          {deadStockItems.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-secondary/30 border border-border/40 space-y-1">
              <Check className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="font-semibold text-foreground">No Dead Stock Detected!</p>
              <p className="text-muted-foreground text-xs">All products in your inventory have active customer sales history.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40 rounded-2xl border border-border/40 overflow-hidden bg-secondary/20 max-h-[320px] overflow-y-auto">
              {deadStockItems.map((item) => {
                const tied = item.stock * (item.costPrice || item.price * 0.6);
                return (
                  <div key={item.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-secondary/40 transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-bold text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        SKU: {item.sku || 'N/A'} • Stock: {item.stock} {item.unit || 'units'} • Price: {currencySymbol}{item.price}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-rose-500 text-xs pr-2">{currencySymbol}{Math.round(tied).toLocaleString('en-IN')} tied</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplyDiscount(item, 20)}
                        className="rounded-xl text-xs gap-1 h-7 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                      >
                        <Tag className="w-3 h-3" />
                        Apply 20% Off
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button variant="secondary" className="rounded-xl">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
