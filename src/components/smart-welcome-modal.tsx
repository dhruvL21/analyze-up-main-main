'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/data-context';
import { getIndustryConfig } from '@/lib/industry-intelligence';
import { Sparkles, Package, Truck, IndianRupee, AlertTriangle, CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SmartWelcomeModal() {
  const { showWelcomeModal, setShowWelcomeModal, businessProfile, products, suppliers, categories } = useData();
  const router = useRouter();

  if (!showWelcomeModal) return null;

  const industry = getIndustryConfig(businessProfile?.businessType);
  const totalInventoryValue = products.reduce((acc, p) => acc + ((p.price || 0) * (p.stock || 0)), 0);
  const lowStockCount = products.filter(p => p.stock <= (p.minStock || 5)).length;
  const missingCategoriesCount = products.filter(p => !p.categoryId || p.categoryId === 'uncategorized').length;

  const formattedVal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: businessProfile?.currency?.includes('USD') ? 'USD' : 'INR',
    maximumFractionDigits: 0,
  }).format(totalInventoryValue);

  return (
    <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
      <DialogContent className="sm:max-w-lg ios-glass rounded-3xl border border-primary/20 p-6 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <DialogHeader className="text-center sm:text-left space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/15 text-primary border border-primary/25">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-full font-medium">
              AI Business Copilot Ready
            </Badge>
          </div>

          <DialogTitle className="text-2xl font-bold tracking-tight pt-1">
            Welcome to AnalyzeUp!
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Your business profile for <span className="font-semibold text-foreground">{businessProfile?.businessName || 'Your Business'}</span> has been initialized.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-3">
          {/* Business Type Badge & Focus */}
          <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-muted-foreground block">Business Type & Industry</span>
              <span className="text-sm font-semibold text-foreground">{industry.label}</span>
            </div>
            <Badge className="bg-primary/20 text-primary hover:bg-primary/25 border-primary/30 text-xs px-3 py-1">
              {businessProfile?.businessSize || 'Solo / SMB'}
            </Badge>
          </div>

          {/* Business Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Package className="w-3.5 h-3.5 text-primary" />
                Products Catalog
              </div>
              <p className="text-xl font-bold">{products.length}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Truck className="w-3.5 h-3.5 text-primary" />
                Active Suppliers
              </div>
              <p className="text-xl font-bold">{suppliers.length}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <IndianRupee className="w-3.5 h-3.5 text-primary" />
                Inventory Valuation
              </div>
              <p className="text-lg font-bold text-primary">{formattedVal}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                Low Stock Alerts
              </div>
              <p className="text-lg font-bold text-destructive">{lowStockCount} Items</p>
            </div>
          </div>

          {/* AI Active Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 border border-primary/20 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground shrink-0 shadow-md">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-foreground">The AI Copilot is now analyzing your business.</p>
              <p className="text-muted-foreground">{industry.aiPriority}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setShowWelcomeModal(false)}
            className="rounded-xl text-xs flex-1"
          >
            Explore Dashboard
          </Button>
          <Button
            onClick={() => {
              setShowWelcomeModal(false);
              router.push('/dashboard/ai-advisor');
            }}
            className="rounded-xl text-xs flex-1 gap-1.5 bg-primary text-primary-foreground shadow-lg hover:brightness-110"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Launch AI Insights
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
