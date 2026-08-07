'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useData } from '@/context/data-context';
import { BusinessType, BusinessSize } from '@/lib/types';
import { INDUSTRY_CONFIGS } from '@/lib/industry-intelligence';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  Building2,
  PackagePlus,
  FileSpreadsheet,
  ShoppingBag,
  Sparkle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Globe,
  DollarSign,
  Clock,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const BUSINESS_TYPES: BusinessType[] = [
  'Retail',
  'Wholesale',
  'Manufacturing',
  'Restaurant',
  'Cafe',
  'Electronics',
  'Fashion',
  'Beauty',
  'Medical',
  'Hardware',
  'Automotive',
  'Sports',
  'Books',
  'Furniture',
  'Other',
];

const BUSINESS_SIZES: BusinessSize[] = [
  'Solo',
  '2-10 Employees',
  '11-50 Employees',
  '50+',
];

const CURRENCIES = [
  { code: 'INR (₹)', symbol: '₹' },
  { code: 'USD ($)', symbol: '$' },
  { code: 'EUR (€)', symbol: '€' },
  { code: 'GBP (£)', symbol: '£' },
  { code: 'AED (Dhs)', symbol: 'Dhs' },
  { code: 'CAD ($)', symbol: 'C$' },
  { code: 'AUD ($)', symbol: 'A$' },
];

export function SmartOnboardingWizard() {
  const {
    showOnboardingWizard,
    setShowOnboardingWizard,
    businessProfile,
    updateBusinessProfile,
    loadDemoBusiness,
    setShowShopifyModal,
    setShowWelcomeModal,
  } = useData();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [businessName, setBusinessName] = useState(businessProfile?.businessName || '');
  const [businessType, setBusinessType] = useState<BusinessType>(businessProfile?.businessType || 'Retail');
  const [industry, setIndustry] = useState(businessProfile?.industry || 'General Retail');
  const [businessSize, setBusinessSize] = useState<BusinessSize>(businessProfile?.businessSize || '2-10 Employees');
  const [currency, setCurrency] = useState(businessProfile?.currency || 'INR (₹)');
  const [timezone, setTimezone] = useState(businessProfile?.timezone || 'Asia/Kolkata (GMT+5:30)');
  const [country, setCountry] = useState(businessProfile?.country || 'India');
  const [language, setLanguage] = useState(businessProfile?.language || 'English');
  const [logoUrl, setLogoUrl] = useState(businessProfile?.logoUrl || '');

  // Auto update industry description when businessType changes
  useEffect(() => {
    if (INDUSTRY_CONFIGS[businessType]) {
      setIndustry(INDUSTRY_CONFIGS[businessType].label);
    }
  }, [businessType]);

  // Auto-save form fields locally as user types
  const handleAutoSave = () => {
    updateBusinessProfile({
      businessName: businessName || 'My Business',
      businessType,
      industry,
      businessSize,
      currency,
      timezone,
      country,
      language,
      logoUrl,
      onboardingStep: step,
    });
  };

  const handleNextStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      toast({ variant: 'destructive', title: 'Business Name Required', description: 'Please enter your business or store name.' });
      return;
    }
    handleAutoSave();
    setStep(2);
  };

  const handleSelectSetupMethod = async (method: 'manual' | 'csv' | 'shopify' | 'demo') => {
    setLoading(true);
    try {
      await updateBusinessProfile({
        businessName: businessName || 'My Business',
        businessType,
        industry,
        businessSize,
        currency,
        timezone,
        country,
        language,
        logoUrl,
        inventorySetupMethod: method,
        isOnboardingCompleted: true,
      });

      setShowOnboardingWizard(false);

      if (method === 'demo') {
        await loadDemoBusiness(businessType);
      } else if (method === 'shopify') {
        setShowShopifyModal(true);
      } else if (method === 'csv') {
        router.push('/dashboard/inventory?action=import');
        toast({ title: 'Setup Complete', description: 'Opening CSV / Excel import wizard.' });
      } else {
        setShowWelcomeModal(true);
      }
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Setup Error', description: 'Failed to complete business setup.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await updateBusinessProfile({
      businessName: businessName || 'My Business',
      businessType,
      isOnboardingCompleted: true,
    });
    setShowOnboardingWizard(false);
    toast({ title: 'Wizard Paused', description: 'You can update your business profile anytime in Settings.' });
  };

  if (!showOnboardingWizard) return null;

  return (
    <Dialog open={showOnboardingWizard} onOpenChange={setShowOnboardingWizard}>
      <DialogContent className="sm:max-w-xl ios-glass rounded-3xl border border-primary/20 p-6 md:p-8 shadow-2xl overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Progress Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                {step === 1 ? 'Smart Business Setup' : 'Choose Inventory Setup Method'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {step === 1 ? 'Step 1 of 2 — Personalize your AI Business Copilot' : 'Step 2 of 2 — How would you like to populate your catalog?'}
              </DialogDescription>
            </div>
          </div>

          <Badge variant="outline" className="bg-secondary/60 text-xs px-3 py-1 font-medium">
            Step {step} / 2
          </Badge>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNextStep1} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Business Name */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="biz-name" className="text-xs font-semibold">Business Name *</Label>
                <Input
                  id="biz-name"
                  placeholder="e.g. Apex Apparel & Accessories"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                  }}
                  onBlur={handleAutoSave}
                  className="rounded-xl text-sm"
                  required
                />
              </div>

              {/* Business Type */}
              <div className="space-y-1.5">
                <Label htmlFor="biz-type" className="text-xs font-semibold">Business Type</Label>
                <Select
                  value={businessType}
                  onValueChange={(val: BusinessType) => {
                    setBusinessType(val);
                    handleAutoSave();
                  }}
                >
                  <SelectTrigger id="biz-type" className="rounded-xl text-sm">
                    <SelectValue placeholder="Select Business Type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {BUSINESS_TYPES.map((bt) => (
                      <SelectItem key={bt} value={bt}>
                        {bt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Business Size */}
              <div className="space-y-1.5">
                <Label htmlFor="biz-size" className="text-xs font-semibold">Team / Business Size</Label>
                <Select
                  value={businessSize}
                  onValueChange={(val: BusinessSize) => {
                    setBusinessSize(val);
                    handleAutoSave();
                  }}
                >
                  <SelectTrigger id="biz-size" className="rounded-xl text-sm">
                    <SelectValue placeholder="Select Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_SIZES.map((bs) => (
                      <SelectItem key={bs} value={bs}>
                        {bs}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <Label htmlFor="biz-currency" className="text-xs font-semibold">Base Currency</Label>
                <Select
                  value={currency}
                  onValueChange={(val) => {
                    setCurrency(val);
                    handleAutoSave();
                  }}
                >
                  <SelectTrigger id="biz-currency" className="rounded-xl text-sm">
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <Label htmlFor="biz-country" className="text-xs font-semibold">Country</Label>
                <Input
                  id="biz-country"
                  placeholder="e.g. India, United States"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  onBlur={handleAutoSave}
                  className="rounded-xl text-sm"
                />
              </div>

              {/* Logo URL Optional */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="biz-logo" className="text-xs font-semibold">Logo Image URL (Optional)</Label>
                <Input
                  id="biz-logo"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  onBlur={handleAutoSave}
                  className="rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Industry AI Intelligence Info Box */}
            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/15 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-primary">Tailored AI Insights Active</p>
                <p className="text-muted-foreground">{INDUSTRY_CONFIGS[businessType]?.aiPriority}</p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" onClick={handleSkip} className="rounded-xl text-xs text-muted-foreground">
                Skip for now
              </Button>
              <Button type="submit" className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground shadow-md">
                Next: Inventory Setup
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Select how you want to initialize your products. You can always import or create more products anytime.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Option 1: Manual Entry */}
              <button
                type="button"
                onClick={() => handleSelectSetupMethod('manual')}
                disabled={loading}
                className="p-4 rounded-2xl bg-secondary/40 hover:bg-secondary/80 border border-border/50 text-left transition-all hover:scale-[1.02] flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <PackagePlus className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Startup / &lt;100 SKUs</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Manual Entry</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Add products step-by-step with enhanced SKU, unit & supplier fields.</p>
                </div>
              </button>

              {/* Option 2: Excel / CSV Import */}
              <button
                type="button"
                onClick={() => handleSelectSetupMethod('csv')}
                disabled={loading}
                className="p-4 rounded-2xl bg-secondary/40 hover:bg-secondary/80 border border-border/50 text-left transition-all hover:scale-[1.02] flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Most Popular</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Import CSV / Excel</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Download our official template & bulk import products in seconds.</p>
                </div>
              </button>

              {/* Option 3: Shopify Connection */}
              <button
                type="button"
                onClick={() => handleSelectSetupMethod('shopify')}
                disabled={loading}
                className="p-4 rounded-2xl bg-secondary/40 hover:bg-secondary/80 border border-border/50 text-left transition-all hover:scale-[1.02] flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Shopify Sync</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Connect Shopify</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Automatically sync products, orders, categories & live stock levels.</p>
                </div>
              </button>

              {/* Option 4: Explore Demo Business */}
              <button
                type="button"
                onClick={() => handleSelectSetupMethod('demo')}
                disabled={loading}
                className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/15 to-primary/10 hover:brightness-110 border border-primary/30 text-left transition-all hover:scale-[1.02] flex flex-col justify-between space-y-3 group shadow-md"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <Zap className="w-5 h-5" />
                  </div>
                  <Badge className="bg-primary text-primary-foreground text-[10px]">Instant Evaluation</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1">
                    Explore Demo Business
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-load 200+ realistic products, 15+ suppliers & 500+ orders to test AI features.</p>
                </div>
              </button>
            </div>

            {/* Back & Skip Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-xl text-xs gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Profile
              </Button>
              <Button type="button" variant="ghost" onClick={handleSkip} className="rounded-xl text-xs text-muted-foreground">
                Explore Empty Workspace
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
