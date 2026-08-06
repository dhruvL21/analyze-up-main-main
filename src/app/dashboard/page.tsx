'use client';

import React from 'react';
import { useData } from '@/context/data-context';
import { QuickActionsBar } from '@/components/quick-actions-bar';
import { AIBrief } from '@/components/ai-brief';
import { BusinessHealthCard } from '@/components/business-health-card';
import { AIActionCenter } from '@/components/ai-action-center';
import { ExecutiveKPIGrid } from '@/components/executive-kpi-grid';
import { BusinessPrioritiesCard } from '@/components/business-priorities-card';
import { RevenueProfitIntelligence } from '@/components/revenue-profit-intelligence';
import { InventoryRiskOpportunities } from '@/components/inventory-risk-opportunities';
import { InventoryQualitySnapshot } from '@/components/inventory-quality-snapshot';
import { BusinessActivityTimeline } from '@/components/business-activity-timeline';
import { EmptyStateIntelligence } from '@/components/empty-state-intelligence';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Building2, Zap } from 'lucide-react';
import { getIndustryConfig } from '@/lib/industry-intelligence';

function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-2">
      <Skeleton className="h-12 w-full rounded-2xl animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64 lg:col-span-2 rounded-3xl animate-pulse" />
        <Skeleton className="h-64 rounded-3xl animate-pulse" />
      </div>
      <Skeleton className="h-48 w-full rounded-3xl animate-pulse" />
    </div>
  );
}

export default function DashboardPage() {
  const { products, transactions, isLoading, businessProfile } = useData();

  if (isLoading) {
    return <DashboardLoading />;
  }

  const hasNoData = products.length === 0 && transactions.length === 0;
  const industry = getIndustryConfig(businessProfile?.businessType);

  if (hasNoData) {
    return (
      <div className="space-y-6">
        <QuickActionsBar />
        <EmptyStateIntelligence />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Top Header & Quick Actions Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl flex items-center gap-2 text-foreground">
              AI Command Center
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs px-2.5 py-0.5">
                {industry.label}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Welcome back, <span className="font-semibold text-foreground">{businessProfile?.businessName || 'Founder'}</span>. Here is your 5-minute morning decision briefing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1 bg-secondary/50 px-3 py-1 font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Focus Mode Active
            </Badge>
          </div>
        </div>

        {/* FEATURE 14: Quick Actions Bar */}
        <QuickActionsBar />
      </div>

      {/* FEATURE 1 & 2: Business Health Score & AI Morning Briefing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AIBrief />
        </div>
        <div>
          <BusinessHealthCard />
        </div>
      </div>

      {/* FEATURE 3: AI Action Center */}
      <AIActionCenter />

      {/* FEATURE 4: Executive KPI Grid (Trend & Interpretation) */}
      <ExecutiveKPIGrid />

      {/* FEATURE 5 & 12: Business Priorities & Industry Personalization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueProfitIntelligence />
        </div>
        <div>
          <BusinessPrioritiesCard />
        </div>
      </div>

      {/* FEATURE 9 & 10: Inventory Risk Panel & AI Growth Opportunities */}
      <InventoryRiskOpportunities />

      {/* FEATURE 6 & 11: Inventory Quality Snapshot & Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InventoryQualitySnapshot />
        </div>
        <div>
          <BusinessActivityTimeline />
        </div>
      </div>
    </div>
  );
}
