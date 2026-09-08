'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AnalyzeUpIcon } from './analyze-up-icon';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  CheckCircle2,
  Lock,
  Globe,
  BarChart3,
  Boxes,
  Truck,
  Layers,
  Crown,
  CreditCard,
  FileText,
  Scale,
  ExternalLink,
  ChevronRight,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface LegalModalContent {
  type: 'terms' | 'privacy' | 'subscription';
  title: string;
  badge: string;
  subtitle: string;
  description: string;
  highlights: string[];
  fullPageRoute: string;
}

const LEGAL_DETAILS: Record<'terms' | 'privacy' | 'subscription', LegalModalContent> = {
  terms: {
    type: 'terms',
    title: 'Terms of Service',
    badge: 'Official SaaS Agreement',
    subtitle: 'Clear, transparent rules governing your AnalyzeUp workspace and integrations.',
    description:
      'Our Terms of Service establish the legal framework for accessing the AnalyzeUp Intelligence Platform, ensuring your business data is protected while defining platform usage boundaries.',
    highlights: [
      '100% Merchant Data Ownership: You retain complete intellectual property and ownership over your catalog, orders, and sales telemetry.',
      'Strict Multi-Tenant Isolation: Data is cryptographically partitioned; no other merchant or tenant can view or access your records.',
      'Shopify 2026-07 API Compliance: We strictly adhere to Shopify least-privilege OAuth scopes (read_products, read_orders, read_inventory, read_locations, write_inventory).',
      'AI Copilot Operational Disclaimer: AI demand forecasts and restock suggestions are automated decision-support aids designed to guide procurement without replacing executive discretion.',
      'No Hidden Penalties: 99.9% target uptime SLA with clear service boundaries and fair cancellation terms.',
    ],
    fullPageRoute: '/terms',
  },
  privacy: {
    type: 'privacy',
    title: 'Privacy Policy',
    badge: 'Enterprise Data Protection',
    subtitle: 'How we collect, encrypt, isolate, and protect your commercial records.',
    description:
      'We treat merchant data with bank-grade security. We never sell your sales data, never broker customer records, and strictly enforce data segregation across our cloud architecture.',
    highlights: [
      'Zero Model Training: Your proprietary business data is NEVER used to train public foundation AI models (e.g. OpenAI or Google).',
      'AES-256 Token Vaulting: Offline Shopify merchant access tokens are encrypted with military-grade AES-256-GCM and never exposed to browser sessions.',
      'Strict Multi-Tenant Boundaries: Firebase Firestore database rules prevent cross-tenant data reads or writes at the engine level.',
      'Automated 48-Hour Purge: When an app is uninstalled from Shopify, tokens are immediately revoked and all cached data is permanently purged within 48 hours.',
      'Full Data Portability: Export your inventory, purchase orders, and audit logs at any time in standard CSV and Excel formats.',
    ],
    fullPageRoute: '/privacy',
  },
  subscription: {
    type: 'subscription',
    title: 'Subscription Terms & Billing Policy',
    badge: 'Transparent Pricing & Plans',
    subtitle: 'Honest billing cycles, free trials, cancellations, and refund protections.',
    description:
      'AnalyzeUp provides straightforward, predictable monthly plans with zero hidden fees, automated recurring billing via Razorpay, and a merchant-first refund guarantee.',
    highlights: [
      '14-Day Free Trial: Test all features, forecast demand, and sync your Shopify store with zero credit card required to start.',
      'Predictable Monthly Tiers: Starter (₹1,499/mo | $19), Growth (₹3,999/mo | $49), and Enterprise Pro (₹8,999/mo | $99).',
      '1-Click Self-Service Cancellation: Cancel anytime directly in Dashboard > Billing with zero cancellation fees or lock-ins.',
      '7-Day Money-Back Guarantee: If your first paid month does not fit your workflow, request a 100% refund within 7 days.',
      'GST Tax Invoicing: Automatic GST-compliant tax invoices for Indian registered businesses to claim Input Tax Credit (ITC).',
    ],
    fullPageRoute: '/subscription-terms',
  },
};

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [activeModal, setActiveModal] = useState<LegalModalContent | null>(null);

  const openModal = (type: 'terms' | 'privacy' | 'subscription') => {
    setActiveModal(LEGAL_DETAILS[type]);
  };

  return (
    <footer className="w-full bg-background border-t border-border/40 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Pre-Footer Call to Action Banner */}
      <div className="container px-4 md:px-6 mx-auto pt-16 pb-12">
        <div className="relative rounded-3xl border border-primary/25 bg-gradient-to-br from-card/90 via-secondary/20 to-card/90 p-8 md:p-12 shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Next-Gen Retail Intelligence
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                Supercharge Your Business With <span className="text-primary">AnalyzeUp</span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
                Join forward-thinking e-commerce brands and retailers eliminating dead stock, automating reorders, and boosting gross margins with autonomous AI guidance.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 14-Day Free Trial
                </div>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No Credit Card Required
                </div>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Universal Data Import
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center lg:items-end">
              <Link href="/register" className="w-full sm:w-auto lg:w-full">
                <Button size="lg" className="w-full bg-primary text-primary-foreground font-bold hover:brightness-110 shadow-lg shadow-primary/20 gap-2 h-11">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto lg:w-full">
                <Button size="lg" variant="outline" className="w-full border-border/60 hover:bg-secondary/60 text-foreground font-semibold h-11">
                  Explore Live Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Footer Grid */}
      <div className="container px-4 md:px-6 mx-auto pt-8 pb-10 border-t border-border/30">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand & Platform Summary */}
          <div className="col-span-2 md:col-span-4 lg:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <AnalyzeUpIcon className="h-7 w-7 text-primary" />
              <span className="font-extrabold text-xl tracking-tight text-foreground">AnalyzeUp</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Autonomous inventory analytics, dead-stock prevention, demand forecasting, and executive decision intelligence copilot designed for growing commerce.
            </p>
          </div>

          {/* Column: Core Modules */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" /> Executive Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/inventory" className="hover:text-primary transition-colors flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-primary" /> Stock & Operations
                </Link>
              </li>
              <li>
                <Link href="/dashboard/suppliers" className="hover:text-primary transition-colors flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-primary" /> Supplier Network
                </Link>
              </li>
              <li>
                <Link href="/dashboard/executive" className="hover:text-primary transition-colors flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-primary" /> Strategic Intelligence
                </Link>
              </li>
              <li>
                <Link href="/dashboard/billing" className="hover:text-primary transition-colors flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-primary" /> Pricing & Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Column: Data & Integrations */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Integrations</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/dashboard/connect" className="hover:text-primary transition-colors">
                  Shopify Store Sync
                </Link>
              </li>
              <li>
                <Link href="/dashboard/connect" className="hover:text-primary transition-colors">
                  Zoho Inventory
                </Link>
              </li>
              <li>
                <Link href="/dashboard/connect" className="hover:text-primary transition-colors">
                  Tally ERP Connector
                </Link>
              </li>
              <li>
                <Link href="/dashboard/connect" className="hover:text-primary transition-colors">
                  AI CSV & Excel Parser
                </Link>
              </li>
              <li>
                <Link href="/dashboard/connect" className="hover:text-primary transition-colors">
                  REST API & Webhooks
                </Link>
              </li>
            </ul>
          </div>

          {/* Column: Trust & Security */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Security & Trust</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/dashboard/executive" className="hover:text-primary transition-colors">
                  Multi-Tenant Isolation
                </Link>
              </li>
              <li>
                <Link href="/dashboard/billing" className="hover:text-primary transition-colors">
                  Razorpay PCI-DSS Compliance
                </Link>
              </li>
              <li>
                <Link href="/dashboard/executive" className="hover:text-primary transition-colors">
                  Automated Audit Trail
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Enterprise SSO Access
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-primary transition-colors">
                  Create Workspace
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Prominent Legal & Policies Cards Section with Full Descriptions */}
      <div className="container px-4 md:px-6 mx-auto pb-10">
        <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/30 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Governance, Legal Policies & Merchant Transparency
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              Click any policy below to view detailed descriptions or full documentation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Terms of Service */}
            <div className="p-4 rounded-xl border border-border/50 bg-secondary/20 hover:border-primary/40 transition-all flex flex-col justify-between space-y-3 group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Terms of Service</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 border-primary/20 text-primary">
                    SaaS Agreement
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Comprehensive provisions governing multi-tenant workspace access, 100% merchant data ownership, Shopify 2026-07 API compliance, role-based security, and acceptable use.
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/20 text-xs">
                <button
                  type="button"
                  onClick={() => openModal('terms')}
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Quick Preview
                </button>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Full Document <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Card 2: Privacy Policy */}
            <div className="p-4 rounded-xl border border-border/50 bg-secondary/20 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3 group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Privacy Policy</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                    Data Protection
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Strict tenant isolation, AES-256 encrypted OAuth token vaulting, zero AI model training on customer data, and automatic 48-hour data purge upon Shopify app uninstall.
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/20 text-xs">
                <button
                  type="button"
                  onClick={() => openModal('privacy')}
                  className="text-emerald-400 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Quick Preview
                </button>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Full Document <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Card 3: Subscription Terms */}
            <div className="p-4 rounded-xl border border-border/50 bg-secondary/20 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>Subscription Terms</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 border-amber-500/20 text-amber-400">
                    Pricing & Refunds
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  14-day free trial without credit card, transparent tiers (Starter ₹1,499, Growth ₹3,999, Pro ₹8,999), 1-click cancellation, and 7-day money-back guarantee.
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/20 text-xs">
                <button
                  type="button"
                  onClick={() => openModal('subscription')}
                  className="text-amber-400 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Quick Preview
                </button>
                <Link
                  href="/subscription-terms"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Full Document <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Copyright & Direct Legal Strip */}
      <div className="border-t border-border/40 bg-secondary/15 py-6">
        <div className="container px-4 md:px-6 mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            &copy; {currentYear} AnalyzeUp Intelligence Platform. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => openModal('terms')}
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Terms of Service
            </button>
            <span className="text-muted-foreground/40 hidden sm:inline">&bull;</span>
            <button
              type="button"
              onClick={() => openModal('privacy')}
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Privacy Policy
            </button>
            <span className="text-muted-foreground/40 hidden sm:inline">&bull;</span>
            <button
              type="button"
              onClick={() => openModal('subscription')}
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Subscription Terms
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Quick-Preview Legal Modal */}
      {activeModal && (
        <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 md:p-8 bg-card border-border/60 shadow-2xl">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-semibold uppercase bg-primary/10 border-primary/25 text-primary">
                  {activeModal.badge}
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {activeModal.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {activeModal.subtitle}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4 text-xs md:text-sm text-muted-foreground border-y border-border/30">
              <div className="p-3.5 rounded-xl border border-border/40 bg-secondary/25 text-foreground leading-relaxed font-medium">
                {activeModal.description}
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Key Protections & Governance Highlights
                </h4>
                <ul className="space-y-2">
                  {activeModal.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveModal(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close Summary
              </Button>
              <Link href={activeModal.fullPageRoute} onClick={() => setActiveModal(null)}>
                <Button size="sm" className="text-xs font-semibold gap-1.5">
                  Open Full {activeModal.title} Document <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </footer>
  );
}
