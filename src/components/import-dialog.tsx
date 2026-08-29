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
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/context/data-context';
import { logBusinessAction } from '@/lib/audit-store';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Truck,
  ShieldCheck,
  Wand2,
  TrendingUp,
  Package,
  ShoppingBag,
  Users,
  RotateCcw,
  Warehouse,
  FileText,
  DollarSign,
  BookmarkPlus,
  Zap,
} from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import {
  BusinessFileType,
  FILE_TYPE_DEFINITIONS,
  FieldMapping,
  TargetFieldDef,
} from '@/ai/flows/import-mapper-constants';
import { detectBusinessFileType, getSmartMappingForFileType } from '@/ai/flows/import-engine';
import { findMatchingImportProfile, saveImportProfile, ImportProfile } from '@/lib/import-profile-store';
import { parseExcelBuffer } from '@/lib/ingestion/excel-parser';
import { ThreeTierBadge } from '@/components/three-tier-badge';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetFile?: {
    name: string;
    content: string;
    driveFileId?: string;
  } | null;
  onImportComplete?: (summary: any) => void;
}

export function ImportDialog({ open, onOpenChange, presetFile, onImportComplete }: ImportDialogProps) {
  const { user } = useUser();
  const {
    bulkAddProducts,
    bulkAddTransactions,
    categories,
    suppliers,
    addCategory,
    addSupplier,
    products,
    addReturn,
    addOrder,
    refreshAnalytics,
  } = useData();
  const { toast } = useToast();

  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [fileName, setFileName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  // Import Job Progress States
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobProcessedCount, setJobProcessedCount] = useState<number>(0);
  const [jobCurrentBatch, setJobCurrentBatch] = useState<number>(0);
  const [jobTotalBatches, setJobTotalBatches] = useState<number>(1);
  const [jobFailedCount, setJobFailedCount] = useState<number>(0);

  // Stage 1: AI File Type Detection
  const [detectedFileType, setDetectedFileType] = useState<BusinessFileType>('INVENTORY_MASTER');
  const [detectionConfidence, setDetectionConfidence] = useState<number>(90);
  const [detectionReasoning, setDetectionReasoning] = useState<string>('');
  const [isAiDetecting, setIsAiDetecting] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<ImportProfile | null>(null);

  // Stage 2: Field Mapping
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [mappingConfidence, setMappingConfidence] = useState<Record<string, number>>({});

  // Stage 3 & 4: Validation & Normalized Rows
  const [normalizedItems, setNormalizedItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Stage 6: Summary Metrics
  const [importSummary, setImportSummary] = useState<{
    fileTypeName: string;
    importedCount: number;
    revenueImpact: number;
    newCategories: number;
    newSuppliers: number;
    newCustomers: number;
    executionTimeMs: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset states when closed
  React.useEffect(() => {
    if (!open) {
      setStage(1);
      setFileName('');
      setRawHeaders([]);
      setRawRows([]);
      setNormalizedItems([]);
      setImportSummary(null);
    }
  }, [open]);

  // Handle preset file (e.g. from Google Drive)
  React.useEffect(() => {
    if (open && presetFile) {
      setFileName(presetFile.name);
      setIsProcessing(true);

      Papa.parse(presetFile.content, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (!results.data || results.data.length === 0) {
            toast({ variant: 'destructive', title: 'Empty CSV File', description: 'No valid rows found in file.' });
            setIsProcessing(false);
            return;
          }

          const headers = Object.keys(results.data[0] || {});
          setRawHeaders(headers);
          setRawRows(results.data as Record<string, any>[]);

          // Check if there is a remembered import profile for this file structure
          const profile = findMatchingImportProfile(headers);
          if (profile) {
            setMatchedProfile(profile);
          }

          setStage(2); // AI File Type & Mapping Step
          setIsAiDetecting(true);

          try {
            // 1. Detect File Type via AI Accountant
            const detectRes = await detectBusinessFileType(headers, results.data as Record<string, any>[]);
            setDetectedFileType(detectRes.fileType);
            setDetectionConfidence(detectRes.confidence);
            setDetectionReasoning(detectRes.reasoning);

            // 2. Fetch Semantic Field Mappings for Detected File Type
            const mapRes = await getSmartMappingForFileType(detectRes.fileType, headers, results.data as Record<string, any>[]);
            const mergedMapping = { ...mapRes.mapping };
            if (profile?.mapping) {
              Object.entries(profile.mapping).forEach(([h, targetKey]) => {
                if (targetKey !== 'skip') mergedMapping[h] = targetKey;
              });
            }
            setFieldMapping(mergedMapping);
            setMappingConfidence(mapRes.confidence);

            toast({
              title: `AI Detected: ${detectRes.fileTypeName} ✨`,
              description: `${detectRes.confidence}% Confidence — ${detectRes.reasoning}`,
            });
          } catch (err) {
            console.error('AI Detection Error:', err);
          } finally {
            setIsAiDetecting(false);
            setIsProcessing(false);
          }
        },
        error: (error: any) => {
          console.error('CSV Parsing Error:', error);
          toast({ variant: 'destructive', title: 'Parsing Error', description: 'Failed to read CSV file format.' });
          setIsProcessing(false);
        },
      });
    }
  }, [open, presetFile, toast]);

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const headers = [
      'Invoice No',
      'Order ID',
      'Order Date',
      'Customer ID',
      'Customer Name',
      'SKU',
      'Item Name',
      'Category',
      'Supplier ID',
      'Supplier Name',
      'Qty Sold',
      'Purchase Price',
      'Retail Price',
      'Discount',
      'Tax',
      'Current Stock',
      'Reorder Level',
      'Safety Stock',
      'Lead Time Days',
      'Payment Mode',
      'Order Status',
      'Warehouse',
    ];

    const sampleRows = [
      [
        'INV-2026-001',
        'ORD-88201',
        '2026-08-01',
        'CUST-1001',
        'Rahul Sharma',
        'TSHIRT-ORG-001',
        'Organic Cotton T-Shirt',
        'Apparel',
        'SUP-501',
        'Apex Apparel Global',
        '2',
        '450',
        '1299',
        '100',
        '60',
        '85',
        '20',
        '15',
        '5',
        'UPI',
        'Completed',
        'Central Hub - Mumbai',
      ],
      [
        'INV-2026-002',
        'ORD-88202',
        '2026-08-02',
        'CUST-1002',
        'Priya Patel',
        'MOUSE-WIRELESS-02',
        'Ergonomic Wireless Mouse',
        'Electronics',
        'SUP-502',
        'Zenith Electronics Corp',
        '1',
        '850',
        '2499',
        '150',
        '120',
        '42',
        '10',
        '8',
        '7',
        'Credit Card',
        'Completed',
        'North Facility - Delhi',
      ],
      [
        'INV-2026-003',
        'ORD-88203',
        '2026-08-03',
        'CUST-1003',
        'Amit Verma',
        'COFFEE-ARABICA-1K',
        'Arabica Whole Beans (1kg)',
        'Gourmet',
        'SUP-503',
        'Himalayan Coffee Estate',
        '3',
        '480',
        '1499',
        '50',
        '75',
        '120',
        '30',
        '25',
        '4',
        'Cash',
        'Completed',
        'South Facility - Bangalore',
      ],
      [
        'INV-2026-004',
        'ORD-88204',
        '2026-08-04',
        'CUST-1004',
        'Ananya Roy',
        'FLASK-STEEL-750',
        'Insulated Steel Flask (750ml)',
        'Home & Living',
        'SUP-504',
        'EcoVessel Supplies Ltd',
        '2',
        '350',
        '999',
        '0',
        '45',
        '64',
        '15',
        '10',
        '6',
        'Net Banking',
        'Shipped',
        'West Warehouse - Pune',
      ],
      [
        'INV-2026-005',
        'ORD-88205',
        '2026-08-05',
        'CUST-1005',
        'Vikram Malhotra',
        'SERUM-VITC-30ML',
        'Hydrating Vitamin C Serum (30ml)',
        'Beauty & Wellness',
        'SUP-505',
        'Botanica Organics Lab',
        '4',
        '280',
        '899',
        '80',
        '40',
        '95',
        '25',
        '20',
        '3',
        'UPI',
        'Delivered',
        'East Hub - Kolkata',
      ],
    ];

    const csvContent = Papa.unparse({ fields: headers, data: sampleRows });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'AnalyzeUp_Business_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: 'Template Downloaded', description: 'AnalyzeUp CSV database template saved to your downloads folder.' });
  };

  // Stage 1: File Upload & AI Detection (CSV & Excel)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

    if (isExcel) {
      try {
        const buffer = await file.arrayBuffer();
        const parsed = parseExcelBuffer(buffer);

        if (!parsed.rows || parsed.rows.length === 0) {
          toast({ variant: 'destructive', title: 'Empty Excel Sheet', description: 'No data rows found in spreadsheet.' });
          setIsProcessing(false);
          return;
        }

        setRawHeaders(parsed.headers);
        setRawRows(parsed.rows);

        const profile = findMatchingImportProfile(parsed.headers);
        if (profile) setMatchedProfile(profile);

        setStage(2);
        setIsAiDetecting(true);

        const detectRes = await detectBusinessFileType(parsed.headers, parsed.rows);
        setDetectedFileType(detectRes.fileType);
        setDetectionConfidence(detectRes.confidence);
        setDetectionReasoning(detectRes.reasoning);

        const mapRes = await getSmartMappingForFileType(detectRes.fileType, parsed.headers, parsed.rows);
        const mergedMapping = { ...mapRes.mapping };
        if (profile?.mapping) {
          Object.entries(profile.mapping).forEach(([h, targetKey]) => {
            if (targetKey !== 'skip') mergedMapping[h] = targetKey;
          });
        }
        setFieldMapping(mergedMapping);
        setMappingConfidence(mapRes.confidence);

        toast({
          title: `Excel Ingested: ${detectRes.fileTypeName} ✨`,
          description: `${detectRes.confidence}% Confidence — ${detectRes.reasoning}`,
        });
      } catch (err) {
        console.error('Excel Parsing Error:', err);
        toast({ variant: 'destructive', title: 'Excel Error', description: 'Failed to read .xlsx spreadsheet.' });
      } finally {
        setIsAiDetecting(false);
        setIsProcessing(false);
      }
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (!results.data || results.data.length === 0) {
          toast({ variant: 'destructive', title: 'Empty CSV File', description: 'No valid rows found in file.' });
          setIsProcessing(false);
          return;
        }

        const headers = Object.keys(results.data[0] || {});
        setRawHeaders(headers);
        setRawRows(results.data as Record<string, any>[]);

        // Check if there is a remembered import profile for this file structure
        const profile = findMatchingImportProfile(headers);
        if (profile) {
          setMatchedProfile(profile);
        }

        setStage(2); // AI File Type & Mapping Step
        setIsAiDetecting(true);

        try {
          // 1. Detect File Type via AI Accountant
          const detectRes = await detectBusinessFileType(headers, results.data as Record<string, any>[]);
          setDetectedFileType(detectRes.fileType);
          setDetectionConfidence(detectRes.confidence);
          setDetectionReasoning(detectRes.reasoning);

          // 2. Fetch Semantic Field Mappings for Detected File Type
          const mapRes = await getSmartMappingForFileType(detectRes.fileType, headers, results.data as Record<string, any>[]);
          const mergedMapping = { ...mapRes.mapping };
          if (profile?.mapping) {
            Object.entries(profile.mapping).forEach(([h, targetKey]) => {
              if (targetKey !== 'skip') mergedMapping[h] = targetKey;
            });
          }
          setFieldMapping(mergedMapping);
          setMappingConfidence(mapRes.confidence);

          toast({
            title: `AI Detected: ${detectRes.fileTypeName} ✨`,
            description: `${detectRes.confidence}% Confidence — ${detectRes.reasoning}`,
          });
        } catch (err) {
          console.error('AI Detection Error:', err);
        } finally {
          setIsAiDetecting(false);
          setIsProcessing(false);
        }
      },
      error: (error) => {
        console.error('CSV Parsing Error:', error);
        toast({ variant: 'destructive', title: 'Parsing Error', description: 'Failed to read CSV file format.' });
        setIsProcessing(false);
      },
    });
  };

  // Re-run AI mapping if user manually changes file type
  const handleFileTypeChange = async (newType: BusinessFileType) => {
    setDetectedFileType(newType);
    setIsAiDetecting(true);
    try {
      const mapRes = await getSmartMappingForFileType(newType, rawHeaders, rawRows);
      setFieldMapping(mapRes.mapping);
      setMappingConfidence(mapRes.confidence);
    } finally {
      setIsAiDetecting(false);
    }
  };

  // Stage 2 -> Stage 3: Normalize & Validate Objects
  const handleConfirmMapping = () => {
    const existingSkus = new Set(products.map(p => p.sku?.toUpperCase()));
    const seenSkusInFile = new Set<string>();

    const normalized = rawRows.map((rawRow, idx) => {
      const obj: Record<string, any> = { isValid: true, errors: [], warnings: [] };

      // Map raw headers to target keys
      Object.entries(fieldMapping).forEach(([csvHeader, targetKey]) => {
        if (targetKey === 'skip') return;
        const val = rawRow[csvHeader];
        if (val !== undefined && val !== null) {
          obj[targetKey] = val.toString().trim();
        }
      });

      // Type-specific field parsing & normalization
      if (detectedFileType === 'SALES_REPORT') {
        const name = obj.productName || obj.name || obj.itemName || '';
        const price = parseFloat((obj.sellingPrice || obj.price || obj.retailPrice || '0').replace(/[^0-9.]/g, '')) || 0;
        const costPrice = parseFloat((obj.costPrice || obj.purchasePrice || '0').replace(/[^0-9.]/g, '')) || 0;
        const qty = parseInt((obj.quantity || obj.qtySold || obj.stock || '1').replace(/[^0-9]/g, ''), 10) || 1;
        const orderNo = obj.orderNumber || obj.orderId || obj.invoiceNo || `INV-${1000 + idx}`;
        const customer = obj.customerName || obj.customer || 'Retail Customer';
        const city = obj.city || obj.warehouse || '';
        const status = obj.status || obj.orderStatus || 'Completed';
        const remarks = obj.remarks || '';
        const paymentMode = obj.paymentMode || 'UPI';
        const discount = parseFloat((obj.discount || '0').replace(/[^0-9.]/g, '')) || 0;
        const tax = parseFloat((obj.tax || '0').replace(/[^0-9.]/g, '')) || 0;
        const date = obj.orderDate || new Date().toISOString().split('T')[0];
        const supplier = obj.supplier || obj.supplierName || '';
        const supplierId = obj.supplierId || '';
        const stock = parseInt((obj.stock || obj.currentStock || '0').replace(/[^0-9]/g, ''), 10) || 0;
        const minStock = parseInt((obj.minStock || obj.reorderLevel || obj.safetyStock || '10').replace(/[^0-9]/g, ''), 10) || 10;
        const leadTimeDays = parseInt((obj.leadTimeDays || '7').replace(/[^0-9]/g, ''), 10) || 7;
        const category = obj.category || 'General';

        if (!name) obj.errors.push('Missing product name');
        if (price <= 0) obj.errors.push('Invalid or zero selling price');
        if (qty <= 0) obj.errors.push('Invalid quantity sold');

        obj.parsed = {
          name,
          price,
          costPrice,
          qty,
          stock,
          minStock,
          leadTimeDays,
          orderNo,
          customer,
          city,
          warehouse: city,
          status,
          remarks,
          paymentMode,
          discount,
          tax,
          supplier,
          supplierId,
          category,
          date,
          sku: obj.sku || `SKU-${idx + 1}`,
        };
      } else if (detectedFileType === 'INVENTORY_MASTER' || detectedFileType === 'WAREHOUSE_STOCK') {
        const name = obj.name || obj.productName || obj.itemName || '';
        const price = parseFloat((obj.price || obj.sellingPrice || obj.retailPrice || '0').replace(/[^0-9.]/g, '')) || 0;
        const costPrice = parseFloat((obj.costPrice || obj.purchasePrice || '0').replace(/[^0-9.]/g, '')) || 0;
        const stock = parseInt((obj.stock || obj.currentStock || obj.quantity || obj.qtySold || '0').replace(/[^0-9]/g, ''), 10) || 0;
        const minStock = parseInt((obj.minStock || obj.reorderLevel || obj.safetyStock || '10').replace(/[^0-9]/g, ''), 10) || 10;
        const leadTimeDays = parseInt((obj.leadTimeDays || '7').replace(/[^0-9]/g, ''), 10) || 7;
        const sku = (obj.sku || `AUTOSKU-${idx + 1}`).toUpperCase();
        const category = obj.category || 'General';
        const supplier = obj.supplier || obj.supplierName || '';
        const supplierId = obj.supplierId || '';
        const city = obj.city || obj.warehouse || '';

        if (!name) obj.errors.push('Missing product name');
        if (price <= 0) obj.errors.push('Invalid or zero selling price');
        if (stock < 0) obj.errors.push('Negative stock quantity');

        if (existingSkus.has(sku)) obj.warnings.push(`SKU "${sku}" already exists in inventory`);
        if (seenSkusInFile.has(sku)) obj.errors.push(`Duplicate SKU "${sku}" inside CSV`);
        else seenSkusInFile.add(sku);

        if (costPrice > price && price > 0) obj.warnings.push('Cost price is higher than selling price');

        obj.parsed = {
          name,
          price,
          costPrice,
          stock,
          minStock,
          leadTimeDays,
          sku,
          category,
          supplier,
          supplierId,
          city,
          warehouse: city,
          unit: obj.unit || 'Piece',
          description: obj.description || '',
        };
      } else {
        // Fallback general object
        const name = obj.name || obj.productName || obj.itemName || obj.supplierName || obj.customerName || `Item #${idx + 1}`;
        const price = parseFloat((obj.price || obj.sellingPrice || obj.retailPrice || obj.unitCost || '0').replace(/[^0-9.]/g, '')) || 0;
        const qty = parseInt((obj.quantity || obj.qtySold || obj.stock || obj.currentStock || '1').replace(/[^0-9]/g, ''), 10) || 1;
        if (!name) obj.errors.push('Missing name');
        obj.parsed = { name, price, qty, sku: obj.sku || `ITEM-${idx + 1}` };
      }

      obj.isValid = obj.errors.length === 0;
      return obj;
    });

    setNormalizedItems(normalized);
    setStage(3); // Stage 3: Business Preview & Validation
  };

  // Stage 4: Business Impact Preview Metrics
  const impactMetrics = useMemo(() => {
    const totalRows = normalizedItems.length;
    const validRows = normalizedItems.filter(r => r.isValid);
    const validCount = validRows.length;
    const invalidCount = totalRows - validCount;
    const warningsCount = normalizedItems.reduce((acc, r) => acc + (r.warnings?.length || 0), 0);

    let estimatedRevenue = 0;
    let productsFound = new Set<string>();
    let customersFound = new Set<string>();
    let ordersFound = new Set<string>();

    validRows.forEach(item => {
      const p = item.parsed;
      if (detectedFileType === 'SALES_REPORT') {
        estimatedRevenue += (p.price || 0) * (p.qty || 1);
        if (p.name) productsFound.add(p.name);
        if (p.customer) customersFound.add(p.customer);
        if (p.orderNo) ordersFound.add(p.orderNo);
      } else {
        estimatedRevenue += (p.price || 0) * (p.stock || 1);
        if (p.name) productsFound.add(p.name);
        if (p.supplier) customersFound.add(p.supplier);
      }
    });

    const fileCategories = new Set(validRows.map(r => r.parsed?.category).filter(Boolean));
    const fileSuppliers = new Set(validRows.map(r => r.parsed?.supplier).filter(Boolean));

    const existingCatNames = new Set(categories.map(c => c.name.toLowerCase()));
    const existingSupNames = new Set(suppliers.map(s => s.name.toLowerCase()));

    const newCategories = Array.from(fileCategories).filter(c => !existingCatNames.has(c.toLowerCase())).length;
    const newSuppliers = Array.from(fileSuppliers).filter(s => !existingSupNames.has(s.toLowerCase())).length;

    return {
      totalRows,
      validCount,
      invalidCount,
      warningsCount,
      estimatedRevenue,
      productsFoundCount: productsFound.size,
      customersFoundCount: customersFound.size,
      ordersFoundCount: ordersFound.size,
      newCategories,
      newSuppliers,
    };
  }, [normalizedItems, detectedFileType, categories, suppliers]);

  // Stage 5: Relationship Builder & Multi-Entity Ingestion Execution
  const handleExecuteBusinessImport = async () => {
    if (!rawRows || rawRows.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No records found in spreadsheet.' });
      return;
    }

    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'Please sign in to import data.' });
      return;
    }

    setStage(4); // Stage 4: Real-time Processing
    setIsProcessing(true);
    const startTime = performance.now();

    try {
      // 1. Auto-create Categories in parallel
      const validRows = normalizedItems.filter(r => r.isValid);
      const fileCategories = Array.from(new Set(validRows.map(r => r.parsed?.category || 'General').filter(Boolean)));
      const existingCatMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
      let newCatCount = 0;

      const missingCats = fileCategories.filter(catName => !existingCatMap.has(catName.toLowerCase()));
      if (missingCats.length > 0) {
        await Promise.all(
          missingCats.map(catName =>
            addCategory({ name: catName, description: 'Created during AI business import' })
          )
        );
        newCatCount = missingCats.length;
      }

      // 2. Auto-create Suppliers in parallel
      const fileSuppliers = Array.from(new Set(validRows.map(r => r.parsed?.supplier || 'Import Vendor').filter(Boolean)));
      const existingSupMap = new Map(suppliers.map(s => [s.name.toLowerCase(), s.id]));
      let newSupCount = 0;

      const missingSups = fileSuppliers.filter(supName => !existingSupMap.has(supName.toLowerCase()));
      if (missingSups.length > 0) {
        await Promise.all(
          missingSups.map(supName =>
            addSupplier({
              name: supName,
              contactName: 'Import Contact',
              email: `orders@${supName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
              phone: '+91 90000 00000',
              address: 'Imported via AI Engine',
            })
          )
        );
        newSupCount = missingSups.length;
      }

      // 3. Initialize Persistent Import Job
      const BATCH_SIZE = 100;
      const totalBatches = Math.max(1, Math.ceil(rawRows.length / BATCH_SIZE));
      setJobTotalBatches(totalBatches);

      const jobRes = await fetch('/api/import/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-uid': user.uid },
        body: JSON.stringify({
          fileName,
          fileType: detectedFileType,
          totalRecords: rawRows.length,
          batchSize: BATCH_SIZE,
          driveFileId: presetFile?.driveFileId,
          userId: user.uid,
        }),
      });

      const jobData = await jobRes.json();
      if (!jobRes.ok || !jobData.job) {
        throw new Error(jobData.error || 'Failed to initialize import job');
      }

      const currentJobId = jobData.job.id;
      setJobId(currentJobId);

      let totalSuccess = 0;
      let totalFail = 0;

      // 4. Process Bounded Batches (100 rows per request)
      for (let i = 0; i < rawRows.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const chunk = rawRows.slice(i, i + BATCH_SIZE);
        setJobCurrentBatch(batchNum);

        const processRes = await fetch('/api/import/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-uid': user.uid },
          body: JSON.stringify({
            jobId: currentJobId,
            userId: user.uid,
            batchNumber: batchNum,
            rawRows: chunk,
            fieldMapping,
            fileType: detectedFileType,
            startRowIndex: i,
          }),
        });

        const processData = await processRes.json().catch(() => ({}));
        if (processRes.ok) {
          totalSuccess += processData.successful || 0;
          totalFail += processData.failed || 0;
          setJobProcessedCount(prev => prev + chunk.length);
          setJobFailedCount(totalFail);
          setJobProgress(Math.min(100, Math.round(((i + chunk.length) / rawRows.length) * 100)));
        } else {
          console.warn(`Batch ${batchNum} processing warning:`, processData.error);
        }
      }

      // Save Import Profile Memory
      saveImportProfile(detectedFileType, rawHeaders, fieldMapping);

      // Refresh Analytics Summary
      await refreshAnalytics();

      const endTime = performance.now();
      const executionTime = Math.round(endTime - startTime);

      const summary = {
        fileTypeName: FILE_TYPE_DEFINITIONS[detectedFileType].name,
        importedCount: totalSuccess,
        failedCount: totalFail,
        revenueImpact: impactMetrics.estimatedRevenue,
        newCategories: newCatCount,
        newSuppliers: newSupCount,
        newCustomers: impactMetrics.customersFoundCount || totalSuccess,
        executionTimeMs: executionTime,
        fileType: detectedFileType,
        driveFileId: presetFile?.driveFileId,
      };

      setImportSummary(summary as any);

      if (onImportComplete) {
        onImportComplete(summary);
      }

      logBusinessAction({
        title: `Database Import: ${FILE_TYPE_DEFINITIONS[detectedFileType].name}`,
        productName: `${totalSuccess} Records Ingested`,
        actionType: 'import',
        changeDetails: `Successfully linked ${totalSuccess} business records into live inventory, suppliers, and sales logs (${totalFail} format warnings).`,
        impactValue: `${totalSuccess} rows`,
        previousValue: `Type: ${detectedFileType}`,
        newValue: `Linked in ${executionTime}ms`,
      });

      toast({
        title: 'Business Engine Synchronized ✨',
        description: `Imported ${totalSuccess.toLocaleString()} records safely. Dashboard aggregates refreshed!`,
      });

      setIsProcessing(false);
      setStage(5); // Stage 5: Summary Screen
    } catch (err: any) {
      console.error('Import Execution Error:', err);
      toast({ variant: 'destructive', title: 'Import Failed', description: err?.message || 'An error occurred during import.' });
      setIsProcessing(false);
      setStage(3);
    }
  };

  const handleClose = () => {
    setStage(1);
    setNormalizedItems([]);
    setRawHeaders([]);
    setRawRows([]);
    setFieldMapping({});
    setFileName('');
    setImportSummary(null);
    setMatchedProfile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl ios-glass rounded-3xl border border-emerald-500/20 p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <DialogHeader className="border-b border-border/40 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  AI Business Import Engine
                  {stage >= 2 && (
                    <Badge className={`${FILE_TYPE_DEFINITIONS[detectedFileType].badgeColor} border text-[11px] gap-1 px-2.5 py-0.5`}>
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      {FILE_TYPE_DEFINITIONS[detectedFileType].name} ({detectionConfidence}% AI)
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Understand, map & safely connect business records into AnalyzeUp intelligence
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`w-6 h-1.5 rounded-full transition-all ${
                    s === stage ? 'bg-emerald-500 w-8 shadow-sm shadow-emerald-500/50' : s < stage ? 'bg-emerald-500/40' : 'bg-secondary'
                  }`}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Stage 1: Upload File */}
        {stage === 1 && (
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-emerald-400" />
                  Stage 1: Upload Any Business File
                </h4>
                <p className="text-xs text-muted-foreground">
                  Upload Sales Reports, Inventory Master, Purchase Orders, or Supplier Lists. AnalyzeUp AI detects the file type automatically.
                </p>
              </div>
              <Button onClick={handleDownloadTemplate} variant="outline" className="rounded-xl text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 shrink-0">
                <Download className="w-3.5 h-3.5" /> Sample Template
              </Button>
            </div>

            <div className="border-2 border-dashed border-border/60 hover:border-emerald-500/50 rounded-2xl p-8 text-center space-y-3 transition-colors bg-secondary/20">
              <div className="p-3 rounded-full bg-emerald-500/10 mx-auto w-12 h-12 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Upload className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Click or drop your business spreadsheet here</p>
                <p className="text-xs text-muted-foreground mt-0.5">Supports CSV, Excel (.xlsx, .xls) files from any ERP or store</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 gap-1.5 px-5">
                <Upload className="w-4 h-4" /> Select File
              </Button>
            </div>
          </div>
        )}

        {/* Stage 2: AI File Type & Smart Column Understanding */}
        {stage === 2 && (
          <div className="space-y-4 py-2 overflow-y-auto flex-1">
            {/* Remembered Profile Alert Banner */}
            {matchedProfile && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Recognized Saved Import Format!</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Matched profile: <span className="font-semibold text-emerald-400">{matchedProfile.profileName}</span>
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  1-Click Auto-Mapped
                </Badge>
              </div>
            )}

            {/* AI File Type Detection Result */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={`${FILE_TYPE_DEFINITIONS[detectedFileType].badgeColor} border text-xs gap-1.5 px-3 py-1`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    Detected: {FILE_TYPE_DEFINITIONS[detectedFileType].name}
                  </Badge>
                  <span className="text-xs font-bold text-emerald-300 font-mono">{detectionConfidence}% Confidence</span>
                </div>

                {/* Change File Type Selector */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Change Type:</span>
                  <Select value={detectedFileType} onValueChange={(v) => handleFileTypeChange(v as BusinessFileType)}>
                    <SelectTrigger className="h-7 text-xs rounded-xl bg-background border-border/60 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(FILE_TYPE_DEFINITIONS).map((def) => (
                        <SelectItem key={def.type} value={def.type} className="text-xs">
                          {def.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">AI Reasoning:</span> {detectionReasoning}
              </p>
            </div>

            {/* Universal Data Mapper Header */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">Universal Data Mapping AI</span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Schema: <strong className="text-purple-300 font-mono">analyzeup_v1</strong> • Review detected field associations before validation.
                </p>
              </div>

              {Object.values(mappingConfidence).some(c => c < 80) && (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  User Review Recommended
                </Badge>
              )}
            </div>

            {isAiDetecting ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs font-semibold">AI is mapping columns for {FILE_TYPE_DEFINITIONS[detectedFileType].name}...</p>
              </div>
            ) : (
              <div className="border border-border/50 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-secondary/80 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-1/3">Source Column Header</TableHead>
                      <TableHead className="w-8 text-center">→</TableHead>
                      <TableHead className="w-1/3">Canonical Field (analyzeup_v1)</TableHead>
                      <TableHead className="w-1/6 text-center">Match Confidence</TableHead>
                      <TableHead className="w-1/4">Sample Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawHeaders.map((header) => {
                      const mappedKey = fieldMapping[header] || 'skip';
                      const conf = mappingConfidence[header] || 85;
                      const sampleVal = rawRows[0]?.[header] || '—';
                      const targetFields = FILE_TYPE_DEFINITIONS[detectedFileType].fields;

                      return (
                        <TableRow key={header} className={mappedKey !== 'skip' ? 'bg-emerald-500/5' : 'opacity-60'}>
                          <TableCell className="font-semibold text-foreground">
                            <div className="flex items-center gap-1.5">
                              <ThreeTierBadge tier="ACTUAL_DATA" size="sm" />
                              <span>{header}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-emerald-400">→</TableCell>
                          <TableCell>
                            <Select
                              value={mappedKey}
                              onValueChange={(val) => setFieldMapping(prev => ({ ...prev, [header]: val }))}
                            >
                              <SelectTrigger className="h-8 text-xs rounded-xl bg-background border-border/60">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {targetFields.map((f) => (
                                  <SelectItem key={f.key} value={f.key} className="text-xs">
                                    {f.label} {f.required ? '*' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            {mappedKey !== 'skip' ? (
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  conf >= 90
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : conf >= 80
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {conf}% {conf < 80 ? '⚠️ Review' : 'AI'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-secondary text-muted-foreground text-[10px]">
                                Skipped
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-muted-foreground truncate max-w-[140px]">
                            {String(sampleVal)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Stage 3: Human Accountant Business Impact Preview */}
        {stage === 3 && (
          <div className="space-y-4 py-2 overflow-y-auto flex-1">
            {/* Impact Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/40 space-y-1">
                <span className="text-[11px] text-muted-foreground block">Total Records</span>
                <span className="text-xl font-bold">{impactMetrics.totalRows}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <span className="text-[11px] text-emerald-400 block font-medium">Est. Revenue Impact</span>
                <span className="text-xl font-bold text-emerald-400">₹{(impactMetrics.estimatedRevenue / 1000).toFixed(1)}k</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <span className="text-[11px] text-emerald-300 block font-medium">Products Found</span>
                <span className="text-xl font-bold text-emerald-300">{impactMetrics.productsFoundCount}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                <span className="text-[11px] text-blue-400 block font-medium">
                  {detectedFileType === 'SALES_REPORT' ? 'Orders Found' : 'New Categories'}
                </span>
                <span className="text-xl font-bold text-blue-400">
                  {detectedFileType === 'SALES_REPORT' ? impactMetrics.ordersFoundCount : impactMetrics.newCategories}
                </span>
              </div>
            </div>

            {/* Business Impact Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/20 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Accountant Business Preview Ready
                </h4>
                <p className="text-muted-foreground">
                  Valid Records: <span className="text-emerald-400 font-bold">{impactMetrics.validCount}</span> • Errors: <span className="text-rose-400 font-bold">{impactMetrics.invalidCount}</span>
                </p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                Safe Multi-Entity Link
              </Badge>
            </div>

            {/* Normalized Preview Table */}
            <div className="border border-border/50 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
              <Table className="text-xs">
                <TableHeader className="bg-secondary/70">
                  <TableRow>
                    <TableHead className="w-8">Status</TableHead>
                    <TableHead>Normalized Item</TableHead>
                    <TableHead>SKU / Ref</TableHead>
                    <TableHead>Price / Rate</TableHead>
                    <TableHead>Qty / Stock</TableHead>
                    <TableHead>Validation Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {normalizedItems.slice(0, 50).map((item, idx) => (
                    <TableRow key={idx} className={item.isValid ? '' : 'bg-rose-500/5'}>
                      <TableCell>
                        {item.isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{item.parsed?.name || '—'}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{item.parsed?.sku || item.parsed?.orderNo || '—'}</TableCell>
                      <TableCell className="font-semibold text-emerald-400">₹{item.parsed?.price || 0}</TableCell>
                      <TableCell>{item.parsed?.qty || item.parsed?.stock || 0}</TableCell>
                      <TableCell>
                        {item.isValid && <span className="text-[10px] text-emerald-400 font-medium">Ready to connect</span>}
                        {item.errors?.map((err: string, eIdx: number) => (
                          <span key={eIdx} className="text-[10px] text-rose-400 block font-medium">• {err}</span>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {normalizedItems.length > 50 && (
                <div className="p-2.5 bg-secondary/60 text-center text-xs text-muted-foreground border-t border-border/40 font-medium">
                  Showing first 50 preview records • <span className="text-emerald-400 font-semibold">All {normalizedItems.length.toLocaleString()} records</span> will be linked on import
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 4: Processing */}
        {stage === 4 && (
          <div className="py-10 text-center space-y-6 max-w-md mx-auto">
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            </div>
            
            <div className="space-y-2">
              <h4 className="text-base font-bold text-foreground">
                Importing & Ingesting Dataset...
              </h4>
              <p className="text-xs text-muted-foreground">
                Batch {jobCurrentBatch} of {jobTotalBatches} • {jobProcessedCount.toLocaleString()} / {rawRows.length.toLocaleString()} records processed
              </p>
            </div>

            <div className="space-y-2">
              <Progress value={jobProgress} className="h-2.5 bg-secondary" />
              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>{jobProgress}% Complete</span>
                {jobFailedCount > 0 && (
                  <span className="text-amber-400 font-semibold">{jobFailedCount} skipped rows</span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs border-border/60 text-muted-foreground hover:text-foreground"
              >
                Run in Background (Safe to Navigate)
              </Button>
            </div>
          </div>
        )}

        {/* Stage 5: Summary */}
        {stage === 5 && importSummary && (
          <div className="space-y-4 py-4 text-center">
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 w-12 h-12 mx-auto flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-foreground">Business Import Complete!</h3>
              <p className="text-xs text-muted-foreground">
                AnalyzeUp has successfully connected your {importSummary.fileTypeName} into your live business dashboard.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-left max-w-md mx-auto">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <span className="text-[11px] text-emerald-400 font-medium block">Records Connected</span>
                <span className="text-xl font-bold text-emerald-400">{importSummary.importedCount.toLocaleString()}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <span className="text-[11px] text-emerald-300 font-medium block">Est. Revenue</span>
                <span className="text-xl font-bold text-emerald-300">₹{((importSummary.revenueImpact || 0) / 1000).toFixed(1)}k</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/40 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">Execution Speed</span>
                <span className="text-xl font-bold font-mono">{importSummary.executionTimeMs}ms</span>
              </div>
            </div>

            {(importSummary as any).failedCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 text-xs text-amber-300 max-w-md mx-auto flex items-center justify-between border border-amber-500/20">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  {(importSummary as any).failedCount} invalid records skipped safely without halting import.
                </span>
                <Badge variant="outline" className="bg-amber-500/20 text-amber-200 text-[10px]">
                  Logged to Audit
                </Badge>
              </div>
            )}

            <div className="p-3 rounded-xl bg-emerald-500/10 text-xs text-emerald-300 max-w-md mx-auto flex items-center justify-between border border-emerald-500/20">
              <span className="flex items-center gap-1.5">
                <BookmarkPlus className="w-4 h-4 text-emerald-400" />
                Format remembered for 1-click future imports!
              </span>
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-200 text-[10px]">
                Profile Saved
              </Badge>
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

          {stage === 2 && (
            <>
              <Button variant="outline" onClick={() => setStage(1)} className="rounded-xl text-xs gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Re-upload File
              </Button>
              <Button
                onClick={handleConfirmMapping}
                disabled={isAiDetecting}
                className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25"
              >
                Confirm & View Business Impact <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {stage === 3 && (
            <>
              <Button variant="outline" onClick={() => setStage(2)} className="rounded-xl text-xs gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Adjust Mapping
              </Button>
              <Button
                onClick={handleExecuteBusinessImport}
                disabled={impactMetrics.validCount === 0}
                className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25"
              >
                Connect {impactMetrics.validCount} Business Records
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {stage === 5 && (
            <Button onClick={handleClose} className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 w-full sm:w-auto">
              View Updated Dashboard
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
