'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import type { Product, PurchaseOrder, Supplier, Transaction, Category, ProductReturn, CustomAttribute, BusinessProfile, BusinessType, BusinessSize } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { generateDemoBusinessData } from '@/lib/demo-data';

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
  bulkAddTransactions: (transactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>[]) => Promise<void>;
  clearAllData: () => Promise<void>;
  isLoading: boolean;
  activePlan: string;
  isProcessingPayment: string | null;
  showSubscriptionModal: boolean;
  setShowSubscriptionModal: (show: boolean) => void;
  isTourOpen: boolean;
  setIsTourOpen: (show: boolean) => void;
  isLimitExceeded: boolean;
  activePlanLimit: number;
  handleUpgrade: (planId: string, amount: number, planName: string) => Promise<void>;
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

  const { data: productsData, loading: productsLoading } = useCollection<Product>(productsRef);
  const { data: ordersData, loading: ordersLoading } = useCollection<PurchaseOrder>(ordersRef);
  const { data: suppliersData, loading: suppliersLoading } = useCollection<Supplier>(suppliersRef);
  const { data: transactionsData, loading: transactionsLoading } = useCollection<Transaction>(transactionsRef);
  const { data: categoriesData, loading: categoriesLoading } = useCollection<Category>(categoriesRef);
  const { data: returnsData, loading: returnsLoading } = useCollection<ProductReturn>(returnsRef);
  const { data: customAttributesData } = useCollection<CustomAttribute>(customAttributesRef);

  const products = useMemo(() => uniqueBy(productsData, 'id'), [productsData]);
  const orders = useMemo(() => uniqueBy(ordersData, 'id'), [ordersData]);
  const suppliers = useMemo(() => uniqueBy(suppliersData, 'name'), [suppliersData]);
  const transactions = useMemo(() => uniqueBy(transactionsData, 'id'), [transactionsData]);
  const categories = useMemo(() => uniqueBy(categoriesData, 'name'), [categoriesData]);
  const returns = useMemo(() => uniqueBy(returnsData, 'id'), [returnsData]);
  const customAttributes = useMemo(() => uniqueBy(customAttributesData, 'value'), [customAttributesData]);

  const [activePlan, setActivePlan] = useState<string>("Pro Plan");
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
    // For testing purpose: unlock all features globally by forcing Pro Plan
    localStorage.setItem("analyzeup_subscription_plan", "Pro Plan");
    setActivePlan("Pro Plan");
  }, []);

  const activePlanLimit = useMemo(() => {
    if (activePlan === "Starter Plan") return 500;
    if (activePlan === "Pro Plan") return Infinity;
    return 50; // Free Trial
  }, [activePlan]);

  const isLimitExceeded = useMemo(() => {
    // For testing: never exceed limits
    return false;
  }, []);

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

  const isLoading = productsLoading || ordersLoading || suppliersLoading || transactionsLoading || categoriesLoading || returnsLoading;

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
  }, [firestore, user, productsRef, transactionsRef, toast]);

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
    if (products.length + productsData.length > activePlanLimit) {
      setShowSubscriptionModal(true);
      toast({
        variant: 'destructive',
        title: 'Limit Exceeded',
        description: `Importing these products would exceed your plan limit of ${activePlanLimit} products. Please upgrade.`,
      });
      return;
    }
    if (!firestore || !user || !productsRef || !transactionsRef) return;

    const existingProductSkuMap = new Map(products.map(p => [(p.sku || '').toUpperCase(), p]));
    const batch = writeBatch(firestore);
    let newCount = 0;
    let updateCount = 0;

    productsData.forEach(productData => {
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

    toast({
      title: 'Bulk Ingestion Complete',
      description: `${newCount} new products added, ${updateCount} existing products updated. Duplicate records prevented.`,
    });
  }, [firestore, user, productsRef, transactionsRef, products, activePlanLimit, toast]);

  const bulkUpdateProducts = useCallback(async (updates: (Partial<Product> & { id: string })[]) => {
    if (!firestore || !user || !productsRef) return;

    const batch = writeBatch(firestore);

    updates.forEach(update => {
      const productRef = doc(productsRef, update.id);
      batch.update(productRef, {
        ...update,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit().catch((_serverError) => {
      console.error("Bulk update failed:", _serverError);
    });
  }, [firestore, user, productsRef]);

  const bulkAddTransactions = useCallback(async (transactionsData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>[]) => {
    if (!firestore || !user || !transactionsRef) return;

    // Deduplicate against existing transactions in memory
    const existingOrderNos = new Set(transactions.map(t => t.orderNumber).filter(Boolean));
    const uniqueTransactions = transactionsData.filter(t => !t.orderNumber || !existingOrderNos.has(t.orderNumber));

    if (uniqueTransactions.length === 0) {
      toast({ title: 'No New Transactions', description: 'All records in this batch already exist in the database.' });
      return;
    }

    const batch = writeBatch(firestore);

    uniqueTransactions.forEach(transactionData => {
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

    toast({
      title: 'Transactions Imported',
      description: `Added ${uniqueTransactions.length} new transaction(s). ${transactionsData.length - uniqueTransactions.length} duplicate(s) safely ignored.`,
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
    deleteDoc(productRef).catch((_serverError) => {
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

    const newOrderRef = doc(ordersRef);
    const newOrder = cleanObject({
      ...orderData,
      id: newOrderRef.id,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(newOrderRef, newOrder);

    // If order is created as Fulfilled, handle stock replenishment immediately
    if (orderData.status === 'Fulfilled') {
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
    const supplierName = suppliers.find(s => s.id === newOrder.supplierId)?.name || 'the customer';
    toast({ title: 'Order Created', description: `New order for ${supplierName} has been recorded.` });
  }, [firestore, user, ordersRef, suppliers, toast]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!firestore || !user) return;
    const orderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    deleteDoc(orderRef).catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: orderRef.path,
        operation: 'delete',
      }));
    });
    toast({ title: 'Order Deleted', description: 'The purchase order has been removed.' });
  }, [firestore, user, toast]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    if (!firestore || !user || !transactionsRef) return;
    const orderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    const batch = writeBatch(firestore);

    batch.update(orderRef, { status, updatedAt: serverTimestamp() });

    if (status === 'Fulfilled') {
      const productRef = doc(firestore, 'users', user.uid, 'products', orderToUpdate.productId);
      const product = products.find(p => p.id === orderToUpdate.productId);
      if (product) {
        // Increment stock for a purchase replenishment
        batch.update(productRef, {
          stock: product.stock + orderToUpdate.quantity,
          updatedAt: serverTimestamp()
        });

        // Record a Purchase Transaction
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
          quantity: orderToUpdate.quantity,
          price: costPrice,
          totalCost: Math.round(costPrice * orderToUpdate.quantity),
          supplier: suppliers.find(s => s.id === orderToUpdate.supplierId)?.name || 'Supplier',
          transactionDate: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));
        toast({ title: 'Order Fulfilled', description: `Order ${orderId.substring(0, 8)}... has been marked as fulfilled.` });
      }
    } else {
      toast({ title: 'Order Status Updated', description: `Order ${orderId.substring(0, 8)}... has been marked as ${status}.` });
    }

    batch.commit().catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch-write',
        operation: 'update',
      }));
    });
  }, [firestore, user, orders, products, transactionsRef, toast]);

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
  }, [firestore, user, returns, products, transactionsRef, toast]);

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
    deleteDoc(supplierRef).catch((_serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: supplierRef.path,
        operation: 'delete',
      }));
    });
    toast({ title: 'Supplier Deleted', description: 'The supplier has been removed.' });
  }, [firestore, user, toast]);

  const clearAllData = useCallback(async () => {
    if (!firestore || !user || !productsData || !ordersData || !suppliersData || !transactionsData || !categoriesData || !returnsData) return;

    const uid = user.uid;
    const batch = writeBatch(firestore);

    // Delete all products
    productsData.forEach(p => batch.delete(doc(firestore, 'users', uid, 'products', p.id)));
    // Delete all orders
    ordersData.forEach(o => batch.delete(doc(firestore, 'users', uid, 'orders', o.id)));
    // Delete all suppliers
    suppliersData.forEach(s => batch.delete(doc(firestore, 'users', uid, 'suppliers', s.id)));
    // Delete all transactions
    transactionsData.forEach(t => batch.delete(doc(firestore, 'users', uid, 'transactions', t.id)));
    // Delete all categories
    categoriesData.forEach(c => batch.delete(doc(firestore, 'users', uid, 'categories', c.id)));
    // Delete all returns
    returnsData.forEach(r => batch.delete(doc(firestore, 'users', uid, 'returns', r.id)));

    await batch.commit().catch(err => {
      console.error('Batch delete failed:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to clear some data.' });
    });

    toast({ title: 'Workspace Reset', description: 'All records have been permanently removed.' });
  }, [firestore, user, productsData, ordersData, suppliersData, transactionsData, categoriesData, returnsData, toast]);

  const clearDemoBusiness = useCallback(async () => {
    await clearAllData();
    setHasDemoData(false);
    toast({ title: 'Demo Business Cleared', description: 'Demo data has been removed from your workspace.' });
  }, [clearAllData, toast]);

  // Seed removed - User requested empty application
  useEffect(() => {
    if (!user) return;
    const wipeKey = `analyzeup_initial_wipe_${user.uid}`;
    const hasWiped = localStorage.getItem(wipeKey);
    if (!hasWiped && !productsLoading && !isLoading) {
      clearAllData().then(() => {
        localStorage.setItem(wipeKey, 'true');
      });
    }
  }, [user, clearAllData, productsLoading, isLoading]);

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
    bulkAddTransactions,
    clearAllData,
    isLoading,
    activePlan,
    isProcessingPayment,
    showSubscriptionModal,
    setShowSubscriptionModal,
    isTourOpen,
    setIsTourOpen,
    isLimitExceeded,
    activePlanLimit,
    handleUpgrade,
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
    bulkAddTransactions,
    clearAllData,
    activePlan,
    isProcessingPayment,
    showSubscriptionModal,
    setShowSubscriptionModal,
    isTourOpen,
    setIsTourOpen,
    isLimitExceeded,
    activePlanLimit,
    handleUpgrade,
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
