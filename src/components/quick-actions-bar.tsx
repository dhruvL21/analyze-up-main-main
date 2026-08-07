'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useData } from '@/context/data-context';
import { AddProductModal } from '@/components/add-product-modal';
import { AddSupplierModal } from '@/components/add-supplier-modal';
import { DeadStockModal } from '@/components/dead-stock-modal';
import { ImportDialog } from '@/components/import-dialog';
import { ShopifyConnectModal } from '@/components/shopify-connect-modal';
import { useToast } from '@/hooks/use-toast';
import {
  PlusCircle,
  FileSpreadsheet,
  ShoppingBag,
  PackageX,
  Truck,
  Sparkles,
  Zap,
} from 'lucide-react';

export function QuickActionsBar() {
  const { loadDemoBusiness, businessProfile, showShopifyModal, setShowShopifyModal } = useData();
  const { toast } = useToast();

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isDeadStockOpen, setIsDeadStockOpen] = useState(false);

  const handleLaunchCopilot = () => {
    // Dispatch custom event to toggle ChatWidget or click floating chat button
    const chatBtn = document.querySelector<HTMLButtonElement>('[data-chat-widget-toggle="true"]');
    if (chatBtn) {
      chatBtn.click();
    } else {
      toast({
        title: 'AI Copilot Active',
        description: 'Click the floating AI Copilot button at the bottom-right corner of your screen.',
      });
    }
  };

  const handleLoadDemo = async () => {
    await loadDemoBusiness(businessProfile?.businessType || 'Fashion');
    toast({
      title: 'Demo Business Loaded!',
      description: 'Loaded 200+ products, 15 suppliers, and 500+ orders into your workspace.',
    });
  };

  return (
    <>
      <div className="p-3 rounded-2xl bg-secondary/40 border border-border/40 backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Founder Quick Actions
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">Direct Modals & Shortcuts</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddProductOpen(true)}
            className="rounded-xl text-xs gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10 font-medium"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Product
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="rounded-xl text-xs gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10 font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Import CSV / Excel
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowShopifyModal(true)}
            className="rounded-xl text-xs gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10 font-medium"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Connect Shopify
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsDeadStockOpen(true)}
            className="rounded-xl text-xs gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10 font-medium"
          >
            <PackageX className="w-3.5 h-3.5" />
            View Dead Stock
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddSupplierOpen(true)}
            className="rounded-xl text-xs gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10 font-medium"
          >
            <Truck className="w-3.5 h-3.5" />
            Add Supplier
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleLaunchCopilot}
            className="rounded-xl text-xs gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Launch AI Copilot
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleLoadDemo}
            className="rounded-xl text-xs gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10 font-medium"
          >
            <Zap className="w-3.5 h-3.5" />
            Load Demo Business
          </Button>
        </div>
      </div>

      {/* Interactive Modals */}
      <AddProductModal open={isAddProductOpen} onOpenChange={setIsAddProductOpen} />
      <AddSupplierModal open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen} />
      <DeadStockModal open={isDeadStockOpen} onOpenChange={setIsDeadStockOpen} />
      <ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
      <ShopifyConnectModal />
    </>
  );
}
