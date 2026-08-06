
import { FieldValue } from "firebase/firestore";

export type BusinessType =
  | 'Retail'
  | 'Wholesale'
  | 'Manufacturing'
  | 'Restaurant'
  | 'Cafe'
  | 'Electronics'
  | 'Fashion'
  | 'Beauty'
  | 'Medical'
  | 'Hardware'
  | 'Automotive'
  | 'Sports'
  | 'Books'
  | 'Furniture'
  | 'Other';

export type BusinessSize = 'Solo' | '2-10 Employees' | '11-50 Employees' | '50+';

export type ProductUnit =
  | 'Piece'
  | 'Kg'
  | 'Gram'
  | 'Liter'
  | 'Milliliter'
  | 'Meter'
  | 'Box'
  | 'Pack'
  | 'Bottle'
  | 'Pair'
  | 'Set'
  | 'Custom';

export interface BusinessProfile {
  businessName: string;
  businessType: BusinessType;
  industry: string;
  businessSize: BusinessSize;
  currency: string;
  timezone: string;
  country: string;
  language: string;
  logoUrl?: string;
  isOnboardingCompleted: boolean;
  onboardingStep?: number;
  inventorySetupMethod?: 'manual' | 'csv' | 'shopify' | 'demo';
  shopifyStoreUrl?: string;
  shopifyStoreName?: string;
  shopifyStatus?: 'Connected' | 'Pending' | 'Disconnected' | 'Sync Required';
  updatedAt?: string | FieldValue;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  brand?: string;
  supplier?: string;
  supplierId?: string;
  createdAt: string | FieldValue;
  updatedAt: string | FieldValue;
  stock: number;
  minStock?: number;
  maxStock?: number;
  unit?: ProductUnit | string;
  price: number; // Selling price
  costPrice: number;
  imageUrl?: string;
  status?: 'Active' | 'Draft' | 'Archived';
  averageDailySales?: number;
  leadTimeDays?: number;
  userId?: string;
  tenantId?: string;
  [key: string]: any;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  userId?: string;
}

export interface Location {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  transactionId?: string;
  productId?: string;
  productName?: string;
  sku?: string;
  category?: string;
  locationId?: string;
  type: 'Sale' | 'Purchase';
  quantity: number;
  price: number; // Historical price at time of transaction
  totalRevenue?: number;
  costPerUnit?: number;
  totalCost?: number;
  supplier?: string;
  customerName?: string;
  paymentMethod?: string;
  status?: string;
  transactionDate: string | FieldValue;
  createdAt: string | FieldValue;
  updatedAt: string | FieldValue;
  userId?: string;
  tenantId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string | FieldValue;
  updatedAt: string | FieldValue;
  userId?: string;
  tenantId?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: 'Pending' | 'Fulfilled' | 'Cancelled';
  productId: string;
  quantity: number;
  createdAt: string | FieldValue;
  updatedAt: string | FieldValue;
  userId?: string;
  tenantId?: string;
}

export interface ProductReturn {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  customerName: string;
  reason: 'Defective' | 'Wrong Item' | 'Unopened / Buyer Remorse' | 'Damaged in Transit' | 'Other';
  actionTaken: 'Restocked' | 'Disposed / Written Off';
  refundStatus: 'Refunded' | 'Store Credit' | 'Pending' | 'Rejected';
  refundAmount: number;
  returnDate: string;
  notes?: string;
  userId?: string;
  createdAt: string | FieldValue;
  updatedAt: string | FieldValue;
}

export interface CustomAttribute {
  id: string;
  label: string;
  value: string;
  createdAt?: string | FieldValue;
}

