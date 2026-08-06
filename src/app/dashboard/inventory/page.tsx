'use client';

import Image from 'next/image';
import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, Database, Sparkles, Loader2, ArrowRightLeft, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/context/data-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportDialog } from '@/components/import-dialog';
import { generateProductDescription } from '@/ai/flows/product-descriptor';
import { useToast } from '@/hooks/use-toast';
import { computeProductIntelligence, filterProductsByNaturalLanguage } from '@/lib/product-intelligence-engine';
import { InventoryInsightsTicker } from '@/components/inventory-insights-ticker';
import { InventorySearchBar } from '@/components/inventory-search-bar';
import { InventoryRecommendationsPanel } from '@/components/inventory-recommendations-panel';
import { InventoryDistributionCard } from '@/components/inventory-distribution-card';
import { ProductIntelligenceDrawer } from '@/components/product-intelligence-drawer';
import { ProductComparisonModal } from '@/components/product-comparison-modal';

export default function InventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct, recordSale, isLoading, categories, suppliers, addCategory, addSupplier, transactions, returns, businessProfile } = useData();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>(undefined);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // New Intelligence States
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const { toast } = useToast();

  const productFormRef = useRef<HTMLFormElement>(null);
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

  const resetFormState = () => {
    setEditingProduct(null);
    setDescription('');
    setImagePreview(null);
    setSelectedCategoryId(undefined);
    setSelectedSupplierId(undefined);
    setIsGeneratingDescription(false);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleAIDescription = async () => {
    const productName = productFormRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.value;
    if (!productName) {
      toast({
        variant: 'destructive',
        title: 'Missing Name',
        description: 'Please enter a product name first to generate a description.',
      });
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const result = await generateProductDescription(productName);
      setDescription(result);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: err.message || 'Failed to generate description.',
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleSellSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sellingProduct) return;
    
    const formData = new FormData(e.currentTarget);
    const quantity = Number(formData.get('quantity'));
    
    await recordSale(sellingProduct.id, quantity);
    setIsSellDialogOpen(false);
    setSellingProduct(null);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    let imageUrl = editingProduct?.imageUrl || `https://picsum.photos/seed/${Date.now()}/400/400`;
    if (imagePreview) {
      imageUrl = imagePreview;
    }

    const productData = {
      name: formData.get('name') as string,
      sku: (formData.get('sku') as string) || ('SKU-' + Date.now().toString(36).toUpperCase()),
      barcode: (formData.get('barcode') as string) || '',
      brand: (formData.get('brand') as string) || '',
      stock: Number(formData.get('stock')),
      minStock: Number(formData.get('minStock')) || 5,
      maxStock: Number(formData.get('maxStock')) || 100,
      unit: (formData.get('unit') as string) || 'Piece',
      status: (formData.get('status') as any) || 'Active',
      price: Number(formData.get('price')),
      costPrice: Number(formData.get('costPrice')),
      averageDailySales: editingProduct?.averageDailySales || 1.0,
      leadTimeDays: editingProduct?.leadTimeDays || 7,
      categoryId: selectedCategoryId || (formData.get('categoryId') as string),
      supplierId: selectedSupplierId || (formData.get('supplierId') as string),
      supplier: suppliers.find(s => s.id === (selectedSupplierId || formData.get('supplierId')))?.name || editingProduct?.supplier || '',
      imageUrl: imageUrl,
      description: description,
    };

    if (editingProduct) {
      const updatedProduct = {
        ...editingProduct,
        ...productData,
        description: description,
        updatedAt: new Date().toISOString(),
      };
      updateProduct(updatedProduct);
    } else {
      addProduct(productData);
    }

    setIsFormDialogOpen(false);
  };

  const openEditDialog = (product: Product) => {
    resetFormState();
    setEditingProduct(product);
    setDescription(product.description || '');
    setImagePreview(product.imageUrl || null);
    setSelectedCategoryId(product.categoryId);
    setSelectedSupplierId(product.supplierId);
    setIsFormDialogOpen(true);
  };

  const openAddDialog = () => {
    resetFormState();
    setIsFormDialogOpen(true);
  };

  const openProductReport = (product: Product) => {
    setDrawerProduct(product);
    setIsDrawerOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-6">
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
            <Button size="sm" variant="outline" onClick={() => setIsComparisonOpen(true)} className="rounded-xl text-xs gap-1.5 border-purple-500/30 text-purple-500">
              <ArrowRightLeft className="h-4 w-4" />
              Compare Products
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsImportDialogOpen(true)} className="rounded-xl text-xs gap-1.5">
              <Database className="h-4 w-4" />
              Import Database
            </Button>
            <Button size="sm" onClick={openAddDialog} className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground">
              <PlusCircle className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* FEATURE 16: Live Inventory Insights Feed */}
        <InventoryInsightsTicker />

        {/* FEATURE 17: Natural Language Search Intelligence */}
        <InventorySearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* FEATURE 18: Proactive AI Inventory Recommendations Panel */}
        <InventoryRecommendationsPanel />

        {/* FEATURE 14: Inventory Distribution Analysis */}
        <InventoryDistributionCard />

        {/* Main Table Card */}
        <Card className="ios-glass rounded-3xl border-border/50 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Catalog Intelligence Table</CardTitle>
              <CardDescription className="text-xs">
                Click any row to open full AI Product Business Report
              </CardDescription>
            </div>
            {searchQuery && (
              <Badge variant="outline" className="text-xs text-primary border-primary/30">
                Filtered: {filteredProducts.length} items
              </Badge>
            )}
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
                            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-xs inline-flex items-center justify-center border border-primary/20">
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
                              <p className="font-bold text-foreground hover:text-primary transition-colors text-xs">{product.name}</p>
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
                                <Badge key={t} variant="outline" className="text-[9px] bg-background/60">
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
                                className="h-8 px-2 rounded-xl text-xs text-primary gap-1"
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
                                  <DropdownMenuItem onClick={() => openEditDialog(product)}>Edit Details</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setSellingProduct(product); setIsSellDialogOpen(true); }} className="text-primary font-medium">Record Sale</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteProduct(product.id)} className="text-destructive">Delete</DropdownMenuItem>
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
    </>
  );
}
