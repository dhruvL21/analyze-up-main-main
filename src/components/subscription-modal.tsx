"use client";

import React, { useState } from "react";
import { useData } from "@/context/data-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Loader2,
  X,
  Sparkles,
  Crown,
  Zap,
  ShieldCheck,
  RotateCcw,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PLAN_CONFIGS, PlanType } from "@/lib/saas-engine";

export default function SubscriptionModal() {
  const {
    activePlan,
    isProcessingPayment,
    showSubscriptionModal,
    setShowSubscriptionModal,
    handleUpgrade,
  } = useData();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const resolvedPlanKey: PlanType = React.useMemo(() => {
    if (activePlan === "Enterprise Pro" || activePlan === "Pro Plan" || activePlan === "PRO") return "PRO";
    if (activePlan === "Growth Plan" || activePlan === "GROWTH") return "GROWTH";
    if (activePlan === "Starter Plan" || activePlan === "STARTER") return "STARTER";
    return "FREE";
  }, [activePlan]);

  const handlePlanUpgrade = (key: PlanType) => {
    if (key === resolvedPlanKey) return;
    const plan = PLAN_CONFIGS[key];
    const isAnnual = billingCycle === "annual";
    // Annual discount: 20% off monthly price * 12
    const amount = isAnnual ? Math.round(plan.priceMonthly * 0.8 * 12) : plan.priceMonthly;
    const planId = `${key.toLowerCase()}_${billingCycle}`;
    handleUpgrade(planId, amount, plan.name);
  };

  const planOrder: PlanType[] = ["FREE", "STARTER", "GROWTH", "PRO"];

  return (
    <AnimatePresence>
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          {/* Deep Cinematic Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSubscriptionModal(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 25 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-6xl bg-zinc-950/95 border border-border/80 shadow-[0_25px_70px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden z-10 max-h-[94vh] flex flex-col backdrop-blur-2xl"
          >
            {/* Top Glowing Ambient Accents */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-48 bg-primary/20 rounded-full blur-[100px] pointer-events-none -z-10" />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            {/* Close Button */}
            <button
              onClick={() => setShowSubscriptionModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-secondary/40 hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border/40 transition-all duration-200 z-20 group"
              aria-label="Close subscription modal"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>

            <div className="p-4 sm:p-6 md:p-7 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50">
              {/* Header Section */}
              <div className="text-center max-w-xl mx-auto space-y-2 mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  Pricing Plans
                </div>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-foreground tracking-tight">
                  Billing & Subscriptions
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Manage your workspace subscription plan. Choose the perfect tier to grow your business.
                </p>

                {/* Monthly / Annual Billing Toggle */}
                <div className="pt-1 flex items-center justify-center">
                  <div className="flex items-center p-1 rounded-2xl bg-secondary/50 border border-border/60 shadow-inner">
                    <button
                      onClick={() => setBillingCycle("monthly")}
                      className={`px-3.5 py-1 rounded-xl text-xs font-bold transition-all ${
                        billingCycle === "monthly"
                          ? "bg-card text-foreground shadow-md border border-border/60"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Monthly Billing
                    </button>
                    <button
                      onClick={() => setBillingCycle("annual")}
                      className={`flex items-center gap-1.5 px-3.5 py-1 rounded-xl text-xs font-bold transition-all ${
                        billingCycle === "annual"
                          ? "bg-card text-foreground shadow-md border border-border/60"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>Annual Billing</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30">
                        SAVE 20%
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Pricing Cards Grid (Identical to Billing Page) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4 items-stretch">
                {planOrder.map((key) => {
                  const plan = PLAN_CONFIGS[key];
                  const isCurrent = key === resolvedPlanKey;
                  const isGrowth = key === "GROWTH";
                  const isPro = key === "PRO";

                  const monthlyPrice = plan.priceMonthly;
                  const discountedMonthly = isGrowth ? 3199 : key === "STARTER" ? 1199 : key === "PRO" ? 7199 : 0;
                  const displayMonthly = billingCycle === "annual" ? discountedMonthly : monthlyPrice;
                  const annualTotal = displayMonthly * 12;

                  return (
                    <div
                      key={key}
                      className={`flex flex-col justify-between p-4 rounded-2xl border transition-all duration-300 relative ${
                        isGrowth
                          ? "border-primary/70 bg-gradient-to-b from-primary/15 via-zinc-900/90 to-zinc-950 shadow-xl shadow-primary/15 ring-1 ring-primary/40"
                          : isCurrent
                          ? "border-primary/50 bg-zinc-900/70 shadow-lg shadow-black/40"
                          : "border-border/60 bg-zinc-950/60 hover:border-border"
                      }`}
                    >
                      {/* Floating Most Popular Badge for Growth Plan */}
                      {isGrowth && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider shadow-md shadow-amber-500/30 flex items-center gap-1 whitespace-nowrap">
                            <Sparkles className="w-3 h-3" />
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="space-y-3 pt-0.5">
                        {/* Header & Badges */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                              {isPro && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                              {plan.name}
                            </h3>
                          </div>
                          {isCurrent && (
                            <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              Active
                            </Badge>
                          )}
                        </div>

                        {/* Price Display */}
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl md:text-3xl font-black text-foreground font-mono">
                              ₹{displayMonthly.toLocaleString("en-IN")}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">/ mo</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {plan.priceMonthly === 0
                              ? "Free baseline workspace"
                              : billingCycle === "annual"
                              ? `₹${annualTotal.toLocaleString("en-IN")}/yr (Save 20%)`
                              : "Billed monthly, cancel anytime"}
                          </p>
                        </div>

                        {/* Feature List */}
                        <div className="border-t border-border/40 pt-3">
                          <ul className="space-y-2 text-xs text-muted-foreground">
                            {plan.features.map((feat, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <div
                                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                                    isGrowth
                                      ? "bg-primary/20 text-primary border border-primary/40"
                                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  }`}
                                >
                                  <Check className="h-2 w-2" />
                                </div>
                                <span className="leading-tight text-[11px] text-zinc-300">
                                  {feat}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-4 mt-auto">
                        <Button
                          onClick={() => handlePlanUpgrade(key)}
                          disabled={isCurrent || isProcessingPayment !== null}
                          className={`w-full rounded-xl h-9 text-xs font-bold transition-all duration-200 ${
                            isCurrent
                              ? "bg-secondary text-muted-foreground cursor-default"
                              : isGrowth
                              ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] font-extrabold"
                              : "bg-card hover:bg-secondary text-foreground border border-border/80 hover:border-primary/60 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                          }`}
                        >
                          {isProcessingPayment?.toLowerCase().includes(key.toLowerCase()) ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Processing...
                            </>
                          ) : isCurrent ? (
                            "Current Plan"
                          ) : (
                            <>
                              Upgrade to {plan.name} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Trust & Guarantee Strip */}
              <div className="mt-5 pt-3 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[10px] text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>256-Bit Encryption</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Instant Activation</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <RotateCcw className="w-3 h-3 text-blue-400" />
                  <span>Cancel Anytime</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <CreditCard className="w-3 h-3 text-purple-400" />
                  <span>Razorpay Verified</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

