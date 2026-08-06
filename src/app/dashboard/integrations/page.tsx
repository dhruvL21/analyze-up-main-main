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
import { Input } from '@/components/ui/input';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import {
  ShoppingBag,
  Store,
  Boxes,
  Layers,
  Search,
  CheckCircle2,
  Bell,
  Sparkles,
  ExternalLink,
  Lock,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface IntegrationItem {
  id: string;
  name: string;
  category: 'E-commerce' | 'Marketplace' | 'Accounting' | 'POS';
  description: string;
  status: 'Available' | 'Coming Soon';
  icon: string;
  color: string;
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'E-commerce',
    description: 'Sync products, inventory levels, variants, images & sales orders automatically.',
    status: 'Available',
    icon: '🛍️',
    color: 'emerald',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    category: 'E-commerce',
    description: 'Connect WordPress WooCommerce store for bi-directional stock updates.',
    status: 'Coming Soon',
    icon: '🛒',
    color: 'purple',
  },
  {
    id: 'amazon',
    name: 'Amazon Seller Central',
    category: 'Marketplace',
    description: 'FBA & FBM inventory synchronization, return tracking, and revenue feeds.',
    status: 'Coming Soon',
    icon: '📦',
    color: 'amber',
  },
  {
    id: 'flipkart',
    name: 'Flipkart Seller Hub',
    category: 'Marketplace',
    description: 'Sync Flipkart listings, order dispatches, and warehouse stock allocations.',
    status: 'Coming Soon',
    icon: '⚡',
    color: 'blue',
  },
  {
    id: 'zoho',
    name: 'Zoho Inventory',
    category: 'Accounting',
    description: 'Auto-sync invoices, purchase orders, billings, and multi-location warehouses.',
    status: 'Coming Soon',
    icon: '💼',
    color: 'rose',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    category: 'Accounting',
    description: 'Automated COGS ledger updates, tax reports, and supplier invoice reconciliations.',
    status: 'Coming Soon',
    icon: '📊',
    color: 'green',
  },
  {
    id: 'tally',
    name: 'Tally Prime / ERP 9',
    category: 'Accounting',
    description: 'Direct voucher import/export for Indian GST & accounting compliance.',
    status: 'Coming Soon',
    icon: '🧾',
    color: 'amber',
  },
  {
    id: 'pos',
    name: 'Retail POS Systems',
    category: 'POS',
    description: 'Live barcode scanner terminal sync for offline retail stores & checkout desks.',
    status: 'Coming Soon',
    icon: '🖥️',
    color: 'indigo',
  },
];

export default function IntegrationsPage() {
  const { businessProfile, setShowShopifyModal } = useData();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredIntegrations = INTEGRATIONS.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleNotifyMe = (name: string) => {
    toast({
      title: 'Notification Request Saved',
      description: `We will notify you as soon as the ${name} integration is live!`,
    });
  };

  const isShopifyConnected = businessProfile?.shopifyStatus === 'Connected';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            Integrations & Channels
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5">
              AnalyzeUp 2.0
            </Badge>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Connect your storefronts, market channels, accounting software & POS systems to power AI predictions.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-secondary/50 border border-border/40">
        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Search integrations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs rounded-xl"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'E-commerce', 'Marketplace', 'Accounting', 'POS'].map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="rounded-xl text-xs px-3 h-8 shrink-0"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Available Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-emerald-500" />
          Available Integrations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="ios-glass border-emerald-500/30 hover:border-emerald-500/60 transition-all rounded-2xl overflow-hidden relative group">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    🛍️
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      Shopify
                      {isShopifyConnected ? (
                        <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px] gap-1 py-0 px-2">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]">
                          Available
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">E-commerce Platform Sync</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Sync catalog, live stock levels, sales orders & variants automatically from your Shopify storefront.
              </p>

              {isShopifyConnected ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-600 font-semibold">
                    <span>Store: {businessProfile?.shopifyStoreName}</span>
                    <span className="font-mono text-[11px]">{businessProfile?.shopifyStoreUrl}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Live webhook sync active.</p>
                </div>
              ) : null}

              <Button
                onClick={() => setShowShopifyModal(true)}
                className="w-full rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {isShopifyConnected ? 'Manage Shopify Settings' : 'Connect Shopify Store'}
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="space-y-3 pt-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-muted-foreground" />
          Coming Soon & Planned Expansion
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIntegrations
            .filter((item) => item.status === 'Coming Soon')
            .map((item) => (
              <Card key={item.id} className="bg-secondary/30 border-border/40 rounded-2xl opacity-90 hover:opacity-100 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="text-2xl p-2 rounded-xl bg-secondary border border-border/40">
                        {item.icon}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">{item.name}</CardTitle>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground mt-0.5">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Coming Soon
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground min-h-[36px]">{item.description}</p>
                  <Button
                    variant="outline"
                    onClick={() => handleNotifyMe(item.name)}
                    className="w-full rounded-xl text-xs gap-1.5 border-border/60 hover:bg-secondary"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    Notify Me When Available
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
