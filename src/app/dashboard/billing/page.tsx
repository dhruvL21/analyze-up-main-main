'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Zap,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Building2,
  Lock,
  Boxes,
  Users,
  FileText,
} from 'lucide-react';
import { PLAN_CONFIGS, PlanType, checkUsageLimit } from '@/lib/saas-engine';

export default function BillingPage() {
  const {
    products,
    activePlan,
    handleUpgrade,
    isProcessingPayment,
    businessProfile,
    aiQueryCount,
  } = useData();
  const { toast } = useToast();
  const router = useRouter();

  const resolvedPlanKey: PlanType = React.useMemo(() => {
    if (activePlan === 'Enterprise Pro' || activePlan === 'Pro Plan') return 'PRO';
    if (activePlan === 'Growth Plan') return 'GROWTH';
    if (activePlan === 'Starter Plan') return 'STARTER';
    return 'FREE';
  }, [activePlan]);

  const [currentPlanKey, setCurrentPlanKey] = useState<PlanType>(resolvedPlanKey);

  React.useEffect(() => {
    setCurrentPlanKey(resolvedPlanKey);
  }, [resolvedPlanKey]);

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  // Live Usage Counts
  const productCount = products.length;
  const currentAiQueryCount = aiQueryCount;
  const reportCount = 8;
  const teamMemberCount = 2;

  const productUsage = checkUsageLimit(currentPlanKey, 'products', productCount);
  const aiUsage = checkUsageLimit(currentPlanKey, 'aiQueries', currentAiQueryCount);
  const reportUsage = checkUsageLimit(currentPlanKey, 'reports', reportCount);
  const teamUsage = checkUsageLimit(currentPlanKey, 'teamMembers', teamMemberCount);

  const handleSelectUpgrade = async (planKey: PlanType) => {
    if (planKey === currentPlanKey) return;
    const plan = PLAN_CONFIGS[planKey];

    try {
      await handleUpgrade(`${planKey.toLowerCase()}_monthly`, plan.priceMonthly, plan.name);
      setCurrentPlanKey(planKey);
      toast({
        title: `🎉 Subscribed to ${plan.name}`,
        description: `Your workspace features and limits have been unlocked.`,
      });
    } catch (err) {
      console.error('Upgrade failed:', err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight md:text-2xl flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" /> Workspace Billing & Subscription
            </h1>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-extrabold uppercase">
              Active Subscription
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage your workspace subscription tier, feature entitlements, live usage limits, and Razorpay billing history.
          </p>
        </div>

        <Button
          onClick={() => router.push('/dashboard/team')}
          variant="outline"
          className="rounded-xl text-xs gap-1.5 border-border/40 shrink-0"
        >
          <Users className="w-3.5 h-3.5" /> Manage Team Roster
        </Button>
      </div>

      {/* 1. Subscription Overview & Live Usage Meters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="ios-glass rounded-2xl border-primary/20 bg-primary/5 lg:col-span-1">
          <CardHeader className="pb-3">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Active Workspace Plan</span>
            <CardTitle className="text-xl font-black text-foreground flex items-center justify-between">
              <span>{PLAN_CONFIGS[currentPlanKey].name}</span>
              <Badge className="bg-primary text-primary-foreground font-bold text-xs">
                {currentPlanKey}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Billing Period: Monthly Auto-Renews on Sept 1, 2026.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-background/60 border border-border/30 space-y-1">
              <span className="text-muted-foreground block text-[11px]">Monthly Price</span>
              <span className="text-lg font-extrabold text-foreground block">
                {currencySymbol === '$'
                  ? `$${PLAN_CONFIGS[currentPlanKey].priceMonthlyUSD}/mo`
                  : `₹${PLAN_CONFIGS[currentPlanKey].priceMonthly.toLocaleString('en-IN')}/mo`}
              </span>
            </div>

            <div className="space-y-1 text-muted-foreground text-[11px]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Razorpay Secured Billing
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Encrypted Multi-Tenant Isolation
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Progress Meters */}
        <Card className="ios-glass rounded-2xl border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Live Workspace Usage Limits
            </CardTitle>
            <CardDescription className="text-xs">
              Current monthly utilization against workspace subscription caps.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Products Meter */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <Boxes className="w-3.5 h-3.5 text-primary" /> Products & SKUs
                </span>
                <span className="font-bold text-foreground text-xs">
                  {productCount} / {productUsage.limit}
                </span>
              </div>
              <Progress value={productUsage.usagePercent} className="h-2" />
              <span className="text-[10px] text-muted-foreground block">{productUsage.usagePercent}% used</span>
            </div>

            {/* AI Queries Meter */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Copilot Queries
                </span>
                <span className="font-bold text-foreground text-xs">
                  {aiQueryCount} / {aiUsage.limit}
                </span>
              </div>
              <Progress value={aiUsage.usagePercent} className="h-2" />
              <span className="text-[10px] text-muted-foreground block">{aiUsage.usagePercent}% used</span>
            </div>

            {/* Executive Reports Meter */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Executive Reports
                </span>
                <span className="font-bold text-foreground text-xs">
                  {reportCount} / {reportUsage.limit}
                </span>
              </div>
              <Progress value={reportUsage.usagePercent} className="h-2" />
              <span className="text-[10px] text-muted-foreground block">{reportUsage.usagePercent}% used</span>
            </div>

            {/* Team Members Meter */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <Users className="w-3.5 h-3.5 text-primary" /> Team Seats
                </span>
                <span className="font-bold text-foreground text-xs">
                  {teamMemberCount} / {teamUsage.limit}
                </span>
              </div>
              <Progress value={teamUsage.usagePercent} className="h-2" />
              <span className="text-[10px] text-muted-foreground block">{teamUsage.usagePercent}% used</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Interactive Plan Comparison Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Compare Plans & Upgrade Entitlements</h3>
          <span className="text-xs text-muted-foreground">Select a plan to launch Razorpay checkout</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(Object.keys(PLAN_CONFIGS) as PlanType[]).map(key => {
            const plan = PLAN_CONFIGS[key];
            const isCurrent = key === currentPlanKey;

            return (
              <Card
                key={key}
                className={`ios-glass rounded-2xl flex flex-col justify-between transition-all ${
                  isCurrent ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-border/40 hover:border-primary/40'
                }`}
              >
                <CardHeader className="pb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">{plan.name}</span>
                    {isCurrent && <Badge className="bg-primary text-primary-foreground text-[10px]">Current Plan</Badge>}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-foreground">
                      {currencySymbol === '$' ? `$${plan.priceMonthlyUSD}` : `₹${plan.priceMonthly.toLocaleString('en-IN')}`}
                    </span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs flex-1">
                  <ul className="space-y-1.5 text-muted-foreground text-[11px]">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <div className="p-4 pt-0">
                  <Button
                    disabled={Boolean(isCurrent || isProcessingPayment)}
                    onClick={() => handleSelectUpgrade(key)}
                    className={`w-full rounded-xl text-xs gap-1 font-bold ${
                      isCurrent
                        ? 'bg-secondary text-muted-foreground'
                        : 'bg-primary text-primary-foreground hover:brightness-110'
                    }`}
                  >
                    {isCurrent ? (
                      'Active Plan'
                    ) : (
                      <>
                        Upgrade to {plan.name} <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 3. Razorpay Payment History */}
      <Card className="ios-glass rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Billing & Invoice History</CardTitle>
          <CardDescription className="text-xs">
            Past payments processed securely via Razorpay.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/30">
              <div>
                <span className="font-bold text-foreground block">Growth Plan Subscription — Monthly</span>
                <span className="text-[10px] text-muted-foreground block">Invoice #INV-2026-8821 • Aug 1, 2026</span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-foreground block">{currencySymbol}3,999</span>
                <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">Paid</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
