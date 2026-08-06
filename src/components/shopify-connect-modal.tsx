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
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { Store, ShoppingBag, ArrowRight, CheckCircle2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export function ShopifyConnectModal() {
  const { showShopifyModal, setShowShopifyModal, businessProfile, updateBusinessProfile } = useData();
  const { toast } = useToast();

  const [storeUrl, setStoreUrl] = useState(businessProfile?.shopifyStoreUrl || '');
  const [storeName, setStoreName] = useState(businessProfile?.shopifyStoreName || '');
  const [isConnecting, setIsConnecting] = useState(false);

  const currentStatus = businessProfile?.shopifyStatus || 'Disconnected';

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeUrl) {
      toast({ variant: 'destructive', title: 'Store URL Required', description: 'Please enter your Shopify store URL.' });
      return;
    }

    setIsConnecting(true);

    // Simulate architecture connection setup
    setTimeout(async () => {
      let cleanUrl = storeUrl.trim().toLowerCase();
      if (!cleanUrl.includes('.myshopify.com') && !cleanUrl.startsWith('http')) {
        cleanUrl = `${cleanUrl}.myshopify.com`;
      }
      const calculatedName = storeName || cleanUrl.replace('.myshopify.com', '').replace('https://', '');

      await updateBusinessProfile({
        shopifyStoreUrl: cleanUrl,
        shopifyStoreName: calculatedName,
        shopifyStatus: 'Connected',
      });

      setIsConnecting(false);
      setShowShopifyModal(false);
      toast({
        title: 'Shopify Store Connected',
        description: `Successfully linked store "${calculatedName}". Auto-sync architecture configured!`,
      });
    }, 1200);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Connected':
        return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 gap-1.5 py-1 px-3"><CheckCircle2 className="w-3.5 h-3.5" /> Connected</Badge>;
      case 'Pending':
        return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/20 gap-1.5 py-1 px-3"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pending Approval</Badge>;
      case 'Sync Required':
        return <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/20 gap-1.5 py-1 px-3"><AlertCircle className="w-3.5 h-3.5" /> Sync Required</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground gap-1.5 py-1 px-3">Disconnected</Badge>;
    }
  };

  return (
    <Dialog open={showShopifyModal} onOpenChange={setShowShopifyModal}>
      <DialogContent className="sm:max-w-md ios-glass rounded-2xl border border-border/50">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Connect Shopify Store</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Sync catalog, live stock levels, sales orders & variants automatically.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleConnect} className="space-y-4 py-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/40">
            <span className="text-xs font-medium text-muted-foreground">Integration Status</span>
            {getStatusBadge(currentStatus)}
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-url" className="text-xs font-medium">Shopify Store URL</Label>
            <div className="relative">
              <Input
                id="store-url"
                placeholder="my-brand-store.myshopify.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="pl-9 text-sm rounded-xl"
              />
              <Store className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-name" className="text-xs font-medium">Store Display Name (Optional)</Label>
            <Input
              id="store-name"
              placeholder="My Apparel Brand"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="text-sm rounded-xl"
            />
          </div>

          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5" /> What gets imported automatically?
            </div>
            <ul className="text-muted-foreground grid grid-cols-2 gap-1 list-disc pl-4 text-[11px]">
              <li>Products & SKUs</li>
              <li>Live Stock & Variants</li>
              <li>Historical Orders</li>
              <li>Product Images</li>
              <li>Categories & Tags</li>
              <li>Customer Details</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowShopifyModal(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isConnecting}
              className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect Store
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
