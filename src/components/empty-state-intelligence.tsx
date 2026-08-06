'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/data-context';
import { useRouter } from 'next/navigation';
import { Sparkles, FileSpreadsheet, ShoppingBag, PlusCircle, Zap, ShieldCheck, ArrowRight } from 'lucide-react';

export function EmptyStateIntelligence() {
  const { loadDemoBusiness, setShowShopifyModal, businessProfile } = useData();
  const router = useRouter();

  return (
    <Card className="ios-glass rounded-3xl border-primary/30 p-8 shadow-2xl overflow-hidden relative text-center">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <CardContent className="p-0 space-y-6 max-w-xl mx-auto">
        <div className="p-4 rounded-3xl bg-primary/10 text-primary border border-primary/20 w-16 h-16 mx-auto flex items-center justify-center shadow-lg">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <Badge className="bg-primary/15 text-primary border-primary/25 text-xs px-3 py-1 font-semibold">
            AI Copilot Workspace Initialization
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome to AnalyzeUp Command Center
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            AnalyzeUp needs business inventory & sales data to generate daily briefings, profit predictions, and health scores.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/15 to-primary/10 border border-primary/30 space-y-2">
            <div className="flex items-center justify-between">
              <Zap className="w-5 h-5 text-amber-500" />
              <Badge className="bg-amber-500 text-white text-[10px]">Instant 1-Click</Badge>
            </div>
            <h4 className="text-sm font-bold text-foreground">Explore Demo Business</h4>
            <p className="text-xs text-muted-foreground">Load 200+ products, 15 suppliers & 500+ sales orders to test AI features instantly.</p>
            <Button
              onClick={() => loadDemoBusiness(businessProfile?.businessType || 'Fashion')}
              className="w-full rounded-xl text-xs gap-1.5 bg-amber-600 hover:bg-amber-500 text-white shadow-md mt-1"
            >
              Load Demo Business
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              <Badge variant="outline" className="text-emerald-500 text-[10px]">CSV / Excel</Badge>
            </div>
            <h4 className="text-sm font-bold text-foreground">Bulk Import Catalog</h4>
            <p className="text-xs text-muted-foreground">Download our official CSV template and import your existing Excel product lists.</p>
            <Button
              onClick={() => router.push('/dashboard/inventory?action=import')}
              className="w-full rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md mt-1"
            >
              Import CSV File
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2 text-xs">
          <Button
            variant="ghost"
            onClick={() => setShowShopifyModal(true)}
            className="rounded-xl text-xs gap-1.5 text-purple-500 hover:bg-purple-500/10"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Connect Shopify Store
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/inventory?action=add')}
            className="rounded-xl text-xs gap-1.5 text-primary hover:bg-primary/10"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Create Single Product
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
