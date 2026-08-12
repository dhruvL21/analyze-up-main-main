'use client';

import React, { useState, useEffect } from 'react';
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
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, collection, setDoc, addDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { ImportDialog } from '@/components/import-dialog';
import { findMatchingImportProfile } from '@/lib/import-profile-store';
import Papa from 'papaparse';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Bell,
  Lock,
  ArrowRight,
  Zap,
  Cloud,
  Loader2,
  FolderOpen,
  AlertCircle,
  RefreshCw,
  History as HistoryIcon,
  Trash2,
  Check,
  AlertTriangle,
  Folder,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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
  const {
    businessProfile,
    setShowShopifyModal,
    products,
    categories,
    suppliers,
    addCategory,
    addSupplier,
    bulkAddProducts,
    bulkAddTransactions
  } = useData();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Real Google Drive integration states
  const [driveConnection, setDriveConnection] = useState<any>(null);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [driveFolders, setDriveFolders] = useState<any[]>([]);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [isLoadingConnection, setIsLoadingConnection] = useState(true);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isLoadingScan, setIsLoadingScan] = useState(false);
  
  // UI Dialog/Modals States
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isFolderCreating, setIsFolderCreating] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'scanning' | 'syncing' | 'success'>('idle');
  const [isSyncingFileId, setIsSyncingFileId] = useState<string | null>(null);

  // Preset file for ImportDialog integration
  const [presetFile, setPresetFile] = useState<{ name: string; content: string; driveFileId?: string } | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Sync Stats derived from Firestore tracked files
  const [syncStats, setSyncStats] = useState({
    filesCount: 0,
    rowsCount: 0,
    duplicatesCount: 0,
    errorsCount: 0
  });

  // 1. Subscribe to real Google Drive connection state
  useEffect(() => {
    if (!user || !firestore) {
      setIsLoadingConnection(false);
      return;
    }

    const docRef = doc(firestore, 'users', user.uid, 'integrations', 'google-drive');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists() && snap.data().connectionStatus === 'Connected') {
        setDriveConnection(snap.data());
      } else {
        setDriveConnection(null);
      }
      setIsLoadingConnection(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  // 2. Fetch scanned files list and stats on connection changes
  useEffect(() => {
    if (driveConnection && user) {
      scanDriveFolder();
      loadSyncHistory();
      loadStats();
    }
  }, [driveConnection, user]);

  const loadStats = async () => {
    if (!user || !firestore) return;
    try {
      const filesSnap = await getDocs(collection(firestore, 'users', user.uid, 'google_drive_files'));
      let rows = 0;
      let files = 0;
      let errors = 0;
      let duplicates = 0;

      filesSnap.forEach(doc => {
        const d = doc.data();
        files++;
        if (d.status === 'Synced') {
          rows += d.validRows || 0;
        } else if (d.status === 'Needs Review') {
          errors += d.errorRows || 0;
        }
        duplicates += d.skippedDuplicates || 0;
      });

      setSyncStats({
        filesCount: files,
        rowsCount: rows,
        duplicatesCount: duplicates,
        errorsCount: errors
      });
    } catch (e) {
      console.error(e);
    }
  };

  const loadSyncHistory = async () => {
    if (!user || !firestore) return;
    try {
      const snap = await getDocs(collection(firestore, 'users', user.uid, 'sync_history'));
      const historyList = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime());
      setSyncHistory(historyList);
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Authenticate with Google Drive (Redirect to Server OAuth API)
  const connectGoogleDrive = () => {
    if (!user) return;
    window.location.href = `/api/drive/auth?userId=${user.uid}`;
  };

  // 4. Disconnect Google Drive connection
  const disconnectGoogleDrive = async () => {
    if (!user || !firestore) return;
    if (!window.confirm('Are you sure you want to disconnect Google Drive? This will clear connection credentials.')) return;

    try {
      const docRef = doc(firestore, 'users', user.uid, 'integrations', 'google-drive');
      await deleteDoc(docRef);
      setDriveConnection(null);
      setDriveFiles([]);
      toast({
        title: 'Google Drive Disconnected',
        description: 'Successfully revoked credentials from AnalyzeUp workspace.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Disconnection Failed',
        description: 'Failed to delete connection document.',
      });
    }
  };

  // 5. Scan Folder for files
  const scanDriveFolder = async () => {
    if (!user) return;
    setIsLoadingScan(true);
    setSyncState('scanning');
    try {
      const res = await fetch('/api/drive/scan', {
        headers: {
          'x-user-uid': user.uid
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDriveFiles(data.files || []);
        loadStats();
      } else {
        toast({
          variant: 'destructive',
          title: 'Folder Scan Failed',
          description: data.error || 'Could not list files in the sync folder.',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingScan(false);
      setSyncState('idle');
    }
  };

  // 6. Fetch Available Folders for selection
  const fetchFolders = async () => {
    if (!user) return;
    setIsLoadingFolders(true);
    try {
      const res = await fetch('/api/drive/folders', {
        headers: {
          'x-user-uid': user.uid
        }
      });
      const data = await res.json();
      if (res.ok) {
        setDriveFolders(data.files || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // 7. Select Folder or Auto-create Sync folder
  const selectFolder = async (folderId?: string, folderName?: string) => {
    if (!user) return;
    if (!folderId) setIsFolderCreating(true);

    try {
      const res = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user.uid
        },
        body: JSON.stringify({ folderId, folderName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowFolderModal(false);
        toast({
          title: folderId ? 'Folder Synced' : 'AnalyzeUp Sync Folder Created! 📁',
          description: `Ingestion scoped to directory "${data.folderName}".`,
        });
        scanDriveFolder();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFolderCreating(false);
    }
  };

  // 8. Silent Sync or Manual Mapping Ingestion Flow
  const syncFile = async (file: any) => {
    if (!user || !firestore) return;
    setIsSyncingFileId(file.id);
    setSyncState('syncing');

    try {
      const res = await fetch('/api/drive/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user.uid
        },
        body: JSON.stringify({ fileId: file.id, fileName: file.name })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to download file content.');
      }

      // Check if there is an existing mapping profile signature in Firestore
      const results = Papa.parse(data.csvContent, { header: true, skipEmptyLines: true });
      const rawRows = results.data as Record<string, any>[];
      if (rawRows.length === 0) {
        throw new Error('Spreadsheet has no data rows.');
      }

      const headers = Object.keys(rawRows[0]);
      
      // Load saved mapping profiles from Firestore
      const profilesSnap = await getDocs(collection(firestore, 'users', user.uid, 'mapping_profiles'));
      const profiles = profilesSnap.docs.map(d => d.data());
      const currentSignature = headers.slice().sort().join('|').toLowerCase();
      const matchedProfile = profiles.find(p => p.headersSignature === currentSignature);

      if (matchedProfile) {
        // Auto Sync: Run direct ingestion silently on the client side
        await runSilentIngestion(file.id, file.name, data.csvContent, matchedProfile);
      } else {
        // Needs Review / Custom Mapping: Open the mapping wizard modal with preset file content
        setPresetFile({
          name: file.name,
          content: data.csvContent,
          driveFileId: file.id
        });
        setIsImportDialogOpen(true);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Action Failed',
        description: err?.message || 'Verification failed.',
      });
    } finally {
      setIsSyncingFileId(null);
      setSyncState('idle');
    }
  };

  // 9. Client-side silent normalization & ingestion
  const runSilentIngestion = async (fileId: string, fileName: string, csvContent: string, profile: any) => {
    if (!user || !firestore) return;
    try {
      const results = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
      const rawRows = results.data as Record<string, any>[];
      const fileType = profile.fileType;
      const fieldMapping = profile.mapping;

      const existingSkus = new Set(products.map(p => p.sku?.toUpperCase()));
      const seenSkusInFile = new Set<string>();

      // Normalize Rows using the matched mapping profile
      const normalizedItems = rawRows.map((rawRow, idx) => {
        const obj: Record<string, any> = { isValid: true, errors: [], warnings: [] };

        Object.entries(fieldMapping).forEach(([csvHeader, targetKey]) => {
          const keyStr = targetKey as string;
          if (keyStr === 'skip') return;
          const val = rawRow[csvHeader];
          if (val !== undefined && val !== null) {
            obj[keyStr] = val.toString().trim();
          }
        });

        if (fileType === 'SALES_REPORT') {
          const name = obj.productName || obj.name || '';
          const price = parseFloat((obj.sellingPrice || obj.price || '0').replace(/[^0-9.]/g, '')) || 0;
          const costPrice = parseFloat((obj.costPrice || '0').replace(/[^0-9.]/g, '')) || 0;
          const qty = parseInt((obj.quantity || obj.stock || '1').replace(/[^0-9]/g, ''), 10) || 1;
          const orderNo = obj.orderNumber || `INV-${1000 + idx}`;
          const customer = obj.customerName || 'Retail Customer';
          const date = obj.orderDate || new Date().toISOString().split('T')[0];

          if (!name) obj.errors.push('Missing product name');
          if (price <= 0) obj.errors.push('Invalid price');
          if (qty <= 0) obj.errors.push('Invalid quantity');

          obj.parsed = { name, price, costPrice, qty, orderNo, customer, date, sku: obj.sku || `SKU-${idx + 1}` };
        } else if (fileType === 'INVENTORY_MASTER' || fileType === 'WAREHOUSE_STOCK') {
          const name = obj.name || obj.productName || '';
          const price = parseFloat((obj.price || obj.sellingPrice || '0').replace(/[^0-9.]/g, '')) || 0;
          const costPrice = parseFloat((obj.costPrice || '0').replace(/[^0-9.]/g, '')) || 0;
          const stock = parseInt((obj.stock || obj.quantity || '0').replace(/[^0-9]/g, ''), 10) || 0;
          const sku = (obj.sku || `AUTOSKU-${idx + 1}`).toUpperCase();
          const category = obj.category || 'General';
          const supplier = obj.supplier || obj.supplierName || '';

          if (!name) obj.errors.push('Missing product name');
          if (price <= 0) obj.errors.push('Invalid price');
          if (stock < 0) obj.errors.push('Negative stock');

          if (existingSkus.has(sku)) obj.warnings.push(`SKU already exists`);
          if (seenSkusInFile.has(sku)) obj.errors.push(`Duplicate SKU inside file`);
          else seenSkusInFile.add(sku);

          obj.parsed = { name, price, costPrice, stock, sku, category, supplier, unit: obj.unit || 'Piece', description: obj.description || '' };
        } else {
          const name = obj.name || obj.productName || `Item #${idx + 1}`;
          const price = parseFloat((obj.price || '0').replace(/[^0-9.]/g, '')) || 0;
          const qty = parseInt((obj.quantity || '1').replace(/[^0-9]/g, ''), 10) || 1;
          obj.parsed = { name, price, qty, sku: obj.sku || `ITEM-${idx + 1}` };
        }

        obj.isValid = obj.errors.length === 0;
        return obj;
      });

      const validRows = normalizedItems.filter(r => r.isValid);
      if (validRows.length === 0) {
        throw new Error('No valid records found in spreadsheet.');
      }

      // Auto-create Categories
      const fileCategories = Array.from(new Set(validRows.map(r => r.parsed.category || 'General').filter(Boolean)));
      const existingCatMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
      for (const catName of fileCategories) {
        if (!existingCatMap.has(catName.toLowerCase())) {
          await addCategory({ name: catName, description: 'Created during AI business import' });
        }
      }

      // Auto-create Suppliers
      const fileSuppliers = Array.from(new Set(validRows.map(r => r.parsed.supplier || 'Import Vendor').filter(Boolean)));
      const existingSupMap = new Map(suppliers.map(s => [s.name.toLowerCase(), s.id]));
      for (const supName of fileSuppliers) {
        if (!existingSupMap.has(supName.toLowerCase())) {
          await addSupplier({
            name: supName,
            contactName: 'Import Contact',
            email: `orders@${supName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
            phone: '+91 90000 00000',
            address: 'Imported via AI Engine',
          });
        }
      }

      // Ingest Products or Transactions
      if (fileType === 'INVENTORY_MASTER' || fileType === 'WAREHOUSE_STOCK') {
        const productsToImport = validRows.map(r => ({
          name: r.parsed.name,
          sku: r.parsed.sku,
          description: r.parsed.description || `Imported ${r.parsed.name}`,
          categoryId: existingCatMap.get((r.parsed.category || '').toLowerCase()) || 'cat-general',
          supplier: r.parsed.supplier || '',
          supplierId: existingSupMap.get((r.parsed.supplier || '').toLowerCase()) || '',
          price: r.parsed.price,
          costPrice: r.parsed.costPrice && r.parsed.costPrice > 0 ? r.parsed.costPrice : Math.round(r.parsed.price * 0.6),
          stock: r.parsed.stock,
          minStock: 5,
          maxStock: Math.max(100, r.parsed.stock * 2),
          unit: r.parsed.unit || 'Piece',
          status: 'Active' as const,
          averageDailySales: 1.5,
          leadTimeDays: 7,
        }));

        await bulkAddProducts(productsToImport, true); // overwriteStock = true
      } else if (fileType === 'SALES_REPORT') {
        const transactionsToImport = validRows.map((r, idx) => ({
          type: 'Sale' as const,
          productId: `prod-${r.parsed.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          productName: r.parsed.name,
          quantity: r.parsed.qty,
          price: r.parsed.price,
          totalRevenue: r.parsed.price * r.parsed.qty,
          costPerUnit: r.parsed.costPrice && r.parsed.costPrice > 0 ? r.parsed.costPrice : Math.round(r.parsed.price * 0.6),
          totalCost: (r.parsed.costPrice && r.parsed.costPrice > 0 ? r.parsed.costPrice : Math.round(r.parsed.price * 0.6)) * r.parsed.qty,
          customerName: r.parsed.customer,
          transactionDate: r.parsed.date,
          status: 'Completed',
          paymentMethod: 'UPI',
        }));

        await bulkAddTransactions(transactionsToImport);
      }

      // Track Google Drive file synced version in Firestore
      const fileRef = doc(firestore, 'users', user.uid, 'google_drive_files', fileId);
      await setDoc(fileRef, {
        id: fileId,
        fileName,
        status: 'Synced',
        lastProcessedAt: new Date().toISOString(),
        validRows: validRows.length,
        size: csvContent.length,
        modifiedTime: new Date().toISOString(),
      }, { merge: true });

      // Save to Sync History log
      await addDoc(collection(firestore, 'users', user.uid, 'sync_history'), {
        syncedAt: new Date().toISOString(),
        filesCount: 1,
        rowsCount: validRows.length,
        status: 'Completed',
        files: [fileName],
      });

      // Update Drive lastSyncAt
      const connRef = doc(firestore, 'users', user.uid, 'integrations', 'google-drive');
      await updateDoc(connRef, {
        lastSyncAt: new Date().toISOString(),
      });

      toast({
        title: 'File Synced Successfully ✨',
        description: `Imported ${validRows.length} records. Business Intelligence recalculated.`,
      });

      scanDriveFolder();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Sync Ingestion Failed',
        description: err?.message || 'Failed to normalize data.',
      });
    }
  };

  // 10. Open Mapping Dialog callback to register the mapping profile in Firestore
  const handleImportComplete = async (summary: any) => {
    if (!user || !firestore || !presetFile) return;

    try {
      const fileId = presetFile.driveFileId || `custom-${Date.now()}`;
      
      // Save Mapping Profile in Firestore so that subsequent syncs run automatically
      const currentSignature = rawHeadersSignature(presetFile.content);
      const profileRef = doc(firestore, 'users', user.uid, 'mapping_profiles', `profile-${fileId}`);
      await setDoc(profileRef, {
        id: `profile-${fileId}`,
        profileName: `Auto Map for ${presetFile.name}`,
        fileType: summary.fileType,
        headersSignature: currentSignature,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Track Drive file synced version in Firestore
      const fileRef = doc(firestore, 'users', user.uid, 'google_drive_files', fileId);
      await setDoc(fileRef, {
        id: fileId,
        fileName: presetFile.name,
        status: 'Synced',
        lastProcessedAt: new Date().toISOString(),
        validRows: summary.importedCount,
        size: presetFile.content.length,
        modifiedTime: new Date().toISOString(),
      }, { merge: true });

      // Add to Sync History log
      await addDoc(collection(firestore, 'users', user.uid, 'sync_history'), {
        syncedAt: new Date().toISOString(),
        filesCount: 1,
        rowsCount: summary.importedCount,
        status: 'Completed',
        files: [presetFile.name],
      });

      // Update Drive lastSyncAt
      const connRef = doc(firestore, 'users', user.uid, 'integrations', 'google-drive');
      await updateDoc(connRef, {
        lastSyncAt: new Date().toISOString(),
      });

      setPresetFile(null);
      scanDriveFolder();
    } catch (e) {
      console.error('Failed to register mapping profile:', e);
    }
  };

  const rawHeadersSignature = (csvContent: string): string => {
    const results = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    const headers = Object.keys(results.data[0] || {});
    return headers.slice().sort().join('|').toLowerCase();
  };

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
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            Connect & Channels
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
            placeholder="Search channels..."
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
          Available Connections
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="ios-glass border-emerald-500/30 hover:border-emerald-500/60 transition-all rounded-2xl overflow-hidden relative group flex flex-col h-full">
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
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
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
              </div>

              <Button
                onClick={() => setShowShopifyModal(true)}
                className="w-full rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md mt-auto"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {isShopifyConnected ? 'Manage Shopify Settings' : 'Connect Shopify Store'}
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </Button>
            </CardContent>
          </Card>

          {/* Real Google Drive Card */}
          <Card className="ios-glass border-blue-500/30 hover:border-blue-500/60 transition-all rounded-2xl overflow-hidden relative group flex flex-col h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl p-2 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    📁
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      Google Drive
                      {isLoadingConnection ? (
                        <Badge variant="outline" className="text-zinc-500 text-[10px] gap-1 py-0 px-2">
                          <Loader2 className="w-3 h-3 animate-spin" /> Loading
                        </Badge>
                      ) : driveConnection ? (
                        <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 text-[10px] gap-1 py-0 px-2 font-bold">
                          <Check className="w-3.5 h-3.5" /> Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-500 border-blue-500/30 text-[10px]">
                          Available
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">Cloud Folder & Sheet Sync</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              {isLoadingConnection ? (
                <div className="py-6 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : !driveConnection ? (
                // State 1: Disconnected
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-muted-foreground">
                    Connect your business data folder to automatically sync sales spreadsheets and catalog updates without manual uploads.
                  </p>
                  <Button
                    onClick={connectGoogleDrive}
                    className="w-full rounded-xl text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-md font-bold mt-4"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    Connect Google Drive
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </Button>
                </div>
              ) : !driveConnection.selectedFolderId ? (
                // State 2: Connected but folder not selected
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-500">Folder Required</p>
                      <p className="text-muted-foreground mt-0.5">Please select or create a sync folder to scan files.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowFolderModal(true);
                        fetchFolders();
                      }}
                      className="flex-1 rounded-xl text-xs font-semibold gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Select Sync Folder
                    </Button>
                    <Button
                      onClick={disconnectGoogleDrive}
                      variant="ghost"
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl text-xs px-3"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                // State 3: Connected & Active Folder Selected
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="p-3.5 rounded-2xl bg-blue-500/15 border border-blue-500/20 text-xs space-y-2">
                    <div className="flex items-center justify-between text-blue-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Folder className="w-4 h-4 text-blue-400" />
                        Folder: {driveConnection.selectedFolderName}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        Auto-Sync Off
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-blue-500/20 pt-2 text-zinc-300">
                      <div>
                        <span className="text-zinc-500">Last Sync: </span>
                        <span className="font-semibold">
                          {driveConnection.lastSyncAt
                            ? new Date(driveConnection.lastSyncAt).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Never'}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Files Detected: </span>
                        <span className="font-semibold">{syncStats.filesCount}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Rows Synced: </span>
                        <span className="font-semibold text-emerald-400">{syncStats.rowsCount}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Duplicates: </span>
                        <span className="font-semibold text-zinc-400">{syncStats.duplicatesCount} skipped</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={scanDriveFolder}
                      disabled={isLoadingScan}
                      className="flex-1 rounded-xl text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    >
                      {isLoadingScan ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" /> Sync Folder Now
                        </>
                      )}
                    </Button>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowFolderModal(true);
                          fetchFolders();
                        }}
                        className="rounded-xl text-xs font-semibold"
                      >
                        Change Folder
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowHistoryModal(true);
                          loadSyncHistory();
                        }}
                        className="rounded-xl text-xs p-2 text-zinc-400 hover:text-white"
                        title="Sync History log"
                      >
                        <HistoryIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={disconnectGoogleDrive}
                        variant="ghost"
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl text-xs px-2.5"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Scanned Files Section (Connected Folder view) */}
      {driveConnection && driveConnection.selectedFolderId && (
        <Card className="ios-glass border-border/40 rounded-3xl overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-400" />
                Folder Files List
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage and sync spreadsheets detected inside your connected folder.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={scanDriveFolder}
              disabled={isLoadingScan}
              className="rounded-xl text-xs gap-1.5 h-8 font-semibold border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingScan ? 'animate-spin' : ''}`} /> Scan Folder
            </Button>
          </div>

          {isLoadingScan && driveFiles.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs text-muted-foreground">Scanning folder contents...</p>
            </div>
          ) : driveFiles.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-border/60 rounded-2xl">
              <AlertCircle className="w-8 h-8 text-zinc-500 mx-auto" />
              <h4 className="text-sm font-semibold text-zinc-300">No spreadsheets found</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Place CSV or Excel files inside your <code className="bg-secondary px-1 py-0.5 rounded font-mono text-blue-400">{driveConnection.selectedFolderName}</code> Google Drive folder, then click Scan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-zinc-300">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground pb-2">
                    <th className="py-2.5 font-bold">File Name</th>
                    <th className="py-2.5 font-bold">Size</th>
                    <th className="py-2.5 font-bold">Last Modified</th>
                    <th className="py-2.5 font-bold">Synced Status</th>
                    <th className="py-2.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {driveFiles.map((file) => {
                    const isSyncing = isSyncingFileId === file.id;
                    const dateStr = new Date(file.modifiedTime).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={file.id} className="border-b border-zinc-900/50 hover:bg-secondary/10">
                        <td className="py-3 font-semibold text-zinc-200">{file.name}</td>
                        <td className="py-3 text-zinc-400">
                          {file.sizeBytes ? `${(file.sizeBytes / 1024).toFixed(1)} KB` : '0 KB'}
                        </td>
                        <td className="py-3 text-zinc-400">{dateStr}</td>
                        <td className="py-3">
                          {file.status === 'Synced' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] gap-1 px-2 py-0">
                              <Check className="w-3 h-3" /> Synced
                            </Badge>
                          ) : file.status === 'Modified' ? (
                            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] gap-1 px-2 py-0">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Modified
                            </Badge>
                          ) : file.status === 'Needs Review' ? (
                            <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] gap-1 px-2 py-0">
                              <AlertCircle className="w-3 h-3" /> Review Required
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0">
                              New File
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {file.status === 'Synced' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => syncFile(file)}
                              disabled={isSyncing}
                              className="h-7 text-[10px] font-semibold text-zinc-400 hover:text-white"
                            >
                              {isSyncing ? 'Processing...' : 'Re-Sync'}
                            </Button>
                          ) : file.status === 'Needs Review' ? (
                            <Button
                              size="sm"
                              onClick={() => syncFile(file)}
                              disabled={isSyncing}
                              className="h-7 text-[10px] font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-lg px-2.5"
                            >
                              Review & Map
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => syncFile(file)}
                              disabled={isSyncing}
                              className="h-7 text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-2.5"
                            >
                              {isSyncing ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" /> Syncing...
                                </>
                              ) : (
                                'Sync Now'
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

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

      {/* Dialog 1: Folder Selector Modal */}
      <Dialog open={showFolderModal} onOpenChange={setShowFolderModal}>
        <DialogContent className="sm:max-w-md bg-zinc-950/90 border border-blue-500/20 rounded-3xl ios-glass text-white shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-400" />
              Configure Sync Folder
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Select an existing folder from Google Drive or auto-create the recommended sync directory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <Button
              onClick={() => selectFolder()}
              disabled={isFolderCreating}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold gap-1.5 py-4"
            >
              {isFolderCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating folder...
                </>
              ) : (
                <>
                  <FolderOpen className="w-4 h-4" /> Create "AnalyzeUp_Data_Sync" Folder
                </>
              )}
            </Button>

            <div className="border-t border-zinc-800/40 my-3 pt-3">
              <p className="font-semibold text-zinc-400 mb-2">Or select from existing Drive folders:</p>
              {isLoadingFolders ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : driveFolders.length === 0 ? (
                <p className="text-[11px] text-zinc-500 italic text-center py-4">No folders found in Google Drive root.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-none pr-1">
                  {driveFolders.map(folder => (
                    <div
                      key={folder.id}
                      onClick={() => selectFolder(folder.id, folder.name)}
                      className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 hover:bg-blue-500/5 cursor-pointer transition-all flex items-center justify-between text-zinc-200"
                    >
                      <span className="font-semibold truncate pr-2">{folder.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Sync History Log Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="sm:max-w-lg bg-zinc-950/90 border border-blue-500/20 rounded-3xl ios-glass text-white shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-blue-400" />
              Sync History Log
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Audit log of files ingested from Google Drive sync folder.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto py-3 space-y-2.5 pr-1">
            {syncHistory.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-12">No synchronization records logged yet.</p>
            ) : (
              syncHistory.map(log => (
                <div key={log.id} className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">
                      {new Date(log.syncedAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0">
                      Completed
                    </Badge>
                  </div>
                  <div className="text-[11px] text-zinc-400 space-y-1">
                    <p>
                      Files Ingested: <span className="text-zinc-300 font-semibold">{(log.files || []).join(', ')}</span>
                    </p>
                    <p>
                      Impact: <span className="text-emerald-400 font-bold">+{log.rowsCount} records</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog 3: Silent Sync loading screen */}
      <Dialog open={syncState === 'syncing'} onOpenChange={() => {}}>
        <DialogContent className="max-w-xs bg-zinc-950/90 border border-blue-500/20 rounded-3xl ios-glass text-white shadow-2xl p-6 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-sm font-semibold text-zinc-300 text-center">Processing file data & updating Firestore...</p>
        </DialogContent>
      </Dialog>

      {/* Integrated ImportDialog for mapping config */}
      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        presetFile={presetFile}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
