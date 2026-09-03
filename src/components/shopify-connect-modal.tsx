'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  Store,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Key,
  Globe,
  Unlink,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export function ShopifyConnectModal() {
  const {
    showShopifyModal,
    setShowShopifyModal,
    businessProfile,
    updateBusinessProfile,
    bulkAddProducts,
    bulkAddTransactions,
  } = useData();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const isConnected = Boolean(
    businessProfile?.shopifyConnected || businessProfile?.shopifyStatus === 'Connected'
  );

  const [activeTab, setActiveTab] = useState<'oauth' | 'token'>('oauth');
  const [storeUrl, setStoreUrl] = useState(businessProfile?.shopifyStoreUrl || '');
  const [accessToken, setAccessToken] = useState(businessProfile?.shopifyAccessToken || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const cleanShopDomain = (input: string): string => {
    let clean = input.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean.includes('.myshopify.com')) {
      clean = `${clean}.myshopify.com`;
    }
    return clean;
  };

  // 1. Initiate One-Click OAuth Flow
  const handleOAuthConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeUrl.trim()) {
      toast({
        variant: 'destructive',
        title: 'Store URL Required',
        description: 'Please enter your Shopify store name or URL (e.g. your-store.myshopify.com).',
      });
      return;
    }

    const shop = cleanShopDomain(storeUrl);
    setIsSubmitting(true);

    const userId = user?.uid || 'default_user';
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(shop)}&userId=${encodeURIComponent(userId)}`;
  };

  // 2. Direct Admin API Token Verification & Connection
  const handleTokenConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeUrl.trim()) {
      toast({
        variant: 'destructive',
        title: 'Store URL Required',
        description: 'Please enter your Shopify store URL.',
      });
      return;
    }
    if (!accessToken.trim()) {
      toast({
        variant: 'destructive',
        title: 'Access Token Required',
        description: 'Please enter your Admin API Access Token (starts with shpat_).',
      });
      return;
    }

    const shop = cleanShopDomain(storeUrl);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/shopify/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop,
          accessToken: accessToken.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Shopify verification failed. Please check credentials.');
      }

      const shopData = data.shop;
      const storeName = shopData.name || shop.replace('.myshopify.com', '');

      // Save connection in Firestore
      if (user && firestore) {
        const connectionRef = doc(firestore, 'users', user.uid, 'integrations', 'shopify');
        await setDoc(
          connectionRef,
          {
            userId: user.uid,
            provider: 'shopify',
            shopDomain: shop,
            storeName,
            storeEmail: shopData.email || '',
            currency: shopData.currency || 'USD',
            accessToken: accessToken.trim(),
            connectionStatus: 'Connected',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // Update business profile state
      await updateBusinessProfile({
        shopifyConnected: true,
        shopifyStoreUrl: shop,
        shopifyStoreName: storeName,
        shopifyStatus: 'Connected',
        shopifyAccessToken: accessToken.trim(),
      });

      toast({
        title: 'Shopify Connected! 🛍️',
        description: `Successfully verified and connected "${storeName}" (${shop}).`,
      });

      // Automatically trigger initial sync
      triggerSync(shop, accessToken.trim());
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: err?.message || 'Could not verify Shopify store credentials.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Trigger Manual Catalog & Orders Sync
  const triggerSync = async (shopOverride?: string, tokenOverride?: string) => {
    const shop = shopOverride || businessProfile?.shopifyStoreUrl;
    const token = tokenOverride || businessProfile?.shopifyAccessToken;

    if (!shop || !token) {
      toast({
        variant: 'destructive',
        title: 'Missing Credentials',
        description: 'Store URL or access token is missing. Please reconnect your store.',
      });
      return;
    }

    setIsSyncing(true);
    toast({
      title: 'Syncing Shopify Data...',
      description: 'Fetching product catalog, live inventory levels, and customer orders.',
    });

    try {
      const res = await fetch('/api/shopify/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, accessToken: token }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync with Shopify.');
      }

      const { products = [], transactions = [], stats } = data;

      // Ingest canonical products and transactions into DataContext
      if (products.length > 0) {
        await bulkAddProducts(products, true);
      }
      if (transactions.length > 0) {
        await bulkAddTransactions(transactions);
      }

      await updateBusinessProfile({
        shopifyLastSyncedAt: new Date().toISOString(),
        shopifyStatus: 'Connected',
      });

      toast({
        title: 'Shopify Sync Complete! 🎉',
        description: `Synchronized ${stats?.canonicalProductsCount || products.length} products and ${stats?.canonicalTransactionsCount || transactions.length} orders into your workspace.`,
      });
    } catch (err: any) {
      console.error('[Shopify Sync Error]:', err);
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: err?.message || 'Failed to pull data from Shopify API.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Disconnect Shopify Store
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this Shopify store? Synchronized data will remain in your workspace.')) {
      return;
    }

    try {
      if (user && firestore) {
        const connectionRef = doc(firestore, 'users', user.uid, 'integrations', 'shopify');
        await setDoc(
          connectionRef,
          {
            connectionStatus: 'Disconnected',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      await updateBusinessProfile({
        shopifyConnected: false,
        shopifyStoreUrl: '',
        shopifyStoreName: '',
        shopifyStatus: 'Disconnected',
        shopifyAccessToken: undefined,
      });

      setStoreUrl('');
      setAccessToken('');
      setShowShopifyModal(false);

      toast({
        title: 'Shopify Disconnected',
        description: 'Store integration has been disconnected.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Disconnect Error',
        description: err?.message || 'Failed to disconnect Shopify.',
      });
    }
  };

  return (
    <Dialog open={showShopifyModal} onOpenChange={setShowShopifyModal}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto ios-glass rounded-3xl border border-border/50 p-6 shadow-2xl">
        <DialogHeader className="text-left pb-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                Shopify Integration
                {isConnected && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] gap-1 py-0 px-2">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Sync catalog, live stock levels, sales orders & variants automatically from Shopify.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* --- VIEW A: STORE IS ALREADY CONNECTED --- */}
        {isConnected ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground block">Connected Store</span>
                  <h4 className="text-base font-bold text-foreground">
                    {businessProfile?.shopifyStoreName || 'Shopify Storefront'}
                  </h4>
                  <span className="text-xs font-mono text-emerald-400">
                    {businessProfile?.shopifyStoreUrl}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Store className="w-5 h-5" />
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync Active
                </span>
                <span>
                  {businessProfile?.shopifyLastSyncedAt
                    ? `Last synced: ${new Date(businessProfile.shopifyLastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Ready to sync'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/40 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Integrated Permissions</span>
              </div>
              <ul className="text-muted-foreground text-[11px] grid grid-cols-2 gap-1 list-disc pl-4">
                <li>Catalog & Product Variants</li>
                <li>Live Inventory Counts</li>
                <li>Customer Sales Orders</li>
                <li>Dead-Stock Recalculation</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={() => triggerSync()}
                disabled={isSyncing}
                className="flex-1 rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 h-10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing Catalog & Orders...' : 'Sync Now'}
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isSyncing}
                className="rounded-xl text-xs font-semibold gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 h-10"
              >
                <Unlink className="w-3.5 h-3.5" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          /* --- VIEW B: CONNECT NEW SHOPIFY STORE (DUAL TABS) --- */
          <div className="space-y-4 pt-1">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'oauth' | 'token')}>
              <TabsList className="grid grid-cols-2 w-full rounded-2xl bg-secondary/40 p-1 border border-border/40">
                <TabsTrigger
                  value="oauth"
                  className="rounded-xl text-xs font-semibold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Globe className="w-3.5 h-3.5" />
                  One-Click OAuth
                </TabsTrigger>
                <TabsTrigger
                  value="token"
                  className="rounded-xl text-xs font-semibold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Key className="w-3.5 h-3.5" />
                  Admin API Token
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: ONE-CLICK OAUTH */}
              <TabsContent value="oauth" className="space-y-4 pt-3 mt-0">
                <form onSubmit={handleOAuthConnect} className="space-y-3.5">
                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="oauth-store-url" className="text-xs font-semibold text-foreground">
                      Shopify Store Domain
                    </Label>
                    <div className="relative">
                      <Input
                        id="oauth-store-url"
                        placeholder="your-store-name.myshopify.com"
                        value={storeUrl}
                        onChange={(e) => setStoreUrl(e.target.value)}
                        className="pl-9 text-xs rounded-xl h-10 bg-secondary/30 border-border/50 focus:border-primary/50"
                        required
                      />
                      <Store className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Enter your store name (e.g. <code>gullycart</code> or <code>gullycart.myshopify.com</code>).
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5" /> Automatic Partner App Authorization
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      You will be securely redirected to Shopify to approve catalog & orders read access for AnalyzeUp.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 h-10"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Redirecting to Shopify...
                      </>
                    ) : (
                      <>
                        Connect via Shopify OAuth
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* TAB 2: CUSTOM APP ADMIN API TOKEN */}
              <TabsContent value="token" className="space-y-4 pt-3 mt-0">
                <form onSubmit={handleTokenConnect} className="space-y-3.5">
                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="token-store-url" className="text-xs font-semibold text-foreground">
                      Shopify Store Domain
                    </Label>
                    <div className="relative">
                      <Input
                        id="token-store-url"
                        placeholder="your-store-name.myshopify.com"
                        value={storeUrl}
                        onChange={(e) => setStoreUrl(e.target.value)}
                        className="pl-9 text-xs rounded-xl h-10 bg-secondary/30 border-border/50 focus:border-primary/50"
                        required
                      />
                      <Store className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="access-token" className="text-xs font-semibold text-foreground">
                      Admin API Access Token
                    </Label>
                    <div className="relative">
                      <Input
                        id="access-token"
                        type="password"
                        placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        className="pl-9 text-xs rounded-xl h-10 bg-secondary/30 border-border/50 focus:border-primary/50 font-mono"
                        required
                      />
                      <Key className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      From your store: <strong>Settings → Develop apps → API credentials</strong>.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 h-10"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Verifying Credentials...
                      </>
                    ) : (
                      <>
                        Verify & Connect Store
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="pt-2 border-t border-border/30">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowShopifyModal(false)}
            className="w-full rounded-xl text-xs h-9 border border-border/40 hover:bg-secondary text-muted-foreground"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
