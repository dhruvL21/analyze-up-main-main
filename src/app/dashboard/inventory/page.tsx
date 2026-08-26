'use client';

import Image from 'next/image';
import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, Database, Sparkles, Loader2, ArrowRightLeft, Eye, X, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PRESET_QUICK_QUERIES = [
  { label: 'Fast Moving', query: 'fast moving' },
  { label: 'Running Out Soon', query: 'running out this week' },
  { label: 'Dead Stock', query: 'find dead stock' },
  { label: 'Highest Margins', query: 'highest margin' },
  { label: 'Low Margin (<20%)', query: 'less than 20%' },
  { label: 'Overstocked', query: 'overstocked' },
];
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/context/data-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportDialog } from '@/components/import-dialog';
import { AddProductModal } from '@/components/add-product-modal';
import { generateProductDescription } from '@/ai/flows/product-descriptor';
import { useToast } from '@/hooks/use-toast';
import { computeProductIntelligence, filterProductsByNaturalLanguage } from '@/lib/product-intelligence-engine';
import { InventoryInsightsTicker } from '@/components/inventory-insights-ticker';
import { InventoryRecommendationsPanel } from '@/components/inventory-recommendations-panel';
import { InventoryDistributionCard } from '@/components/inventory-distribution-card';
import { ProductIntelligenceDrawer } from '@/components/product-intelligence-drawer';
import { ProductComparisonModal } from '@/components/product-comparison-modal';

import { useSearchParams } from 'next/navigation';
import { OperationsSubNav } from '@/components/operations-sub-nav';

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const { products, addProduct, updateProduct, deleteProduct, recordSale, isLoading, categories, suppliers, addCategory, addSupplier, transactions, returns, businessProfile } = useData();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>(undefined);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // New Intelligence States
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  useEffect(() => {
    const qParam = searchParams?.get('q') || searchParams?.get('query');
    if (qParam) {
      setSearchQuery(qParam);
    }
  }, [searchParams]);

  const { toast } = useToast();

  const categoryToSelectRef = useRef<string | null>(null);
  const supplierToSelectRef = useRef<string | null>(null);

  useEffect(() => {
    if (categoryToSelectRef.current && categories.length > 0) {
      const found = categories.find(c => c.name.toLowerCase() === categoryToSelectRef.current?.toLowerCase());
      if (found) {
        setSelectedCategoryId(found.id);
        categoryToSelectRef.current = null;
      }
    }
  }, [categories]);

  useEffect(() => {
    if (supplierToSelectRef.current && suppliers.length > 0) {
      const found = suppliers.find(s => s.name.toLowerCase() === supplierToSelectRef.current?.toLowerCase());
      if (found) {
        setSelectedSupplierId(found.id);
        supplierToSelectRef.current = null;
      }
    }
  }, [suppliers]);

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  const filteredProducts = filterProductsByNaturalLanguage(products, transactions, searchQuery);

  const handleSellSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sellingProduct) return;
    
    const formData = new FormData(e.currentTarget);
    const quantity = Number(formData.get('quantity'));
    
    await recordSale(sellingProduct.id, quantity);
    setIsSellDialogOpen(false);
    setSellingProduct(null);
  };

  const openProductReport = (product: Product) => {
    setDrawerProduct(product);
    setIsDrawerOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <OperationsSubNav />

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl flex items-center gap-2">
              Inventory Intelligence
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs px-2.5 py-0.5">
                {products.length} Products
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Product decision engine & asset performance analytics
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsComparisonOpen(true)} className="rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-medium">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              Compare Products
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsImportDialogOpen(true)} className="rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-medium">
              <Database className="h-4 w-4 text-primary" />
              Import Database
            </Button>
            <Button size="sm" onClick={() => setIsAddProductOpen(true)} className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-md">
              <PlusCircle className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* FEATURE 16: Live Inventory Insights Feed */}
        <InventoryInsightsTicker />

        {/* FEATURE 18: Proactive AI Inventory Recommendations Panel */}
        <InventoryRecommendationsPanel />

        {/* FEATURE 14: Inventory Distribution Analysis */}
        <InventoryDistributionCard />

        {/* Main Table Card */}
        <Card className="ios-glass rounded-3xl border-border/50 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Catalog Intelligence Table</CardTitle>
                <CardDescription className="text-xs">
                  Click any row to open full AI Product Business Report
                </CardDescription>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name, SKU, tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8.5 pr-8 h-9 rounded-xl border-border/50 bg-secondary/30 text-xs shadow-inner focus-visible:ring-primary"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1.5 bg-secondary/30 border-border/40 shrink-0">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
                </Badge>
              </div>
            </div>

            {/* Quick NL Queries Option Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-[11px]">
              <span className="text-muted-foreground font-semibold shrink-0 flex items-center gap-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" /> Quick NL Queries:
              </span>

              {PRESET_QUICK_QUERIES.map((preset) => {
                const isActive = searchQuery.toLowerCase() === preset.query.toLowerCase();
                return (
                  <button
                    key={preset.label}
                    onClick={() => setSearchQuery(isActive ? '' : preset.query)}
                    className={`px-3 py-1.5 rounded-xl font-medium border text-xs transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm font-semibold'
                        : 'bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-2.5 py-1.5 rounded-xl font-medium text-xs text-muted-foreground hover:text-rose-400 border border-dashed border-border/60 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear filter
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] text-center">Grade</TableHead>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Product Name & SKU</TableHead>
                    <TableHead>Health Status</TableHead>
                    <TableHead>AI Intelligence Badges</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className='h-8 w-8 bg-secondary rounded-xl animate-pulse mx-auto'/></TableCell>
                        <TableCell><div className="aspect-square rounded-lg bg-secondary w-12 h-12 animate-pulse" /></TableCell>
                        <TableCell><div className='h-5 w-32 bg-secondary rounded-md animate-pulse'/></TableCell>
                        <TableCell><div className='h-6 w-20 bg-secondary rounded-full animate-pulse'/></TableCell>
                        <TableCell><div className='h-5 w-24 bg-secondary rounded-md animate-pulse'/></TableCell>
                        <TableCell className="text-right"><div className='h-5 w-16 bg-secondary rounded-md animate-pulse ml-auto'/></TableCell>
                        <TableCell className="text-right"><div className='h-5 w-10 bg-secondary rounded-md animate-pulse ml-auto'/></TableCell>
                        <TableCell className="text-right"><div className='h-8 w-8 bg-secondary rounded-full animate-pulse ml-auto'/></TableCell>
                      </TableRow>
                    ))
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                        No products match your search query. Try typing 'low stock' or 'dead stock'.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const report = computeProductIntelligence(product, transactions, returns, suppliers);
                      return (
                        <TableRow
                          key={product.id}
                          className="hover:bg-secondary/40 transition-colors cursor-pointer"
                          onClick={() => openProductReport(product)}
                        >
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <span
                              className={`w-8 h-8 rounded-full font-black text-xs inline-flex items-center justify-center border shadow-sm ${
                                report.performanceGrade === 'A+' || report.performanceGrade === 'A'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : report.performanceGrade === 'B'
                                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                  : report.performanceGrade === 'C'
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {report.performanceGrade}
                            </span>
                          </TableCell>

                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Image
                              alt={product.name || 'Product Image'}
                              className="aspect-square rounded-xl object-cover border border-border/40"
                              height="48"
                              src={product.imageUrl || 'https://placehold.co/64x64'}
                              width="48"
                              unoptimized
                            />
                          </TableCell>

                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-bold text-foreground hover:text-emerald-400 transition-colors text-xs">{product.name || product.productName}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">{product.sku || 'N/A'}</p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge className={`${report.badgeClass} text-[10px] px-2 py-0.5 font-semibold`}>
                              {report.healthStatus}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {report.tags.slice(0, 2).map(t => (
                                <Badge key={t} variant="outline" className="text-[9px] px-2 py-0.5 font-semibold bg-primary/15 text-primary border-primary/30">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>

                          <TableCell className="text-right font-semibold text-xs">
                            {currencySymbol}{typeof product.price === 'number' ? product.price.toLocaleString('en-IN') : '0'}
                          </TableCell>

                          <TableCell className="text-right font-bold text-xs">
                            {product.stock} <span className="text-[10px] font-normal text-muted-foreground">{product.unit || 'units'}</span>
                          </TableCell>

                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openProductReport(product)}
                                className="h-8 px-2 rounded-xl text-xs text-emerald-400 gap-1 hover:bg-emerald-500/10"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Report
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="rounded-full h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setSellingProduct(product); setIsSellDialogOpen(true); }} className="text-emerald-400 font-medium">Record Sale</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteProduct(product.id)} className="text-destructive">Delete Product</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Record Sale Dialog */}
      <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl ios-glass">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Record Product Sale</DialogTitle>
            <DialogDescription className="text-xs">
              Record customer units sold for {sellingProduct?.name || sellingProduct?.productName}
            </DialogDescription>
          </DialogHeader>
          {sellingProduct && (
            <form onSubmit={handleSellSubmit} className="space-y-4 text-xs pt-2">
              <div className="space-y-1">
                <Label htmlFor="sale-qty">Quantity Sold</Label>
                <Input
                  id="sale-qty"
                  name="quantity"
                  type="number"
                  min="1"
                  max={sellingProduct.stock}
                  defaultValue="1"
                  required
                  className="rounded-xl"
                />
                <span className="text-[10px] text-muted-foreground">Available Stock: {sellingProduct.stock} units</span>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsSellDialogOpen(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  Confirm Sale
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Intelligence Drawer */}
      <ProductIntelligenceDrawer
        product={drawerProduct}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />

      {/* Product Comparison Modal */}
      <ProductComparisonModal
        open={isComparisonOpen}
        onOpenChange={setIsComparisonOpen}
      />

      {/* Import Database Modal */}
      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />

      {/* Quick Add Product Modal */}
      <AddProductModal
        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
      />
    </>
  );
}
