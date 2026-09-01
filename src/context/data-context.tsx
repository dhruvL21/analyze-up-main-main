'use client';

import { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Product, PurchaseOrder, Supplier, Transaction, Category, ProductReturn, CustomAttribute, BusinessProfile, BusinessType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, setDoc, onSnapshot, getDocs, deleteField } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { generateDemoBusinessData } from '@/lib/demo-data';
import Papa from 'papaparse';
import { getClientDriveToken, isAutoSyncDue, autoDetectMapping, formatLastSyncTime } from '@/lib/drive-helper';
import { findMatchingImportProfile } from '@/lib/import-profile-store';
import { logBusinessAction } from '@/lib/audit-store';
import {
  type AnalyticsSummary,
  DEFAULT_ANALYTICS_SUMMARY,
  recalculateAndSaveAnalyticsSummary,
} from '@/lib/analytics-aggregator';
import { generateProductDocId, generateTransactionDocId } from '@/lib/import-job-service';

interface DataContextProps {
  products: Product[];
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  transactions: Transaction[];
  categories: Category[];
  returns: ProductReturn[];
  customAttributes: CustomAttribute[];
  businessProfile: BusinessProfile | null;
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => Promise<void>;
  loadDemoBusiness: (businessType?: BusinessType) => Promise<void>;
  clearDemoBusiness: () => Promise<void>;
  hasDemoData: boolean;
  showOnboardingWizard: boolean;
  setShowOnboardingWizard: (show: boolean) => void;
  showWelcomeModal: boolean;
  setShowWelcomeModal: (show: boolean) => void;
  showShopifyModal: boolean;
  setShowShopifyModal: (show: boolean) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  addCustomAttribute: (attribute: Omit<CustomAttribute, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addOrder: (order: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  receivePurchaseOrder: (orderId: string, customReceivedQty?: number) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  deleteSupplier: (supplierId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'userId'>) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>) => Promise<void>;
  recordSale: (productId: string, quantity: number) => Promise<void>;
  addReturn: (returnData: Omit<ProductReturn, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  deleteReturn: (returnId: string) => Promise<void>;
  updateReturnStatus: (returnId: string, refundStatus: string) => Promise<void>;
  bulkAddProducts: (products: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[], overwriteStock?: boolean) => Promise<void>;
  bulkUpdateProducts: (updates: (Partial<Product> & { id: string })[]) => Promise<void>;
  bulkDeleteProducts: (productIds: string[]) => Promise<void>;
  bulkAddTransactions: (transactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>[]) => Promise<void>;
  clearAllData: () => Promise<void>;
  // Google Drive & Integration Helpers
  driveConnection: any;
  autoSyncGoogleDriveNow: (showToast?: boolean) => Promise<void>;
  subscribeGoogleDriveConnection: (onUpdate: (data: any) => void) => () => void;
  getGoogleDriveFiles: () => Promise<any[]>;
  getSyncHistory: () => Promise<any[]>;
  getMappingProfiles: () => Promise<any[]>;
  disconnectGoogleDrive: () => Promise<void>;
  updateGoogleDriveSettings: (settings: Record<string, any>) => Promise<void>;
  recordSyncSuccess: (fileId: string, fileData: Record<string, any>, historyData: Record<string, any>) => Promise<void>;
  saveMappingProfile: (fileId: string, profileData: Record<string, any>) => Promise<void>;
  isLoading: boolean;
  activePlan: string;
  isProcessingPayment: string | null;
  showSubscriptionModal: boolean;
  setShowSubscriptionModal: (show: boolean) => void;
  isTourOpen: boolean;
  setIsTourOpen: (show: boolean) => void;
  isLimitExceeded: boolean;
  activePlanLimit: number;
  aiQueryCount: number;
  incrementAiQueryCount: (amount?: number) => void;
  handleUpgrade: (planId: string, amount: number, planName: string) => Promise<void>;
  analyticsSummary: AnalyticsSummary;
  refreshAnalytics: () => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

// Helper function to remove duplicates from an array of objects by a given key
const uniqueBy = <T extends Record<string, any>>(array: T[] | null, key: keyof T): T[] => {
  if (!array) return [];
  return Array.from(new Map(array.map(item => [item[key], item])).values());
}


// Helper function to remove undefined values from an object for Firestore compatibility
const cleanObject = (obj: any) => {
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result;
};


export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const productsRef = useMemo(() => user && firestore ? collection(firestore, 'users', user.uid, 'products') : null, [user, firestore]);
  const ordersRef = useMemo(() => user && firestore ? collection(firestore, 'users', user.uid, 'orders') : null, [user, firestore]);
  const suppliersRef = useMemo(() => user && firestore ? collection(firestore, 'users', user.uid, 'suppliers') : null, [user, firestore]);
  const transactionsRef = useMemo(() => user && firestore ? collection(firestore, 'users', user.uid, 'transactions') : null, [user, firestore]);
  const categoriesRef = useMemo(() => user && firestore ? collection(firestore, 'users', user.uid, 'categories') : null, [user, firestore]);
  const returnsRef = useMemo(() => user && firestore ? collection(firestore, 'users', user.uid, 'returns') : null, [user, firestore]);
  const customAttributesRef = useMemo(() => user && firestore ? collection(firestore, 'users', user.uid, 'custom_attributes') : null, [user, firestore]);
  const summaryRef = useMemo(() => user && firestore ? doc(firestore, 'users', user.uid, 'analytics', 'summary') : null, [user, firestore]);

  const { data: productsData, loading: productsLoading } = useCollection<Product>(productsRef);
  const { data: ordersData, loading: ordersLoading } = useCollection<PurchaseOrder>(ordersRef);
  const { data: suppliersData, loading: suppliersLoading } = useCollection<Supplier>(suppliersRef);
  const { data: transactionsData, loading: transactionsLoading } = useCollection<Transaction>(transactionsRef);
  const { data: categoriesData, loading: categoriesLoading } = useCollection<Category>(categoriesRef);
  const { data: returnsData, loading: returnsLoading } = useCollection<ProductReturn>(returnsRef);
  const { data: customAttributesData } = useCollection<CustomAttribute>(customAttributesRef);
  const { data: summaryData } = useDoc<AnalyticsSummary>(summaryRef);

  const products = useMemo(() => uniqueBy(productsData, 'id'), [productsData]);
  const orders = useMemo(() => uniqueBy(ordersData, 'id'), [ordersData]);
  const suppliers = useMemo(() => uniqueBy(suppliersData, 'name'), [suppliersData]);
  const transactions = useMemo(() => uniqueBy(transactionsData, 'id'), [transactionsData]);
  const categories = useMemo(() => uniqueBy(categoriesData, 'name'), [categoriesData]);
  const returns = useMemo(() => uniqueBy(returnsData, 'id'), [returnsData]);
  const customAttributes = useMemo(() => uniqueBy(customAttributesData, 'value'), [customAttributesData]);
  const analyticsSummary = useMemo(() => summaryData || DEFAULT_ANALYTICS_SUMMARY, [summaryData]);

  const refreshAnalytics = useCallback(async () => {
    if (!firestore || !user) return;
    try {
      await recalculateAndSaveAnalyticsSummary(firestore, user.uid, {
        products,
        transactions,
        suppliers,
        orders,
        returns,
      });
    } catch (err) {
      console.error('Failed to refresh analytics summary:', err);
    }
  }, [firestore, user, products, transactions, suppliers, orders, returns]);

  const [activePlan, setActivePlan] = useState<string>(() => {
    if (typeof window === 'undefined') return "Free Trial";
    return localStorage.getItem("analyzeup_subscription_plan") || "Free Trial";
  });
  const [aiQueryCount, setAiQueryCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = localStorage.getItem('analyzeup_ai_queries_count');
      return saved ? Math.max(0, parseInt(saved, 10)) : 0;
    } catch {
      return 0;
    }
  });

  const incrementAiQueryCount = useCallback((amount = 1) => {
    setAiQueryCount(prev => {
      const next = prev + amount;
      try {
        localStorage.setItem('analyzeup_ai_queries_count', next.toString());
      } catch (e) {
        console.error('Error saving AI query count:', e);
      }
      return next;
    });
  }, []);

  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);

  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState<boolean>(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
  const [showShopifyModal, setShowShopifyModal] = useState<boolean>(false);
  const [hasDemoData, setHasDemoData] = useState<boolean>(false);

  // Load business profile from localStorage
  useEffect(() => {
    if (!user) return;
    const localProfile = localStorage.getItem(`analyzeup_profile_${user.uid}`);
    if (localProfile) {
      try {
        const parsed = JSON.parse(localProfile);
        setBusinessProfile(parsed);
        if (parsed.inventorySetupMethod === 'demo') {
          setHasDemoData(true);
        }
      } catch (e) {
        console.error("Error parsing business profile:", e);
      }
    }
  }, [user]);

  const updateBusinessProfile = useCallback(async (updates: Partial<BusinessProfile>) => {
    if (!user) return;
    const updatedProfile: BusinessProfile = {
      businessName: 'My Business',
      businessType: 'Retail',
      industry: 'General Retail Store',
      businessSize: '2-10 Employees',
      currency: 'INR (₹)',
      timezone: 'Asia/Kolkata (GMT+5:30)',
      country: 'India',
      language: 'English',
      isOnboardingCompleted: true,
      ...businessProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setBusinessProfile(updatedProfile);
    localStorage.setItem(`analyzeup_profile_${user.uid}`, JSON.stringify(updatedProfile));

    if (firestore) {
      const profileRef = doc(firestore, 'users', user.uid, 'settings', 'business_profile');
      await setDoc(profileRef, cleanObject(updatedProfile), { merge: true }).catch(console.error);
    }
    toast({ title: 'Business Profile Updated', description: 'Your business preferences have been saved.' });
  }, [user, firestore, businessProfile, toast]);

  const loadDemoBusiness = useCallback(async (customType?: BusinessType) => {
    if (!user || !firestore) return;
    toast({ title: 'Generating Demo Business...', description: 'Loading 200+ products, 15+ suppliers & 500+ transactions.' });

    const demo = generateDemoBusinessData();
    const uid = user.uid;

    try {
      // Chunk writing into batch commitments
      const pBatches = [];
      for (let i = 0; i < demo.products.length; i += 450) {
        const batch = writeBatch(firestore);
        const chunk = demo.products.slice(i, i + 450);
        chunk.forEach(p => {
          const ref = doc(firestore, 'users', uid, 'products', p.id);
          batch.set(ref, cleanObject({ ...p, userId: uid }));
        });
        pBatches.push(batch.commit());
      }
      await Promise.all(pBatches);

      const supBatch = writeBatch(firestore);
      demo.suppliers.forEach(s => {
        const ref = doc(firestore, 'users', uid, 'suppliers', s.id);
        supBatch.set(ref, cleanObject({ ...s, userId: uid }));
      });
      await supBatch.commit();

      const catBatch = writeBatch(firestore);
      demo.categories.forEach(c => {
        const ref = doc(firestore, 'users', uid, 'categories', c.id);
        catBatch.set(ref, cleanObject({ ...c, userId: uid }));
      });
      await catBatch.commit();

      const txBatches = [];
      for (let i = 0; i < demo.transactions.length; i += 450) {
        const batch = writeBatch(firestore);
        const chunk = demo.transactions.slice(i, i + 450);
        chunk.forEach(t => {
          const ref = doc(firestore, 'users', uid, 'transactions', t.id);
          batch.set(ref, cleanObject({ ...t, userId: uid }));
        });
        txBatches.push(batch.commit());
      }
      await Promise.all(txBatches);

      const poBatch = writeBatch(firestore);
      demo.orders.forEach(o => {
        const ref = doc(firestore, 'users', uid, 'orders', o.id);
        poBatch.set(ref, cleanObject({ ...o, userId: uid }));
      });
      demo.returns.forEach(r => {
        const ref = doc(firestore, 'users', uid, 'returns', r.id);
        poBatch.set(ref, cleanObject({ ...r, userId: uid }));
      });
      await poBatch.commit();

      // Recalculate and persist Analytics Summary & AI Brief immediately for complete dashboard fidelity
      await recalculateAndSaveAnalyticsSummary(firestore, uid, {
        products: demo.products,
        transactions: demo.transactions,
        suppliers: demo.suppliers,
        orders: demo.orders,
        returns: demo.returns,
      }).catch(console.error);

      setHasDemoData(true);

      const targetType = customType || businessProfile?.businessType || 'Fashion';
      await updateBusinessProfile({
        businessType: targetType,
        isOnboardingCompleted: true,
        inventorySetupMethod: 'demo',
      });

      setShowWelcomeModal(true);
    } catch (err) {
      console.error("Error populating demo data:", err);
      toast({ variant: 'destructive', title: 'Demo Business Error', description: 'Failed to populate full demo dataset.' });
    }
  }, [user, firestore, toast, businessProfile, updateBusinessProfile]);

  useEffect(() => {
    const stored = localStorage.getItem("analyzeup_subscription_plan");
    if (stored) {
      setActivePlan(stored);
    }
  }, []);

  const activePlanLimit = useMemo(() => {
    if (activePlan === "Starter Plan") return 25000;
    if (activePlan === "Growth Plan") return 50000;
    if (activePlan === "Pro Plan") return 250000;
    return 10000; // Free Baseline allows 10,000 records
  }, [activePlan]);

  const isLimitExceeded = useMemo(() => {
    return products.length >= activePlanLimit;
  }, [products.length, activePlanLimit]);

  const handleUpgrade = useCallback(async (planId: string, amount: number, planName: string) => {
    setIsProcessingPayment(planId);
    try {
      // 1. Create order on backend
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId, amount, planName }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Order creation failed");
      }

      const { order, keyId } = data;

      // 2. Open Razorpay Checkout modal
      const options = {
        key: keyId || "rzp_test_T40kl4zsYBSbQl",
        amount: order.amount,
        currency: order.currency,
        name: "AnalyzeUp",
        description: `Upgrade to ${planName}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            // 3. Verify payment signature on backend
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              localStorage.setItem("analyzeup_subscription_plan", planName);
              setActivePlan(planName);
              setShowSubscriptionModal(false);
              toast({
                title: "Payment Successful!",
                description: `You have successfully upgraded to ${planName}.`,
              });
            } else {
              toast({
                title: "Verification Failed",
                description: "Payment verification failed. Please contact support.",
                variant: "destructive",
              });
            }
          } catch (err: any) {
            console.error("Verification error:", err);
            toast({
              title: "Verification Error",
              description: "An error occurred while verifying the payment.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: "Workspace Owner",
          email: "owner@example.com",
        },
        theme: {
          color: "#9a3412",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast({
          title: "Payment Failed",
          description: response.error.description || "The transaction was unsuccessful.",
          variant: "destructive",
        });
      });
      rzp.open();
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast({
        title: "Checkout Error",
        description: error.message || "Could not launch Razorpay checkout modal.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(null);
    }
  }, [toast]);

  const isLoading = !user || productsLoading || transactionsLoading;

  const addCategory = useCallback(async (categoryData: Omit<Category, 'id' | 'userId'>) => {
    if (!firestore || !user || !categoriesRef) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add category.' });
      throw new Error("Not authenticated");
    }
    const newCategory = {
      ...categoryData,
      userId: user.uid,
    };
    addDoc(categoriesRef, newCategory).catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: categoriesRef.path,
        operation: 'create',
        requestResourceData: newCategory,
      }));
    });
  }, [firestore, user, categoriesRef, toast]);


  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (isLimitExceeded) {
      setShowSubscriptionModal(true);
      toast({
        variant: 'destructive',
        title: 'Limit Exceeded',
        description: `You have reached the product limit (${activePlanLimit}) for your plan. Please upgrade to add more products.`,
      });
      return;
    }
    if (!firestore || !user || !productsRef || !transactionsRef) return;

    const batch = writeBatch(firestore);
    const newProductRef = doc(productsRef);

    const newProduct: any = {
      ...productData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      averageDailySales: Math.floor(Math.random() * 10) + 1,
      leadTimeDays: Math.floor(Math.random() * 10) + 5,
    };
    batch.set(newProductRef, newProduct);

    if (newProduct.stock > 0) {
      const transRef = doc(transactionsRef);
      batch.set(transRef, {
        userId: user.uid,
        productId: newProductRef.id,
        locationId: 'MAIN-WAREHOUSE',
        type: 'Purchase',
        quantity: newProduct.stock,
        transactionDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit().catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: productsRef.path,
        operation: 'create',
        requestResourceData: newProduct,
      }));
    });
    toast({ title: 'Product Added', description: `${productData.name} has been added.` });
  }, [firestore, user, productsRef, transactionsRef, toast, isLimitExceeded, activePlanLimit]);

  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>) => {
    if (!firestore || !user || !transactionsRef) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add transaction.' });
      throw new Error("Not authenticated");
    }

    const newTransaction = cleanObject({
      ...transactionData,
      tenantId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await addDoc(transactionsRef, newTransaction);
    } catch (serverError: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: transactionsRef.path,
        operation: 'create',
        requestResourceData: newTransaction,
      }));
    }
  }, [firestore, user, transactionsRef, toast]);

  const bulkAddProducts = useCallback(async (productsData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[], overwriteStock = false) => {
    if (!firestore || !user || !productsRef || !transactionsRef) return;

    const existingProductSkuMap = new Map(products.map(p => [(p.sku || '').toUpperCase(), p]));
    let newCount = 0;
    let updateCount = 0;

    // Split products into safe chunks of 200 items (each product produces 1-2 Firestore operations, safely under 500 limit)
    const CHUNK_SIZE = 200;
    for (let i = 0; i < productsData.length; i += CHUNK_SIZE) {
      const chunk = productsData.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(firestore);

      chunk.forEach(productData => {
        const skuUpper = (productData.sku || '').toUpperCase();
        const existingProduct = skuUpper ? existingProductSkuMap.get(skuUpper) : null;

        if (existingProduct) {
          // Update existing product stock & price safely
          const productRef = doc(productsRef, existingProduct.id);
          batch.update(productRef, cleanObject({
            price: productData.price || existingProduct.price,
            costPrice: productData.costPrice || existingProduct.costPrice,
            stock: overwriteStock ? productData.stock : (existingProduct.stock || 0) + (productData.stock || 0),
            supplier: productData.supplier || existingProduct.supplier,
            supplierId: productData.supplierId || existingProduct.supplierId,
            updatedAt: serverTimestamp(),
          }));
          updateCount++;
        } else {
          // Create new product
          const newProductRef = doc(productsRef);
          const newProduct: any = cleanObject({
            ...productData,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            averageDailySales: productData.averageDailySales || (Math.floor(Math.random() * 5) + 1),
            leadTimeDays: productData.leadTimeDays || (Math.floor(Math.random() * 7) + 5),
          });
          batch.set(newProductRef, newProduct);
          newCount++;

          if (newProduct.stock > 0) {
            const transRef = doc(transactionsRef);
            batch.set(transRef, cleanObject({
              userId: user.uid,
              productId: newProductRef.id,
              locationId: 'MAIN-WAREHOUSE',
              type: 'Purchase',
              quantity: newProduct.stock,
              transactionDate: serverTimestamp(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }));
          }
        }
      });

      await batch.commit().catch((_serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: productsRef.path,
          operation: 'create',
          requestResourceData: 'Bulk Product Add',
        }));
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('analyzeup_audit_logged'));
      window.dispatchEvent(new CustomEvent('analyzeup_tasks_updated'));
      window.dispatchEvent(new CustomEvent('analyzeup_drive_synced', { detail: { newCount, updateCount } }));
    }

    toast({
      title: 'Catalog Data Synced ✨',
      description: `${newCount} new products added, ${updateCount} existing products updated. AI metrics & insights recalculated.`,
    });
  }, [firestore, user, productsRef, transactionsRef, products, toast]);

  const bulkUpdateProducts = useCallback(async (updates: (Partial<Product> & { id: string })[]) => {
    if (!firestore || !user || !productsRef) return;

    const CHUNK_SIZE = 450;
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(firestore);

      chunk.forEach(update => {
        const productRef = doc(productsRef, update.id);
        batch.update(productRef, {
          ...update,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit().catch((_serverError) => {
        console.error("Bulk update failed:", _serverError);
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('analyzeup_audit_logged'));
      window.dispatchEvent(new CustomEvent('analyzeup_tasks_updated'));
    }
  }, [firestore, user, productsRef]);

  const bulkDeleteProducts = useCallback(async (productIds: string[]) => {
    if (!firestore || !user || productIds.length === 0) return;

    const CHUNK_SIZE = 450;
    const deletePromises: Promise<void>[] = [];

    for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
      const chunk = productIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(firestore);
      chunk.forEach(id => {
        const productRef = doc(firestore, 'users', user.uid, 'products', id);
        batch.delete(productRef);
      });
      deletePromises.push(
        batch.commit().catch(err => {
          console.error('Bulk delete failed:', err);
        })
      );
    }
    await Promise.all(deletePromises);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('analyzeup_audit_logged'));
      window.dispatchEvent(new CustomEvent('analyzeup_tasks_updated'));
    }

    toast({
      title: 'Products Deleted',
      description: `Removed ${productIds.length} products from your catalog.`,
    });
  }, [firestore, user, toast]);

  const bulkAddTransactions = useCallback(async (transactionsData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>[]) => {
    if (!firestore || !user || !transactionsRef) return;

    // Deduplicate against existing transactions in memory
    const existingOrderNos = new Set(transactions.map(t => t.orderNumber).filter(Boolean));
    const uniqueTransactions = transactionsData.filter(t => !t.orderNumber || !existingOrderNos.has(t.orderNumber));

    if (uniqueTransactions.length === 0) {
      toast({ title: 'No New Transactions', description: 'All records in this batch already exist in the database.' });
      return;
    }

    // Chunk transactions into batches of 450 (Firestore hard limit is 500 operations per batch)
    const CHUNK_SIZE = 450;
    for (let i = 0; i < uniqueTransactions.length; i += CHUNK_SIZE) {
      const chunk = uniqueTransactions.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(firestore);

      chunk.forEach(transactionData => {
        const newTransactionRef = doc(transactionsRef);
        const newTransaction = cleanObject({
          ...transactionData,
          source: (transactionData as any).source || 'CSV',
          tenantId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(newTransactionRef, newTransaction);
      });

      await batch.commit().catch((_serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: transactionsRef.path,
          operation: 'create',
          requestResourceData: 'Bulk Transaction Add',
        }));
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('analyzeup_audit_logged'));
      window.dispatchEvent(new CustomEvent('analyzeup_tasks_updated'));
      window.dispatchEvent(new CustomEvent('analyzeup_drive_synced', { detail: { count: uniqueTransactions.length } }));
    }

    toast({
      title: 'Sales Transactions Synced ✨',
      description: `Added ${uniqueTransactions.length} new transaction(s). AI revenue, velocity & profit models updated.`,
    });
  }, [firestore, user, transactionsRef, transactions, toast]);

  const updateProduct = useCallback(async (updatedProduct: Product) => {
    if (!firestore || !user) return;
    const productRef = doc(firestore, 'users', user.uid, 'products', updatedProduct.id);
    const { id, ...updateData } = updatedProduct;
    const dataToUpdate = cleanObject({ ...updateData, updatedAt: serverTimestamp() });
    updateDoc(productRef, dataToUpdate).catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: productRef.path,
        operation: 'update',
        requestResourceData: dataToUpdate,
      }));
    });
    toast({ title: 'Product Updated', description: `${updatedProduct.name} has been updated.` });
  }, [firestore, user, toast]);

  const deleteProduct = useCallback(async (productId: string) => {
    if (!firestore || !user) return;
    const productRef = doc(firestore, 'users', user.uid, 'products', productId);
    await deleteDoc(productRef).catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: productRef.path,
        operation: 'delete',
      }));
    });
    toast({ title: 'Product Deleted', description: 'The product has been removed.' });
  }, [firestore, user, toast]);

  const addOrder = useCallback(async (orderData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!firestore || !user || !ordersRef || !transactionsRef) return;

    const batch = writeBatch(firestore);
    const orderStatus = orderData.status || 'Pending';

    const newOrderRef = doc(ordersRef);
    const newOrder = cleanObject({
      ...orderData,
      status: orderStatus,
      id: newOrderRef.id,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(newOrderRef, newOrder);

    // Only if explicitly created as Fulfilled (e.g. historical import), handle stock replenishment immediately
    if (orderStatus === 'Fulfilled') {
      const productRef = doc(firestore, 'users', user.uid, 'products', orderData.productId);
      const product = products.find(p => p.id === orderData.productId);
      if (product) {
        batch.update(productRef, {
          stock: product.stock + orderData.quantity,
          updatedAt: serverTimestamp()
        });

        const transactionRef = doc(transactionsRef);
        const costPrice = product.costPrice || product.price * 0.6;
        batch.set(transactionRef, cleanObject({
          id: transactionRef.id,
          tenantId: user.uid,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          category: product.categoryId,
          locationId: 'MAIN-WAREHOUSE',
          type: 'Purchase',
          quantity: orderData.quantity,
          price: costPrice,
          totalCost: Math.round(costPrice * orderData.quantity),
          supplier: suppliers.find(s => s.id === orderData.supplierId)?.name || 'Supplier',
          transactionDate: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));
      }
    }

    await batch.commit().catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch-write',
        operation: 'create',
        requestResourceData: { order: newOrder },
      }));
    });
    const supplierName = suppliers.find(s => s.id === newOrder.supplierId)?.name || 'the supplier';
    toast({
      title: orderStatus === 'Pending' ? '📦 Purchase Order Created (In Transit)' : 'Order Created',
      description: `Purchase order for ${orderData.quantity} units from ${supplierName} recorded. Stock will update once marked received.`,
    });
  }, [firestore, user, ordersRef, suppliers, toast, products, transactionsRef]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!firestore || !user) return;
    const orderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    await deleteDoc(orderRef).catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: orderRef.path,
        operation: 'delete',
      }));
    });
    toast({ title: 'Order Deleted', description: 'The purchase order has been removed.' });
  }, [firestore, user, toast]);

  const receivePurchaseOrder = useCallback(async (orderId: string, customReceivedQty?: number) => {
    if (!firestore || !user || !ordersRef || !transactionsRef) return;
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    if (orderToUpdate.status === 'Fulfilled') {
      toast({ title: 'Already Received', description: 'This purchase order has already been received and added to inventory.' });
      return;
    }

    const receivedQty = customReceivedQty !== undefined ? customReceivedQty : orderToUpdate.quantity;
    const batch = writeBatch(firestore);
    const orderRef = doc(firestore, 'users', user.uid, 'orders', orderId);

    batch.update(orderRef, {
      status: 'Fulfilled',
      actualDeliveryDate: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });

    const product = products.find(p => p.id === orderToUpdate.productId);
    if (product) {
      const productRef = doc(firestore, 'users', user.uid, 'products', product.id);
      const newStock = (product.stock || 0) + receivedQty;
      batch.update(productRef, {
        stock: newStock,
        updatedAt: serverTimestamp(),
      });

      const costPrice = orderToUpdate.unitCost || product.costPrice || product.price * 0.6;
      const totalCost = Math.round(costPrice * receivedQty);
      const supplierName = suppliers.find(s => s.id === orderToUpdate.supplierId)?.name || 'Supplier';

      const transactionRef = doc(transactionsRef);
      batch.set(transactionRef, cleanObject({
        id: transactionRef.id,
        tenantId: user.uid,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.categoryId,
        locationId: 'MAIN-WAREHOUSE',
        type: 'Purchase',
        quantity: receivedQty,
        price: costPrice,
        totalCost: totalCost,
        supplier: supplierName,
        transactionDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));

      logBusinessAction({
        title: 'Purchase Order Received & Stock Replenished',
        productName: product.name,
        actionType: 'reorder',
        changeDetails: `Received shipment of ${receivedQty} units from "${supplierName}". Inventory updated from ${product.stock} to ${newStock} units.`,
        impactValue: `+${receivedQty} Units`,
        previousValue: `Stock: ${product.stock}`,
        newValue: `Stock: ${newStock}`,
      });
    }

    await batch.commit().catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch-write',
        operation: 'update',
      }));
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('analyzeup_audit_logged'));
      window.dispatchEvent(new CustomEvent('analyzeup_tasks_updated'));
    }

    toast({
      title: '📦 Goods Received & Inventory Updated!',
      description: `Added +${receivedQty} units to "${product?.name || 'Product'}". Stock count and AI analytics updated.`,
    });
  }, [firestore, user, ordersRef, transactionsRef, orders, products, suppliers, toast]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    if (status === 'Fulfilled') {
      await receivePurchaseOrder(orderId);
      return;
    }

    if (!firestore || !user) return;
    const orderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    await updateDoc(orderRef, { status, updatedAt: serverTimestamp() }).catch(console.error);
    toast({ title: 'Order Status Updated', description: `Order status set to ${status}.` });
  }, [firestore, user, receivePurchaseOrder, toast]);

  const addCustomAttribute = useCallback(async (attributeData: Omit<CustomAttribute, 'id'>) => {
    if (!firestore || !user || !customAttributesRef) return;
    if (customAttributes.some(attr => attr.value === attributeData.value)) return;

    const newAttr = {
      ...attributeData,
      createdAt: serverTimestamp()
    };
    await addDoc(customAttributesRef, newAttr).catch(err => {
      console.error("Failed to add custom attribute:", err);
    });
  }, [firestore, user, customAttributes, customAttributesRef]);

  const addSupplier = useCallback(async (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!firestore || !user || !suppliersRef) return;
    if (suppliers.find((s) => s.name.toLowerCase() === supplierData.name.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'A supplier with this name already exists.',
      });
      return;
    }
    const newSupplier = {
      ...supplierData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    addDoc(suppliersRef, newSupplier).catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: suppliersRef.path,
        operation: 'create',
        requestResourceData: newSupplier,
      }));
    });
    toast({ title: 'Supplier Added', description: `${supplierData.name} has been added.` });
  }, [firestore, user, suppliers, suppliersRef, toast]);

  const recordSale = useCallback(async (productId: string, quantity: number) => {
    if (!firestore || !user || !transactionsRef) return;

    const product = products.find(p => p.id === productId);
    if (!product || product.stock < quantity) {
      toast({ variant: 'destructive', title: 'Error', description: 'Insufficient stock or product not found.' });
      return;
    }

    const batch = writeBatch(firestore);
    const productRef = doc(firestore, 'users', user.uid, 'products', productId);
    const transactionRef = doc(transactionsRef);

    batch.update(productRef, {
      stock: product.stock - quantity,
      updatedAt: serverTimestamp()
    });

    batch.set(transactionRef, {
      id: transactionRef.id,
      tenantId: user.uid,
      productId,
      locationId: 'MAIN-WAREHOUSE',
      type: 'Sale',
      quantity,
      price: product.price, // Record current price for historical accuracy
      transactionDate: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit().catch(err => {
      console.error('Sale recording failed:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to record sale.' });
    });

    toast({ title: 'Sale Recorded', description: `Sold ${quantity} units of ${product.name}.` });
  }, [firestore, user, transactionsRef, products, toast]);

  const addReturn = useCallback(async (returnData: Omit<ProductReturn, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!firestore || !user || !returnsRef || !transactionsRef) return;

    const batch = writeBatch(firestore);
    const newReturnRef = doc(returnsRef);

    const newReturn = cleanObject({
      ...returnData,
      id: newReturnRef.id,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(newReturnRef, newReturn);

    // If restocked, update product stock
    if (returnData.actionTaken === 'Restocked') {
      const productRef = doc(firestore, 'users', user.uid, 'products', returnData.productId);
      const product = products.find(p => p.id === returnData.productId);
      if (product) {
        batch.update(productRef, {
          stock: product.stock + returnData.quantity,
          updatedAt: serverTimestamp()
        });
      }
    }

    // If refunded or store credit, record a Sale adjustment transaction (negative sales!)
    if (returnData.refundStatus === 'Refunded' || returnData.refundStatus === 'Store Credit') {
      const product = products.find(p => p.id === returnData.productId);
      const transRef = doc(transactionsRef);
      batch.set(transRef, cleanObject({
        id: transRef.id,
        tenantId: user.uid,
        productId: returnData.productId,
        productName: returnData.productName,
        sku: product?.sku || 'N/A',
        category: product?.categoryId || 'N/A',
        locationId: 'MAIN-WAREHOUSE',
        type: 'Sale',
        quantity: -returnData.quantity, // Negative quantity
        price: product?.price || 0,
        totalRevenue: -returnData.refundAmount, // Negative revenue
        transactionDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
    }

    await batch.commit().catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: returnsRef.path,
        operation: 'create',
        requestResourceData: newReturn,
      }));
    });

    toast({ title: 'Return Logged', description: `Return for ${returnData.customerName} has been recorded.` });
  }, [firestore, user, returnsRef, transactionsRef, products, toast]);

  const updateReturnStatus = useCallback(async (returnId: string, refundStatus: string) => {
    if (!firestore || !user || !returnsRef || !transactionsRef) return;
    
    const returnRef = doc(firestore, 'users', user.uid, 'returns', returnId);
    const returnToUpdate = returns.find(r => r.id === returnId);
    if (!returnToUpdate) return;

    const batch = writeBatch(firestore);
    batch.update(returnRef, { refundStatus, updatedAt: serverTimestamp() });

    // If changing from non-refunded to refunded/store credit, write the negative transaction
    const wasRefundedBefore = returnToUpdate.refundStatus === 'Refunded' || returnToUpdate.refundStatus === 'Store Credit';
    const isRefundedNow = refundStatus === 'Refunded' || refundStatus === 'Store Credit';

    if (!wasRefundedBefore && isRefundedNow) {
      const product = products.find(p => p.id === returnToUpdate.productId);
      const transRef = doc(transactionsRef);
      batch.set(transRef, cleanObject({
        id: transRef.id,
        tenantId: user.uid,
        productId: returnToUpdate.productId,
        productName: returnToUpdate.productName,
        sku: product?.sku || 'N/A',
        category: product?.categoryId || 'N/A',
        locationId: 'MAIN-WAREHOUSE',
        type: 'Sale',
        quantity: -returnToUpdate.quantity,
        price: product?.price || 0,
        totalRevenue: -returnToUpdate.refundAmount,
        transactionDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
    }

    await batch.commit().catch((_serverError) => {
      console.error("Failed to update return status:", _serverError);
    });

    toast({ title: 'Return Status Updated', description: `Return status updated to ${refundStatus}.` });
  }, [firestore, user, returns, products, transactionsRef, returnsRef, toast]);

  const deleteReturn = useCallback(async (returnId: string) => {
    if (!firestore || !user) return;
    const returnRef = doc(firestore, 'users', user.uid, 'returns', returnId);
    await deleteDoc(returnRef).catch((_serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: returnRef.path,
            operation: 'delete',
        }));
    });
    toast({ title: 'Return Deleted', description: 'The return record has been removed.' });
  }, [firestore, user, toast]);

  const deleteSupplier = useCallback(async (supplierId: string) => {
    if (!firestore || !user) return;
    const supplierRef = doc(firestore, 'users', user.uid, 'suppliers', supplierId);
    await deleteDoc(supplierRef).catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: supplierRef.path,
        operation: 'delete',
      }));
    });
    toast({ title: 'Supplier Deleted', description: 'The supplier has been removed.' });
  }, [firestore, user, toast]);

  const clearAllData = useCallback(async () => {
    if (!firestore || !user) {
      throw new Error('Your workspace is not ready to reset. Please wait for Firebase to reconnect and try again.');
    }

    // 1. Wipe all local storage caches, history, demographics, insights, completed actions & snapshots instantly
    if (typeof window !== 'undefined') {
      try {
        const keysToKeep = new Set([
          'analyzeup_subscription_plan',
          'analyzeup_just_registered',
          'analyzeup_just_logged_in',
          'analyzeup_feature_tour_seen_global',
          user ? `analyzeup_profile_${user.uid}` : '',
          user ? `analyzeup_feature_tour_seen_${user.uid}` : '',
          user ? `analyzeup_feature_tour_completed_${user.uid}` : '',
        ]);

        const allKeys = Object.keys(localStorage);
        allKeys.forEach((key) => {
          if (keysToKeep.has(key) || key.includes('feature_tour')) return;
          if (
            key.startsWith('analyzeup_') ||
            key.includes('audit') ||
            key.includes('simulation') ||
            key.includes('snapshot') ||
            key.includes('event') ||
            key.includes('task') ||
            key.includes('recommend') ||
            key.includes('opportunity')
          ) {
            localStorage.removeItem(key);
          }
        });

        // Dispatch window events to notify all active UI components immediately
        window.dispatchEvent(new CustomEvent('analyzeup_audit_logged'));
        window.dispatchEvent(new CustomEvent('analyzeup_simulations_updated'));
        window.dispatchEvent(new CustomEvent('analyzeup_snapshots_updated'));
        window.dispatchEvent(new CustomEvent('analyzeup_events_updated'));
        window.dispatchEvent(new CustomEvent('analyzeup_tasks_updated'));
      } catch (e) {
        console.error('Error clearing localStorage caches:', e);
      }
    }

    // 2. Delete the persisted workspace before changing the UI. Previously this
    //    routine swallowed write errors and retained Drive metadata/connection,
    //    which allowed a refresh (or auto-sync) to bring data back.
    {
      const uid = user.uid;

      try {
        console.log(`[ClearAllData] Starting full workspace purge for user: ${uid}`);
        const colNames = [
          'products',
          'orders',
          'suppliers',
          'transactions',
          'categories',
          'returns',
          'custom_attributes',
          'importJobs',
          'import_jobs',
          'google_drive_files',
          'sync_history',
          'mapping_profiles',
          'drive_sync_history',
          'drive_files',
          'drive_mappings',
          'audit_logs',
          'forecasts',
          'insights',
          'simulations',
          'events',
          'tasks',
        ];

        let totalDeleted = 0;
        for (const colName of colNames) {
          const colRef = collection(firestore, 'users', uid, colName);
          const snap = await getDocs(colRef);
          if (!snap.empty) {
            const CHUNK_SIZE = 400;
            for (let i = 0; i < snap.docs.length; i += CHUNK_SIZE) {
              const chunk = snap.docs.slice(i, i + CHUNK_SIZE);
              const batch = writeBatch(firestore);
              chunk.forEach(d => batch.delete(d.ref));
              await batch.commit();
              totalDeleted += chunk.length;
            }
            console.log(`[ClearAllData] Successfully purged ${snap.docs.length} docs from ${colName}`);
          }
        }

        // A reset is a disconnect: remove Drive as well as every other supported integration.
        const integrations = ['google-drive', 'google_drive', 'shopify', 'zoho', 'tally', 'woocommerce'];
        const integrationsBatch = writeBatch(firestore);
        integrations.forEach((name) => integrationsBatch.delete(doc(firestore, 'users', uid, 'integrations', name)));
        await integrationsBatch.commit();

        // Remove generated AI output; retain only an empty analytics summary.
        await deleteDoc(doc(firestore, 'users', uid, 'analytics', 'ai_brief'));

        // Reset analytics summary to zeroed defaults
        await setDoc(doc(firestore, 'users', uid, 'analytics', 'summary'), DEFAULT_ANALYTICS_SUMMARY);
        console.log(`[ClearAllData] Workspace purge complete. Deleted ${totalDeleted} documents.`);
      } catch (err) {
        console.error('Error wiping Firestore workspace collections:', err);
        throw new Error('Workspace reset could not finish. No success message was shown; please try again.');
      }

      // Keep business preferences, but remove all setup/import and integration state.
      const profileReset = {
        inventorySetupMethod: 'manual',
        csvImportedAt: deleteField(),
        shopifyConnected: false,
        shopifyStoreUrl: '',
        shopifyStoreName: '',
        shopifyStatus: 'Disconnected',
        isOnboardingCompleted: false,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(firestore, 'users', uid, 'settings', 'business_profile'), profileReset, { merge: true });

      if (businessProfile) {
        const cleanedProfile: BusinessProfile = {
          ...businessProfile,
          inventorySetupMethod: profileReset.inventorySetupMethod,
          csvImportedAt: undefined,
          shopifyConnected: profileReset.shopifyConnected,
          shopifyStoreUrl: profileReset.shopifyStoreUrl,
          shopifyStoreName: profileReset.shopifyStoreName,
          shopifyStatus: profileReset.shopifyStatus,
          isOnboardingCompleted: profileReset.isOnboardingCompleted,
          updatedAt: profileReset.updatedAt,
        };
        setBusinessProfile(cleanedProfile);
        localStorage.setItem(`analyzeup_profile_${uid}`, JSON.stringify(cleanedProfile));
      }
    }

    setHasDemoData(false);
    setDriveConnection(null);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('analyzeup_drive_synced', { detail: { count: 0, reset: true } }));
    }

    toast({
      title: 'Workspace Reset Complete',
      description: 'All products, sales, Google Drive, Shopify links, and logs have been deleted.',
    });
  }, [firestore, user, businessProfile, toast]);

  const clearDemoBusiness = useCallback(async () => {
    await clearAllData();
    setHasDemoData(false);
    toast({ title: 'Demo Business Cleared', description: 'Demo data has been removed from your workspace.' });
  }, [clearAllData, toast]);

  const [driveConnection, setDriveConnection] = useState<any>(null);

  // Subscribe to Google Drive connection doc in Firestore
  useEffect(() => {
    if (!user || !firestore) {
      setDriveConnection(null);
      return;
    }
    const docRef = doc(firestore, 'users', user.uid, 'integrations', 'google-drive');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists() && snap.data().connectionStatus === 'Connected') {
        setDriveConnection(snap.data());
      } else {
        setDriveConnection(null);
      }
    }, (error) => {
      console.error('Error subscribing to Google Drive connection:', error);
    });

    return unsubscribe;
  }, [user, firestore]);

  const subscribeGoogleDriveConnection = useCallback((onUpdate: (data: any) => void) => {
    if (!user || !firestore) {
      onUpdate(null);
      return () => {};
    }
    const docRef = doc(firestore, 'users', user.uid, 'integrations', 'google-drive');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists() && snap.data().connectionStatus === 'Connected') {
        onUpdate(snap.data());
      } else {
        onUpdate(null);
      }
    }, (error) => {
      console.error('Error subscribing to Google Drive connection:', error);
      const contextualError = new FirestorePermissionError({
        operation: 'get',
        path: `users/${user.uid}/integrations/google-drive`,
      });
      errorEmitter.emit('permission-error', contextualError);
      onUpdate(null);
    });

    return unsubscribe;
  }, [user, firestore]);

  const getGoogleDriveFiles = useCallback(async (): Promise<any[]> => {
    if (!user || !firestore) return [];
    try {
      const filesSnap = await getDocs(collection(firestore, 'users', user.uid, 'google_drive_files'));
      return filesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error loading Google Drive files:', e);
      return [];
    }
  }, [user, firestore]);

  const getSyncHistory = useCallback(async (): Promise<any[]> => {
    if (!user || !firestore) return [];
    try {
      const snap = await getDocs(collection(firestore, 'users', user.uid, 'sync_history'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime());
    } catch (e) {
      console.error('Error loading sync history:', e);
      return [];
    }
  }, [user, firestore]);

  const getMappingProfiles = useCallback(async (): Promise<any[]> => {
    if (!user || !firestore) return [];
    try {
      const snap = await getDocs(collection(firestore, 'users', user.uid, 'mapping_profiles'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error loading mapping profiles:', e);
      return [];
    }
  }, [user, firestore]);

  const disconnectGoogleDrive = useCallback(async () => {
    if (!user || !firestore) return;
    try {
      const docRef = doc(firestore, 'users', user.uid, 'integrations', 'google-drive');
      await deleteDoc(docRef);
      setDriveConnection(null);
      toast({
        title: 'Google Drive Disconnected',
        description: 'Successfully revoked credentials from AnalyzeUp workspace.',
      });
    } catch (e) {
      console.error('Disconnection error:', e);
      const contextualError = new FirestorePermissionError({
        operation: 'delete',
        path: `users/${user.uid}/integrations/google-drive`,
      });
      errorEmitter.emit('permission-error', contextualError);
      toast({
        variant: 'destructive',
        title: 'Disconnection Failed',
        description: 'Failed to delete connection document.',
      });
    }
  }, [user, firestore, toast]);

  const recordSyncSuccess = useCallback(async (fileId: string, fileData: Record<string, any>, historyData: Record<string, any>) => {
    if (!user || !firestore) return;
    try {
      const fileRef = doc(firestore, 'users', user.uid, 'google_drive_files', fileId);
      await setDoc(fileRef, cleanObject(fileData), { merge: true });
      await addDoc(collection(firestore, 'users', user.uid, 'sync_history'), cleanObject(historyData));
      const connRef = doc(firestore, 'users', user.uid, 'integrations', 'google-drive');
      await updateDoc(connRef, {
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'Success',
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Error recording sync success:', e);
      const contextualError = new FirestorePermissionError({
        operation: 'write',
        path: `users/${user.uid}/google_drive_files`,
      });
      errorEmitter.emit('permission-error', contextualError);
    }
  }, [user, firestore]);

  const updateGoogleDriveSettings = useCallback(async (settings: Record<string, any>) => {
    if (!user || !firestore) return;
    try {
      const connRef = doc(firestore, 'users', user.uid, 'integrations', 'google-drive');
      await setDoc(connRef, {
        ...cleanObject(settings),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast({
        title: 'Auto-Sync Schedule Updated ✨',
        description: settings.autoSyncEnabled === false ? 'Auto-sync is now paused.' : 'Google Drive will auto-sync on your schedule.',
      });
    } catch (e) {
      console.error('Error updating Google Drive settings:', e);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not save auto-sync schedule.',
      });
    }
  }, [user, firestore, toast]);

  const saveMappingProfile = useCallback(async (fileId: string, profileData: Record<string, any>) => {
    if (!user || !firestore) return;
    try {
      const profileRef = doc(firestore, 'users', user.uid, 'mapping_profiles', `profile-${fileId}`);
      await setDoc(profileRef, cleanObject(profileData), { merge: true });
    } catch (e) {
      console.error('Error saving mapping profile:', e);
    }
  }, [user, firestore]);

  // In-flight guard to prevent duplicate concurrent background sync cycles
  const isSyncingRef = useRef(false);

  // Unified background auto-sync runner for entire workspace
  const autoSyncGoogleDriveNow = useCallback(async (showToast: boolean = true) => {
    if (!user || !firestore || !driveConnection || !driveConnection.selectedFolderId || driveConnection.connectionStatus !== 'Connected' || driveConnection.isConnected === false) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const token = await getClientDriveToken(driveConnection, user, firestore);
      if (!token) {
        isSyncingRef.current = false;
        return;
      }

      const folderId = driveConnection.selectedFolderId;
      const folderName = driveConnection.selectedFolderName || '';

      const folderQuery = `?folderId=${encodeURIComponent(folderId)}&folderName=${encodeURIComponent(folderName)}`;

      const res = await fetch(`/api/drive/scan${folderQuery}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-uid': user.uid,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        isSyncingRef.current = false;
        return;
      }

      const files = data.files || [];
      // Match any file that is pending (exclude 'Synced', 'Deleted', and 'Tombstoned')
      const pendingFiles = files.filter((f: any) => f.status !== 'Synced' && f.status !== 'Deleted' && f.status !== 'Tombstoned');

      let ingestedCount = 0;
      const profiles = await getMappingProfiles();

      for (const file of pendingFiles) {
        try {
          const syncRes = await fetch('/api/drive/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'x-user-uid': user.uid,
            },
            body: JSON.stringify({ fileId: file.id, fileName: file.name }),
          });

          const syncData = await syncRes.json();
          if (!syncRes.ok || !syncData.success || !syncData.csvContent) continue;

          const parsed = Papa.parse(syncData.csvContent, { header: true, skipEmptyLines: true });
          const rawRows = parsed.data as Record<string, any>[];
          if (rawRows.length === 0) continue;

          const headers = Object.keys(rawRows[0] || {});
          const currentSignature = headers.slice().sort().join('|').toLowerCase();

          let matchedProfile = profiles.find((p: any) => p.headersSignature === currentSignature);
          if (!matchedProfile) {
            matchedProfile = findMatchingImportProfile(headers) as any;
          }
          if (!matchedProfile) {
            matchedProfile = autoDetectMapping(headers) as any;
          }

          let fieldMapping = matchedProfile?.mapping || matchedProfile?.fieldMapping;
          if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
            const detected = autoDetectMapping(headers);
            if (detected) {
              matchedProfile = detected;
              fieldMapping = detected.mapping;
            }
          }

          if (matchedProfile && fieldMapping && Object.keys(fieldMapping).length > 0) {
            const safeFieldMapping = fieldMapping || {};
            const isSalesReport = matchedProfile.fileType === 'SALES_REPORT';

            const normalizedItems = rawRows.map((rawRow: any, idx: number) => {
              const obj: any = {};
              Object.entries(safeFieldMapping).forEach(([sourceCol, targetKey]) => {
                if (targetKey && targetKey !== 'skip') {
                  obj[targetKey as string] = rawRow[sourceCol];
                }
              });

              const name = (
                obj.name ||
                obj.productName ||
                obj.product_name ||
                rawRow['Product Name'] ||
                rawRow['Item Name'] ||
                rawRow['Product'] ||
                `Product ${idx + 1}`
              ).trim();

              const rawPrice =
                obj.price ||
                obj.sellingPrice ||
                rawRow['Selling Price'] ||
                rawRow['Price'] ||
                '0';
              const price = parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;

              const rawCostPrice =
                obj.costPrice ||
                obj.cost ||
                rawRow['Cost Price'] ||
                rawRow['Cost'] ||
                (price * 0.6).toFixed(2);
              const costPrice = parseFloat(String(rawCostPrice).replace(/[^0-9.]/g, '')) || Math.round(price * 0.6);

              const rawStock =
                obj.stock ||
                obj.inventory_quantity ||
                rawRow['Stock'] ||
                rawRow['Current Stock'] ||
                '25';
              const stock = parseInt(String(rawStock).replace(/[^0-9]/g, ''), 10) || 25;

              const sku = (
                obj.sku ||
                rawRow['SKU'] ||
                rawRow['Item Code'] ||
                rawRow['Barcode'] ||
                `SKU-${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}-${idx + 1}`
              ).toUpperCase();

              const category = obj.category || rawRow['Category'] || rawRow['Department'] || 'General';
              const supplier = obj.supplier || obj.supplierName || rawRow['Supplier'] || rawRow['Vendor'] || 'Google Drive Vendor';

              const orderNo = obj.orderNumber || obj.orderId || rawRow['Order ID'] || rawRow['Invoice No'] || `INV-${1000 + idx}`;
              const customer = obj.customerName || obj.customer || rawRow['Customer Name'] || rawRow['Customer'] || 'Retail Customer';
              const city = obj.city || rawRow['City'] || rawRow['Location'] || '';
              const date = obj.orderDate || rawRow['Date'] || rawRow['Order Date'] || new Date().toISOString().split('T')[0];

              return {
                ...obj,
                parsed: {
                  name,
                  price,
                  costPrice,
                  stock,
                  qty: Math.max(1, Math.min(stock, 4)),
                  sku,
                  category,
                  supplier,
                  orderNo,
                  customer,
                  city,
                  date,
                  unit: obj.unit || rawRow['Unit'] || 'Piece',
                  description: obj.description || rawRow['Description'] || `Imported ${name}`,
                }
              };
            });

            const validRows = normalizedItems.filter(r => r.parsed && r.parsed.name);
            if (validRows.length > 0) {
              // 1. Auto-create Categories
              const fileCats = Array.from(new Set(validRows.map(r => r.parsed.category).filter(Boolean)));
              const existingCatMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
              const missingCats = fileCats.filter(c => !existingCatMap.has(c.toLowerCase()));
              if (missingCats.length > 0) {
                await Promise.all(missingCats.map(c => addCategory({ name: c, description: 'Created from Google Drive Sync' })));
              }

              // 2. Auto-create Suppliers
              const fileSups = Array.from(new Set(validRows.map(r => r.parsed.supplier).filter(Boolean)));
              const existingSupMap = new Map(suppliers.map(s => [s.name.toLowerCase(), s.id]));
              const missingSups = fileSups.filter(s => !existingSupMap.has(s.toLowerCase()));
              if (missingSups.length > 0) {
                await Promise.all(
                  missingSups.map(s =>
                    addSupplier({
                      name: s,
                      contactName: 'Drive Contact',
                      email: `contact@${s.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
                      phone: '+91 90000 00000',
                      address: 'Google Drive Synchronized Vendor',
                    })
                  )
                );
              }

              // 3. ALWAYS populate products into Catalog Intelligence & Inventory
              const productsToImport = validRows.map(r => ({
                name: r.parsed.name,
                sku: r.parsed.sku,
                description: r.parsed.description,
                categoryId: existingCatMap.get(r.parsed.category.toLowerCase()) || 'cat-general',
                category: r.parsed.category,
                supplier: r.parsed.supplier,
                supplierId: existingSupMap.get(r.parsed.supplier.toLowerCase()) || '',
                price: r.parsed.price,
                costPrice: r.parsed.costPrice,
                stock: r.parsed.stock,
                minStock: 5,
                maxStock: Math.max(100, r.parsed.stock * 2),
                unit: r.parsed.unit,
                status: 'Active' as const,
                averageDailySales: 1.5,
                leadTimeDays: 7,
              }));

              await bulkAddProducts(productsToImport, true);

              // 4. ALWAYS populate sales transactions to drive charts & revenue analytics
              const transactionsToImport = validRows.map((r, idx) => {
                const d = new Date();
                d.setDate(d.getDate() - (idx % 28));

                return {
                  type: 'Sale' as const,
                  productId: `prod-${r.parsed.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                  productName: r.parsed.name,
                  quantity: r.parsed.qty || 1,
                  price: r.parsed.price,
                  sellingPrice: r.parsed.price,
                  costPrice: r.parsed.costPrice,
                  totalRevenue: (r.parsed.price || 0) * (r.parsed.qty || 1),
                  totalCost: (r.parsed.costPrice || 0) * (r.parsed.qty || 1),
                  orderNumber: r.parsed.orderNo,
                  customerName: r.parsed.customer,
                  supplier: r.parsed.supplier,
                  transactionDate: r.parsed.date || d.toISOString().split('T')[0],
                  paymentMethod: 'UPI',
                  status: 'Completed' as const,
                };
              });

              await bulkAddTransactions(transactionsToImport);

              const nowIso = new Date().toISOString();
              await recordSyncSuccess(
                file.id,
                {
                  id: file.id,
                  name: file.name,
                  status: 'Synced',
                  rowCount: validRows.length,
                  lastSyncedAt: nowIso,
                  fileType: matchedProfile.fileType,
                },
                {
                  fileId: file.id,
                  fileName: file.name,
                  recordsCount: validRows.length,
                  syncedAt: nowIso,
                  status: 'Success',
                }
              );

              await saveMappingProfile(file.id, {
                id: `profile-${file.id}`,
                profileName: `Auto Map for ${file.name}`,
                fileType: matchedProfile.fileType,
                mapping: safeFieldMapping,
                headersSignature: currentSignature,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });

              ingestedCount++;
            }
          }
        } catch (fileErr) {
          console.error(`Auto-sync error on file ${file.name}:`, fileErr);
        }
      }

      // Update lastSyncAt on the integration doc in Firestore
      const nowIso = new Date().toISOString();
      const connRef = doc(firestore, 'users', user.uid, 'integrations', 'google-drive');
      await updateDoc(connRef, {
        lastSyncAt: nowIso,
        lastSyncStatus: 'Success',
        updatedAt: nowIso,
      });

      setDriveConnection((prev: any) => prev ? { ...prev, lastSyncAt: nowIso, lastSyncStatus: 'Success' } : prev);

      // Emit global custom event for open views to refresh immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('analyzeup_drive_sync_complete', { detail: { nowIso, ingestedCount } }));
      }

      if (showToast || ingestedCount > 0) {
        toast({
          title: 'Google Drive Synchronized 🚀',
          description: ingestedCount > 0
            ? `Automatically ingested ${ingestedCount} spreadsheet(s) from Drive.`
            : `Folder checked. All spreadsheets are up to date (${formatLastSyncTime(nowIso)}).`,
        });
      }
    } catch (err) {
      console.error('Error during autoSyncGoogleDriveNow:', err);
    } finally {
      isSyncingRef.current = false;
    }
  }, [user, firestore, driveConnection, getMappingProfiles, bulkAddProducts, bulkAddTransactions, recordSyncSuccess, saveMappingProfile, toast]);

  // Global background auto-sync runner (runs on scheduled interval ONLY if autoSync is explicitly enabled)
  useEffect(() => {
    if (
      !user ||
      !firestore ||
      !driveConnection ||
      !driveConnection.selectedFolderId ||
      driveConnection.connectionStatus !== 'Connected' ||
      driveConnection.isConnected === false ||
      driveConnection.autoSyncEnabled !== true
    ) {
      return;
    }

    const checkAutoSync = () => {
      if (isAutoSyncDue(driveConnection) && !isSyncingRef.current) {
        console.log('[Global AutoSync] Schedule is due. Triggering automatic background ingestion for:', driveConnection.selectedFolderName);
        autoSyncGoogleDriveNow(false);
      }
    };

    const intervalId = setInterval(checkAutoSync, 120 * 1000);
    return () => clearInterval(intervalId);
  }, [user, firestore, driveConnection, autoSyncGoogleDriveNow]);


  const value = useMemo(() => ({
    products,
    orders,
    suppliers,
    transactions,
    categories,
    returns,
    customAttributes,
    businessProfile,
    updateBusinessProfile,
    loadDemoBusiness,
    clearDemoBusiness,
    hasDemoData,
    showOnboardingWizard,
    setShowOnboardingWizard,
    showWelcomeModal,
    setShowWelcomeModal,
    showShopifyModal,
    setShowShopifyModal,
    addCustomAttribute,
    addProduct,
    updateProduct,
    deleteProduct,
    addOrder,
    deleteOrder,
    updateOrderStatus,
    receivePurchaseOrder,
    addSupplier,
    deleteSupplier,
    addCategory,
    addTransaction,
    recordSale,
    addReturn,
    deleteReturn,
    updateReturnStatus,
    bulkAddProducts,
    bulkUpdateProducts,
    bulkDeleteProducts,
    bulkAddTransactions,
    clearAllData,
    driveConnection,
    autoSyncGoogleDriveNow,
    subscribeGoogleDriveConnection,
    getGoogleDriveFiles,
    getSyncHistory,
    getMappingProfiles,
    disconnectGoogleDrive,
    updateGoogleDriveSettings,
    recordSyncSuccess,
    saveMappingProfile,
    isLoading,
    activePlan,
    isProcessingPayment,
    showSubscriptionModal,
    setShowSubscriptionModal,
    isTourOpen,
    setIsTourOpen,
    isLimitExceeded,
    activePlanLimit,
    aiQueryCount,
    incrementAiQueryCount,
    handleUpgrade,
    analyticsSummary,
    refreshAnalytics,
  }), [
    products,
    orders,
    suppliers,
    transactions,
    categories,
    returns,
    customAttributes,
    businessProfile,
    updateBusinessProfile,
    loadDemoBusiness,
    clearDemoBusiness,
    hasDemoData,
    showOnboardingWizard,
    setShowOnboardingWizard,
    showWelcomeModal,
    setShowWelcomeModal,
    showShopifyModal,
    setShowShopifyModal,
    addCustomAttribute,
    isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    addOrder,
    deleteOrder,
    updateOrderStatus,
    receivePurchaseOrder,
    addSupplier,
    deleteSupplier,
    addCategory,
    addTransaction,
    recordSale,
    addReturn,
    deleteReturn,
    updateReturnStatus,
    bulkAddProducts,
    bulkUpdateProducts,
    bulkDeleteProducts,
    bulkAddTransactions,
    clearAllData,
    driveConnection,
    autoSyncGoogleDriveNow,
    subscribeGoogleDriveConnection,
    getGoogleDriveFiles,
    getSyncHistory,
    getMappingProfiles,
    disconnectGoogleDrive,
    updateGoogleDriveSettings,
    recordSyncSuccess,
    saveMappingProfile,
    activePlan,
    isProcessingPayment,
    showSubscriptionModal,
    setShowSubscriptionModal,
    isTourOpen,
    setIsTourOpen,
    isLimitExceeded,
    activePlanLimit,
    aiQueryCount,
    incrementAiQueryCount,
    handleUpgrade,
    analyticsSummary,
    refreshAnalytics,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
