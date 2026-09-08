import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageShell } from '@/components/legal-page-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  RotateCcw,
  Clock,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Boxes,
  Users,
  Cpu,
} from 'lucide-react';
import { PLAN_CONFIGS } from '@/lib/saas-engine';

export const metadata: Metadata = {
  title: 'Subscription Terms & Billing Policy | AnalyzeUp',
  description:
    'Transparent terms governing AnalyzeUp subscription tiers, 14-day free trials, Razorpay recurring billing, usage limits, cancellations, and refund policies.',
};

const TOC = [
  { id: 'overview', title: '1. Subscription Overview & Scope' },
  { id: 'plan-tiers', title: '2. Plan Tiers & Resource Entitlements' },
  { id: 'free-trial', title: '3. 14-Day Free Trial Terms' },
  { id: 'billing-cycles', title: '4. Billing Cycles & Automated Payment Processing' },
  { id: 'upgrades-downgrades', title: '5. Plan Upgrades, Downgrades & Prorations' },
  { id: 'usage-limits', title: '6. Usage Limits, Quotas & Fair Use' },
  { id: 'cancellation', title: '7. Cancellation Policy' },
  { id: 'refunds', title: '8. Refund Policy & 7-Day Guarantee' },
  { id: 'taxes-gst', title: '9. Taxes, Invoicing & GST Compliance' },
  { id: 'payment-failure', title: '10. Payment Failure & Grace Periods' },
  { id: 'price-changes', title: '11. Price Changes & Notice' },
  { id: 'enterprise', title: '12. Enterprise Custom Agreements' },
  { id: 'contact-billing', title: '13. Billing Support & Contact Desk' },
];

export default function SubscriptionTermsPage() {
  const plans = [
    {
      key: 'FREE',
      name: PLAN_CONFIGS.FREE.name,
      priceINR: '₹0',
      priceUSD: '$0',
      period: '14 days trial',
      popular: false,
      productLimit: '10,000 Products',
      aiQueries: '50 AI Queries / mo',
      reports: '25 Reports / mo',
      teamSeats: 'Up to 2 Members',
      forecastDays: '14-Day Forecast',
      support: 'Standard Community',
    },
    {
      key: 'STARTER',
      name: PLAN_CONFIGS.STARTER.name,
      priceINR: '₹1,499',
      priceUSD: '$19',
      period: 'per month',
      popular: false,
      productLimit: '25,000 Products',
      aiQueries: '250 AI Queries / mo',
      reports: '100 Reports / mo',
      teamSeats: 'Up to 5 Members',
      forecastDays: '30-Day Forecast',
      support: 'Email Support (24h)',
    },
    {
      key: 'GROWTH',
      name: PLAN_CONFIGS.GROWTH.name,
      priceINR: '₹3,999',
      priceUSD: '$49',
      period: 'per month',
      popular: true,
      productLimit: '50,000 Products',
      aiQueries: '1,000 AI Queries / mo',
      reports: '500 Reports / mo',
      teamSeats: 'Up to 15 Members',
      forecastDays: '90-Day Forecast',
      support: 'Priority Support (12h)',
    },
    {
      key: 'PRO',
      name: PLAN_CONFIGS.PRO.name,
      priceINR: '₹8,999',
      priceUSD: '$99',
      period: 'per month',
      popular: false,
      productLimit: '250,000 Products',
      aiQueries: '10,000 AI Queries / mo',
      reports: '5,000 Reports / mo',
      teamSeats: 'Up to 50 Members',
      forecastDays: '365-Day Strategic Forecast',
      support: 'Dedicated Slack & Account Lead',
    },
  ];

  return (
    <LegalPageShell
      title="Subscription Terms & Billing Policy"
      subtitle="Complete clarity on how AnalyzeUp subscriptions operate: pricing tiers, billing cycles, automated recurring payments via Razorpay, upgrades, cancellations, and our merchant-first refund guarantee."
      documentType="subscription"
      lastUpdated="September 8, 2026"
      effectiveDate="September 8, 2026"
      toc={TOC}
    >
      {/* Executive Summary & Key Descriptions At a Glance */}
      <div className="p-6 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-card via-secondary/20 to-card space-y-4 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-sm text-foreground">
          <CreditCard className="w-5 h-5 text-amber-400" />
          <span>Executive Summary: Subscription & Billing Terms at a Glance</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-border/40 bg-secondary/20 space-y-1">
            <span className="font-semibold text-foreground">14-Day Free Trial</span>
            <p className="text-muted-foreground">Full feature access for 14 days without requiring any credit card or payment details to start.</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border/40 bg-secondary/20 space-y-1">
            <span className="font-semibold text-foreground">Transparent Plans</span>
            <p className="text-muted-foreground">Starter (₹1,499/mo), Growth (₹3,999/mo), Enterprise Pro (₹8,999/mo) with zero hidden fees.</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border/40 bg-secondary/20 space-y-1">
            <span className="font-semibold text-foreground">1-Click Self-Service Cancellation</span>
            <p className="text-muted-foreground">Cancel anytime directly in Dashboard &gt; Billing with no phone calls or cancellation penalties.</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border/40 bg-secondary/20 space-y-1">
            <span className="font-semibold text-foreground">7-Day Money-Back Guarantee</span>
            <p className="text-muted-foreground">100% full refund on your initial upgrade if requested within 7 calendar days.</p>
          </div>
        </div>
      </div>

      {/* 1. Overview */}
      <section id="overview" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <CreditCard className="w-4 h-4" /> Section 01
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          1. Subscription Overview & Scope
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            These Subscription Terms & Billing Policy govern all paid and trial subscriptions to AnalyzeUp Intelligence Platform. By selecting a subscription plan, initiating an upgrade, or providing billing credentials, you enter into a binding financial agreement governed by these terms.
          </p>
          <p>
            All subscriptions provide access to cloud software on a recurring basis. Fees are billed in advance on a monthly recurring cycle unless an annual enterprise agreement has been executed.
          </p>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 2. Plan Tiers & Resource Entitlements */}
      <section id="plan-tiers" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <Zap className="w-4 h-4" /> Section 02
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          2. Plan Tiers & Resource Entitlements
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            AnalyzeUp offers four distinct plan configurations tailored to different business scales. The table below outlines the contracted limits and features included in each tier:
          </p>

          {/* Plan Comparison Grid */}
          <div className="border border-border/40 rounded-2xl overflow-hidden shadow-sm bg-card/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/40 border-b border-border/40 text-foreground font-semibold">
                  <tr>
                    <th className="p-3.5 min-w-[140px]">Tier</th>
                    <th className="p-3.5 min-w-[120px]">Monthly Price</th>
                    <th className="p-3.5 min-w-[130px]">Catalog Limit</th>
                    <th className="p-3.5 min-w-[130px]">AI Copilot Limit</th>
                    <th className="p-3.5 min-w-[110px]">Team Seats</th>
                    <th className="p-3.5 min-w-[130px]">Forecast Depth</th>
                    <th className="p-3.5 min-w-[130px]">Support SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-muted-foreground">
                  {plans.map((p) => (
                    <tr key={p.key} className={p.popular ? 'bg-primary/5 font-medium' : ''}>
                      <td className="p-3.5 text-foreground font-bold flex items-center gap-1.5">
                        {p.name}
                        {p.popular && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
                            Most Popular
                          </Badge>
                        )}
                      </td>
                      <td className="p-3.5 text-foreground font-semibold">
                        {p.priceINR} <span className="text-[10px] font-normal text-muted-foreground">({p.priceUSD})</span>
                      </td>
                      <td className="p-3.5">{p.productLimit}</td>
                      <td className="p-3.5">{p.aiQueries}</td>
                      <td className="p-3.5">{p.teamSeats}</td>
                      <td className="p-3.5">{p.forecastDays}</td>
                      <td className="p-3.5">{p.support}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Link href="/dashboard/billing">
              <Button size="sm" className="text-xs font-semibold gap-1.5">
                Manage Workspace Subscription <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 3. 14-Day Free Trial Terms */}
      <section id="free-trial" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <Sparkles className="w-4 h-4" /> Section 03
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          3. 14-Day Free Trial Terms
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
            <span className="font-semibold text-emerald-400 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> No Credit Card Required to Start
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every new AnalyzeUp workspace begins with a fully featured 14-day Free Trial. You can connect your live Shopify store, ingest catalog items, test demand forecasting, and generate AI executive briefs without entering payment card credentials.
            </p>
          </div>
          <p>
            At the conclusion of the 14-day trial period, your workspace will not be automatically charged. To maintain automated sync jobs and access to predictive engines, the workspace owner must choose a paid plan (Starter, Growth, or Enterprise Pro). If no plan is selected, the workspace transitions to a restricted read-only mode for 14 days before automated data archiving occurs.
          </p>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 4. Billing Cycles & Automated Payment Processing */}
      <section id="billing-cycles" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <Receipt className="w-4 h-4" /> Section 04
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          4. Billing Cycles & Automated Payment Processing
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Recurring Monthly Billing:</strong> Paid subscriptions automatically renew each month on the calendar day corresponding to the commencement of your paid tier. For example, a plan activated on October 15 will renew on November 15.
          </p>
          <p>
            <strong className="text-foreground">Authorized Gateway:</strong> All financial transactions are processed securely through Razorpay Software Private Limited (&quot;Razorpay&quot;), an RBI-regulated and PCI-DSS Level 1 certified payment aggregator. AnalyzeUp never stores raw credit/debit card numbers or CVVs on its servers.
          </p>
          <p>
            <strong className="text-foreground">Accepted Payment Instruments:</strong> Supported payment mechanisms include Major Credit/Debit Cards (Visa, Mastercard, RuPay, American Express), Unified Payments Interface (UPI Autopay), and Corporate NetBanking.
          </p>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 5. Upgrades, Downgrades & Prorations */}
      <section id="upgrades-downgrades" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <RotateCcw className="w-4 h-4" /> Section 05
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          5. Plan Upgrades, Downgrades & Prorations
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li>
              <strong className="text-foreground">Upgrades:</strong> When you upgrade to a higher tier (e.g., Starter to Growth), the upgrade takes effect immediately. The unused portion of your existing subscription is calculated on a pro-rata basis and credited toward the first month of the higher tier.
            </li>
            <li>
              <strong className="text-foreground">Downgrades:</strong> When you downgrade to a lower tier, the downgrade takes effect at the end of the current billing cycle. You retain your existing resource limits until the current paid period concludes.
            </li>
          </ul>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 6. Usage Limits, Quotas & Fair Use */}
      <section id="usage-limits" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <Boxes className="w-4 h-4" /> Section 06
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          6. Usage Limits, Quotas & Fair Use
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            Each plan includes specific resource ceilings:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li><strong className="text-foreground">Catalog Capacity:</strong> The aggregate count of distinct SKU variants tracked across your connected stores. If your store catalog exceeds your plan quota, synchronization will flag an overage notice and prompt an upgrade before ingesting additional SKUs.</li>
            <li><strong className="text-foreground">AI Copilot Inquiries:</strong> Monthly query allowance for interactive AI analysis. Queries reset automatically on the 1st of each calendar month.</li>
            <li><strong className="text-foreground">Workspace Team Seats:</strong> The maximum number of concurrent active staff accounts provisioned in your workspace.</li>
          </ul>
          <p className="text-xs">
            AnalyzeUp does not bill surprise overage charges. When limits are approached (at 80% and 100%), the dashboard displays clear notification banners allowing you to choose whether to upgrade.
          </p>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 7. Cancellation Policy */}
      <section id="cancellation" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <Clock className="w-4 h-4" /> Section 07
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          7. Cancellation Policy
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <div className="p-4 rounded-xl border border-border/40 bg-secondary/20 space-y-2">
            <span className="font-semibold text-foreground text-xs block">
              1-Click Self-Service Cancellation
            </span>
            <p className="text-xs text-muted-foreground">
              You may cancel your subscription at any time without penalty or cancellation fees. You can cancel directly within your workspace by navigating to{' '}
              <strong className="text-foreground">Dashboard &gt; Billing &gt; Cancel Subscription</strong>.
            </p>
          </div>
          <p>
            Upon cancellation, your recurring billing schedule is terminated immediately. You will retain full access to all features of your paid plan until the end of your current paid billing period. At the end of the period, your workspace will safely downgrade to the free tier.
          </p>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 8. Refund Policy & 7-Day Guarantee */}
      <section id="refunds" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" /> Section 08
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          8. Refund Policy & 7-Day Money-Back Guarantee
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
            <span className="font-semibold text-emerald-400 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 7-Day First-Charge Guarantee
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you upgrade to a paid AnalyzeUp plan for the first time and find that our platform does not suit your business workflow, simply contact us at <a href="mailto:billing@analyzeup.com" className="text-primary font-semibold hover:underline">billing@analyzeup.com</a> within seven (7) calendar days of your initial payment. We will issue a 100% full refund with zero questions asked.
            </p>
          </div>
          <p className="text-xs">
            <strong className="text-foreground">Subsequent Recurring Renewals:</strong> Monthly renewal charges are non-refundable once billed, as computational and synchronization resources are allocated for your store immediately upon cycle commencement. In the rare event of verified platform-wide technical unavailability lasting greater than 48 continuous hours, proportional service credits or refunds will be approved.
          </p>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 9. Taxes, Invoicing & GST Compliance */}
      <section id="taxes-gst" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <Receipt className="w-4 h-4" /> Section 09
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          9. Taxes, Invoicing & GST Compliance
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Tax Invoicing:</strong> All payments generate a formal tax invoice accessible directly in your billing history. Indian businesses can provide their Goods and Services Tax Identification Number (GSTIN) during checkout or in workspace business profile settings to claim Input Tax Credit (ITC).
          </p>
          <p>
            Applicable statutory taxes (such as 18% Goods and Services Tax in India) will be itemized clearly on all invoices in compliance with Indian tax legislation. International customers are responsible for any local withholding taxes or cross-border duties applicable in their jurisdiction.
          </p>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 10. Payment Failure & Grace Periods */}
      <section id="payment-failure" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4" /> Section 10
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          10. Payment Failure & Grace Periods
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            If an automated recurring renewal charge is declined:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-xs">
            <li>Our billing engine automatically retries the payment transaction at 24-hour and 72-hour intervals.</li>
            <li>We provide a three (3) business day courtesy grace period during which your sync engine and dashboard access remain fully operational.</li>
            <li>If payment is not resolved within the grace period, workspace status transitions to `PAST_DUE`, temporarily pausing automated outbound syncs while allowing account administrators to update payment details.</li>
          </ol>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 11. Price Modifications */}
      <section id="price-changes" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <CreditCard className="w-4 h-4" /> Section 11
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          11. Price Modifications & Advance Notice
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            AnalyzeUp reserves the right to adjust subscription rates or feature allocations. Any price changes will be communicated to workspace owners at least thirty (30) calendar days in advance via email and dashboard announcements. Existing active subscribers will be grandfathered for the duration of their contracted term.
          </p>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 12. Enterprise Custom Agreements */}
      <section id="enterprise" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <Users className="w-4 h-4" /> Section 12
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          12. Enterprise Custom Agreements & Volume Licensing
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            Enterprises managing more than 250,000 SKUs, multi-brand holding groups, or requiring custom on-premise ERP connectors can request customized Service Level Agreements (SLAs), custom invoicing terms (Net-30 / Wire Transfer), and dedicated engineering support by contacting <a href="mailto:enterprise@analyzeup.com" className="text-primary font-semibold hover:underline">enterprise@analyzeup.com</a>.
          </p>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* 13. Billing Contact Desk */}
      <section id="contact-billing" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2.5 text-primary font-bold text-sm uppercase tracking-wider">
          <HelpCircle className="w-4 h-4" /> Section 13
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          13. Billing Support & Contact Desk
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            Have a question regarding an invoice, payment receipt, or refund? Contact our dedicated billing desk:
          </p>
          <div className="p-4 rounded-xl border border-border/40 bg-secondary/20 text-xs space-y-1">
            <p className="font-semibold text-foreground">AnalyzeUp Billing Operations Desk</p>
            <p>Email: <a href="mailto:billing@analyzeup.com" className="text-primary font-medium hover:underline">billing@analyzeup.com</a></p>
            <p>Payment Inquiries SLA: Within 1 business day</p>
            <p>Tax / GST Desk: <a href="mailto:tax@analyzeup.com" className="text-primary font-medium hover:underline">tax@analyzeup.com</a></p>
          </div>
        </div>
      </section>
    </LegalPageShell>
  );
}
