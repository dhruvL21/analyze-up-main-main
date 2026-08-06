'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/context/data-context';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Truck,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface ParsedRow {
  name: string;
  sku: string;
  category: string;
  brand: string;
  supplier: string;
  costPrice: number;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  description: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { bulkAddProducts, categories, suppliers, addCategory, addSupplier, products } = useData();
  const { toast } = useToast();

  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    failed: number;
    warnings: number;
    newCategories: number;
    newSuppliers: number;
    executionTimeMs: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stage 1: Official AnalyzeUp CSV Template Download
  const handleDownloadTemplate = () => {
    const headers = [
      'Product Name',
      'SKU',
      'Category',
      'Brand',
      'Supplier',
      'Cost Price',
      'Selling Price',
      'Quantity',
      'Minimum Stock',
      'Unit',
      'Description',
    ];

    const sampleRows = [
      [
        'Organic Cotton T-Shirt',
        'TSHIRT-ORG-001',
        'Apparel',
        'AnalyzeUp Wear',
        'Apex Apparel Global',
        '450',
        '1299',
        '50',
        '10',
        'Piece',
        '100% GOTS certified organic cotton t-shirt',
      ],
      [
        'Ergonomic Wireless Mouse',
        'MOUSE-WIRELESS-02',
        'Electronics',
        'TechPro',
        'Zenith Electronics Corp',
        '850',
        '2499',
        '25',
        '5',
        'Piece',
        '2.4GHz rechargeable ergonomic mouse',
      ],
      [
        'Arabica Whole Beans (1kg)',
        'COFFEE-ARABICA-1K',
        'Gourmet',
        'Himalayan Estate',
        'Himalayan Coffee Estate',
        '480',
        '1499',
        '40',
        '8',
        'Kg',
        'Single origin dark roast coffee beans',
      ],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...sampleRows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'AnalyzeUp_Inventory_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Template Downloaded', description: 'AnalyzeUp CSV template saved to your downloads folder.' });
  };

  // Stage 2: Parse File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const existingSkus = new Set(products.map(p => p.sku?.toUpperCase()));
        const seenSkusInFile = new Set<string>();

        const rows: ParsedRow[] = results.data.map((row: any, idx: number) => {
          const name = (row['Product Name'] || row['name'] || row['Title'] || '').toString().trim();
          const sku = (row['SKU'] || row['sku'] || `AUTOSKU-${idx + 1}`).toString().trim().toUpperCase();
          const category = (row['Category'] || row['category'] || 'General').toString().trim();
          const brand = (row['Brand'] || row['brand'] || '').toString().trim();
          const supplier = (row['Supplier'] || row['supplier'] || '').toString().trim();
          const costPrice = parseFloat(row['Cost Price'] || row['cost_price'] || row['costPrice'] || '0');
          const price = parseFloat(row['Selling Price'] || row['price'] || row['selling_price'] || '0');
          const stock = parseInt(row['Quantity'] || row['quantity'] || row['stock'] || '0', 10);
          const minStock = parseInt(row['Minimum Stock'] || row['min_stock'] || '5', 10);
          const unit = (row['Unit'] || row['unit'] || 'Piece').toString().trim();
          const description = (row['Description'] || row['description'] || '').toString().trim();

          const errors: string[] = [];
          const warnings: string[] = [];

          if (!name) errors.push('Missing product name');
          if (price <= 0) errors.push('Invalid or zero selling price');
          if (isNaN(stock) || stock < 0) errors.push('Negative or invalid quantity');

          if (existingSkus.has(sku)) {
            warnings.push(`SKU "${sku}" already exists in inventory (will update)`);
          }
          if (seenSkusInFile.has(sku)) {
            errors.push(`Duplicate SKU "${sku}" inside uploaded file`);
          } else {
            seenSkusInFile.add(sku);
          }

          if (costPrice > price && price > 0) {
            warnings.push('Cost price is higher than selling price');
          }

          return {
            name,
            sku,
            category,
            brand,
            supplier,
            costPrice: isNaN(costPrice) ? 0 : costPrice,
            price: isNaN(price) ? 0 : price,
            stock: isNaN(stock) ? 0 : stock,
            minStock: isNaN(minStock) ? 5 : minStock,
            unit,
            description,
            isValid: errors.length === 0,
            errors,
            warnings,
          };
        });

        setParsedRows(rows);
        setIsProcessing(false);
        setStage(3); // Proceed to Preview Stage
      },
      error: (error) => {
        console.error('CSV Parsing Error:', error);
        toast({ variant: 'destructive', title: 'Parsing Error', description: 'Failed to read CSV file format.' });
        setIsProcessing(false);
      },
    });
  };

  // Validation Metrics for Stage 3 & 4
  const metrics = useMemo(() => {
    const total = parsedRows.length;
    const valid = parsedRows.filter(r => r.isValid).length;
    const invalid = total - valid;
    const duplicateSkus = parsedRows.filter(r => r.errors.some(e => e.includes('Duplicate SKU'))).length;
    const missingPrices = parsedRows.filter(r => r.price <= 0).length;
    const missingNames = parsedRows.filter(r => !r.name).length;
    const warningsCount = parsedRows.reduce((acc, r) => acc + r.warnings.length, 0);

    const fileCategories = new Set(parsedRows.map(r => r.category).filter(Boolean));
    const fileSuppliers = new Set(parsedRows.map(r => r.supplier).filter(Boolean));

    const existingCatNames = new Set(categories.map(c => c.name.toLowerCase()));
    const existingSupNames = new Set(suppliers.map(s => s.name.toLowerCase()));

    const newCategories = Array.from(fileCategories).filter(c => !existingCatNames.has(c.toLowerCase())).length;
    const newSuppliers = Array.from(fileSuppliers).filter(s => !existingSupNames.has(s.toLowerCase())).length;

    return {
      total,
      valid,
      invalid,
      duplicateSkus,
      missingPrices,
      missingNames,
      warningsCount,
      newCategories,
      newSuppliers,
    };
  }, [parsedRows, categories, suppliers]);

  // Execute Import
  const handleExecuteImport = async () => {
    const validItems = parsedRows.filter(r => r.isValid);
    if (validItems.length === 0) {
      toast({ variant: 'destructive', title: 'No Valid Products', description: 'Please resolve errors before importing.' });
      return;
    }

    setStage(4); // Validation & Execution Stage
    setIsProcessing(true);
    const startTime = performance.now();

    try {
      // 1. Auto-create new categories
      const fileCategories = Array.from(new Set(validItems.map(r => r.category).filter(Boolean)));
      const existingCatMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
      let newCatCount = 0;

      for (const catName of fileCategories) {
        if (!existingCatMap.has(catName.toLowerCase())) {
          await addCategory({ name: catName, description: 'Created during CSV import' });
          newCatCount++;
        }
      }

      // 2. Auto-create new suppliers
      const fileSuppliers = Array.from(new Set(validItems.map(r => r.supplier).filter(Boolean)));
      const existingSupMap = new Map(suppliers.map(s => [s.name.toLowerCase(), s.id]));
      let newSupCount = 0;

      for (const supName of fileSuppliers) {
        if (!existingSupMap.has(supName.toLowerCase())) {
          await addSupplier({
            name: supName,
            contactName: 'Import Contact',
            email: `orders@${supName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
            phone: '+91 90000 00000',
            address: 'Imported via CSV',
          });
          newSupCount++;
        }
      }

      // 3. Format items for bulkAddProducts
      const productsToImport = validItems.map(r => ({
        name: r.name,
        sku: r.sku,
        description: r.description || `Imported product ${r.name}`,
        categoryId: existingCatMap.get(r.category.toLowerCase()) || 'cat-general',
        brand: r.brand,
        supplier: r.supplier,
        price: r.price,
        costPrice: r.costPrice,
        stock: r.stock,
        minStock: r.minStock,
        unit: r.unit,
        status: 'Active' as const,
        imageUrl: '',
        averageDailySales: 1.0,
        leadTimeDays: 7,
      }));

      await bulkAddProducts(productsToImport);

      const endTime = performance.now();
      const executionTime = Math.round(endTime - startTime);

      setImportSummary({
        imported: validItems.length,
        failed: parsedRows.length - validItems.length,
        warnings: metrics.warningsCount,
        newCategories: newCatCount,
        newSuppliers: newSupCount,
        executionTimeMs: executionTime,
      });

      setIsProcessing(false);
      setStage(5); // Summary Stage
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Import Failed', description: 'An error occurred while importing products.' });
      setIsProcessing(false);
      setStage(3);
    }
  };

  const handleClose = () => {
    setStage(1);
    setParsedRows([]);
    setFileName('');
    setImportSummary(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl ios-glass rounded-3xl border border-primary/20 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-border/40 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">CSV / Excel Inventory Import</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Stage {stage} of 5 — Validate, map & safe-merge products into AnalyzeUp
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`w-6 h-1.5 rounded-full transition-all ${
                    s === stage ? 'bg-emerald-500 w-8' : s < stage ? 'bg-emerald-500/40' : 'bg-secondary'
                  }`}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Stage 1: Download Template & File Selection */}
        {stage === 1 && (
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-500" />
                  Stage 1: Download Official AnalyzeUp Template
                </h4>
                <p className="text-xs text-muted-foreground">
                  Use our spreadsheet template with formatted columns to ensure 100% error-free import.
                </p>
              </div>
              <Button onClick={handleDownloadTemplate} variant="outline" className="rounded-xl text-xs gap-1.5 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 shrink-0">
                Download CSV Template
              </Button>
            </div>

            <div className="border-2 border-dashed border-border/60 hover:border-emerald-500/50 rounded-2xl p-8 text-center space-y-3 transition-colors bg-secondary/20">
              <div className="p-3 rounded-full bg-secondary mx-auto w-12 h-12 flex items-center justify-center text-muted-foreground">
                <Upload className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Click or drop your CSV / Excel file here</p>
                <p className="text-xs text-muted-foreground mt-0.5">Supports .CSV, .XLSX, .XLS files up to 5,000 rows</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md">
                Select File
              </Button>
            </div>
          </div>
        )}

        {/* Stage 2 & 3: File Data Preview & Metrics */}
        {(stage === 2 || stage === 3) && (
          <div className="space-y-4 py-2 overflow-y-auto flex-1">
            {/* Validation Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-secondary/50 border border-border/40">
                <span className="text-[11px] text-muted-foreground block">Total Products</span>
                <span className="text-base font-bold">{metrics.total}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] text-emerald-500 block font-medium">Valid Items</span>
                <span className="text-base font-bold text-emerald-500">{metrics.valid}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[11px] text-rose-500 block font-medium">Errors Found</span>
                <span className="text-base font-bold text-rose-500">{metrics.invalid}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[11px] text-amber-500 block font-medium">Warnings</span>
                <span className="text-base font-bold text-amber-500">{metrics.warningsCount}</span>
              </div>
            </div>

            {/* Auto-detected metadata badges */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <Badge variant="outline" className="gap-1 bg-secondary/50">
                <Layers className="w-3 h-3 text-blue-500" />
                {metrics.newCategories} New Categories to Create
              </Badge>
              <Badge variant="outline" className="gap-1 bg-secondary/50">
                <Truck className="w-3 h-3 text-amber-500" />
                {metrics.newSuppliers} New Suppliers to Create
              </Badge>
            </div>

            {/* Product Preview Table */}
            <div className="border border-border/50 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
              <Table className="text-xs">
                <TableHeader className="bg-secondary/70">
                  <TableRow>
                    <TableHead className="w-8">Status</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Issues / Validation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, idx) => (
                    <TableRow key={idx} className={row.isValid ? '' : 'bg-rose-500/5'}>
                      <TableCell>
                        {row.isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{row.name || <span className="text-rose-500">Missing</span>}</TableCell>
                      <TableCell className="font-mono text-[11px]">{row.sku}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="font-semibold">₹{row.price}</TableCell>
                      <TableCell className="text-muted-foreground">₹{row.costPrice}</TableCell>
                      <TableCell>{row.stock} {row.unit}</TableCell>
                      <TableCell>
                        {row.errors.map((err, eIdx) => (
                          <span key={eIdx} className="text-[10px] text-rose-500 block font-medium">
                            • {err}
                          </span>
                        ))}
                        {row.warnings.map((warn, wIdx) => (
                          <span key={wIdx} className="text-[10px] text-amber-500 block font-medium">
                            • {warn}
                          </span>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Stage 4: Processing Animation */}
        {stage === 4 && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
            <h4 className="text-base font-bold">Validating & Importing Catalog...</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Safely creating categories, suppliers, stock counts and checking duplicate SKUs.
            </p>
          </div>
        )}

        {/* Stage 5: Final Import Summary */}
        {stage === 5 && importSummary && (
          <div className="space-y-4 py-4 text-center">
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 w-12 h-12 mx-auto flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-foreground">Import Complete!</h3>
              <p className="text-xs text-muted-foreground">
                Your products have been validated and safely added to your inventory.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-left max-w-md mx-auto">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <span className="text-[11px] text-emerald-500 font-medium block">Imported</span>
                <span className="text-xl font-bold text-emerald-500">{importSummary.imported}</span>
              </div>
              <div className="p-3 rounded-2xl bg-secondary/50 border border-border/40 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">New Categories</span>
                <span className="text-xl font-bold">{importSummary.newCategories}</span>
              </div>
              <div className="p-3 rounded-2xl bg-secondary/50 border border-border/40 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">New Suppliers</span>
                <span className="text-xl font-bold">{importSummary.newSuppliers}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-secondary/30 text-xs text-muted-foreground max-w-md mx-auto flex items-center justify-between">
              <span>Execution Time</span>
              <span className="font-mono text-foreground font-semibold">{importSummary.executionTimeMs} ms</span>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <DialogFooter className="border-t border-border/40 pt-3 gap-2 sm:gap-0">
          {stage === 1 && (
            <Button variant="outline" onClick={handleClose} className="rounded-xl text-xs">
              Cancel
            </Button>
          )}

          {(stage === 2 || stage === 3) && (
            <>
              <Button variant="outline" onClick={() => setStage(1)} className="rounded-xl text-xs gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Re-upload File
              </Button>
              <Button
                onClick={handleExecuteImport}
                disabled={metrics.valid === 0}
                className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
              >
                Import {metrics.valid} Valid Products
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {stage === 5 && (
            <Button onClick={handleClose} className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto">
              View Inventory Catalog
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
