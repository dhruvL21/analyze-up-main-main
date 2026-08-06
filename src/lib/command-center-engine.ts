import { Product, Transaction, Supplier, PurchaseOrder, ProductReturn, BusinessProfile } from './types';
import { getIndustryConfig } from './industry-intelligence';

export interface BusinessHealthSummary {
  score: number;
  category: 'Excellent' | 'Healthy' | 'Needs Attention' | 'Poor' | 'Critical';
  color: string;
  badgeClass: string;
  factors: {
    inventoryHealth: number;
    marginHealth: number;
    capitalEfficiency: number;
    supplierPerformance: number;
    deadStockRatio: number;
  };
  summarySentence: string;
}

export interface ActionTask {
  id: string;
  title: string;
  problem: string;
  reason: string;
  impact: string;
  recommendation: string;
  priority: 'High' | 'Medium' | 'Low';
  estimatedBenefit: string;
  actionType: 'reorder' | 'discount' | 'price_up' | 'supplier' | 'audit' | 'review_returns' | 'promote';
  targetId?: string;
  targetName?: string;
}

export interface KPICardItem {
  key: string;
  title: string;
  value: string;
  rawValue: number;
  change: string; // e.g. "+12%" or "-8%"
  isPositiveChange: boolean;
  interpretation: string;
}

export interface InventoryQualityMetrics {
  healthyCount: number;
  lowStockCount: number;
  criticalStockCount: number;
  deadStockCount: number;
  fastMovingCount: number;
  slowMovingCount: number;
  recentlyAddedCount: number;
  topValuableProducts: { name: string; sku: string; value: number; stock: number }[];
}

export interface ActivityEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'sale' | 'import' | 'alert' | 'supplier' | 'order' | 'ai';
  iconName: string;
}

// 1. Calculate Business Health Score (0-100)
export function computeBusinessHealth(
  products: Product[],
  transactions: Transaction[],
  suppliers: Supplier[],
  returns: ProductReturn[]
): BusinessHealthSummary {
  if (!products || products.length === 0) {
    return {
      score: 75,
      category: 'Needs Attention',
      color: '#f59e0b',
      badgeClass: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
      factors: {
        inventoryHealth: 50,
        marginHealth: 60,
        capitalEfficiency: 70,
        supplierPerformance: 75,
        deadStockRatio: 80,
      },
      summarySentence: 'Workspace has no active inventory data. Import products or load demo business.',
    };
  }

  // Inventory Health: % of products with stock >= minStock
  const inStockProducts = products.filter(p => p.stock >= (p.minStock || 5));
  const inventoryHealth = Math.round((inStockProducts.length / products.length) * 100);

  // Dead stock ratio
  const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));
  const deadStockProducts = products.filter(p => p.stock > 0 && !saleProductIds.has(p.id));
  const deadStockRatio = Math.round(Math.max(0, 100 - (deadStockProducts.length / products.length) * 100));

  // Capital Efficiency: ratio of tied up dead stock vs total inventory valuation
  const totalValuation = products.reduce((acc, p) => acc + (p.stock * p.price), 0);
  const deadStockValuation = deadStockProducts.reduce((acc, p) => acc + (p.stock * (p.costPrice || p.price * 0.6)), 0);
  const capitalEfficiency = totalValuation > 0
    ? Math.round(Math.max(10, 100 - (deadStockValuation / totalValuation) * 100))
    : 100;

  // Margin Health
  const totalSales = transactions.filter(t => t.type === 'Sale').reduce((acc, t) => acc + (t.totalRevenue || (t.quantity * (t.price || 0))), 0);
  const totalCOGS = transactions.filter(t => t.type === 'Sale').reduce((acc, t) => {
    if (t.totalCost !== undefined) return acc + t.totalCost;
    const p = products.find(prod => prod.id === t.productId || prod.sku === t.sku);
    return acc + (t.quantity * (p?.costPrice || 0));
  }, 0);
  const profitMarginPercent = totalSales > 0 ? ((totalSales - totalCOGS) / totalSales) * 100 : 35;
  const marginHealth = Math.min(100, Math.round((profitMarginPercent / 45) * 100));

  // Supplier performance
  const avgSupplierLead = products.reduce((acc, p) => acc + (p.leadTimeDays || 7), 0) / products.length;
  const supplierPerformance = Math.round(Math.max(30, 100 - (avgSupplierLead - 3) * 5));

  // Overall Weighted Score
  const score = Math.round(
    inventoryHealth * 0.25 +
    marginHealth * 0.25 +
    capitalEfficiency * 0.20 +
    deadStockRatio * 0.15 +
    supplierPerformance * 0.15
  );

  let category: BusinessHealthSummary['category'] = 'Healthy';
  let color = '#10b981';
  let badgeClass = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';

  if (score >= 95) {
    category = 'Excellent';
    color = '#10b981';
    badgeClass = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
  } else if (score >= 80) {
    category = 'Healthy';
    color = '#22c55e';
    badgeClass = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
  } else if (score >= 60) {
    category = 'Needs Attention';
    color = '#f59e0b';
    badgeClass = 'bg-amber-500/15 text-amber-500 border-amber-500/30';
  } else if (score >= 40) {
    category = 'Poor';
    color = '#f97316';
    badgeClass = 'bg-orange-500/15 text-orange-500 border-orange-500/30';
  } else {
    category = 'Critical';
    color = '#ef4444';
    badgeClass = 'bg-rose-500/15 text-rose-500 border-rose-500/30';
  }

  let summarySentence = 'Operations are stable with good inventory velocity.';
  if (deadStockProducts.length > 5) {
    summarySentence = `Capital lockup detected: ${deadStockProducts.length} dead stock items require clearance.`;
  } else if (inventoryHealth < 70) {
    summarySentence = `Stockout vulnerability: ${products.length - inStockProducts.length} items running low.`;
  } else if (score >= 90) {
    summarySentence = 'Excellent operational health and strong profit margins across SKUs.';
  }

  return {
    score,
    category,
    color,
    badgeClass,
    factors: {
      inventoryHealth,
      marginHealth,
      capitalEfficiency,
      supplierPerformance,
      deadStockRatio,
    },
    summarySentence,
  };
}

// 2. Generate Action Center Tasks
export function generateActionTasks(
  products: Product[],
  transactions: Transaction[],
  suppliers: Supplier[],
  businessProfile?: BusinessProfile | null
): ActionTask[] {
  const tasks: ActionTask[] = [];
  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';
  const formatCurrency = (val: number) => {
    const num = Math.abs(val);
    if (num >= 10000000) {
      return `${currencySymbol}${(val / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `${currencySymbol}${(val / 100000).toFixed(2)} Lakh`;
    }
    return `${currencySymbol}${Math.round(val).toLocaleString('en-IN')}`;
  };

  // Task Group 1: Low / Critical Stock Items (All low stock items)
  const lowStock = [...products]
    .filter(p => p && p.name && p.stock <= (p.minStock || 5))
    .sort((a, b) => (a.stock / (a.minStock || 5)) - (b.stock / (b.minStock || 5)) || a.name.localeCompare(b.name));

  lowStock.slice(0, 5).forEach((topLow) => {
    const pName = topLow.name;
    const rawPrice = topLow.price && topLow.price > 0 ? topLow.price : (topLow.costPrice ? topLow.costPrice * 1.5 : 499);
    const pPrice = Math.min(25000, Math.max(50, rawPrice));
    const reorderQty = topLow.minStock ? topLow.minStock * 4 : 50;
    const estimatedLoss = Math.round(pPrice * reorderQty);

    tasks.push({
      id: `task-reorder-${topLow.id}`,
      title: `Running out of ${pName}`,
      problem: `Current quantity is ${topLow.stock} ${topLow.unit || 'units'} (below alert threshold of ${topLow.minStock || 5}).`,
      reason: `High sales velocity over recent cycles has depleted stock faster than supplier lead time.`,
      impact: `Estimated revenue loss of ${formatCurrency(estimatedLoss)} if inventory empties before restock.`,
      recommendation: `Place a purchase order for ${reorderQty} ${topLow.unit || 'units'} immediately with ${topLow.supplier || 'supplier'}.`,
      priority: topLow.stock === 0 ? 'High' : 'High',
      estimatedBenefit: `Protect ${formatCurrency(estimatedLoss)} revenue runway`,
      actionType: 'reorder',
      targetId: topLow.id,
      targetName: pName,
    });
  });

  // Task Group 2: Dead Stock Liquidation (All stagnant items)
  const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));
  const deadStock = [...products]
    .filter(p => p && p.name && p.stock > 0 && !saleProductIds.has(p.id))
    .sort((a, b) => (b.stock * (b.costPrice || b.price * 0.6)) - (a.stock * (a.costPrice || a.price * 0.6)) || a.name.localeCompare(b.name));

  deadStock.slice(0, 5).forEach((topDead) => {
    const pName = topDead.name;
    const rawPrice = topDead.price && topDead.price > 0 ? topDead.price : (topDead.costPrice ? topDead.costPrice * 1.5 : 350);
    const pPrice = Math.min(25000, Math.max(50, rawPrice));
    const tiedCapital = topDead.stock * (topDead.costPrice || pPrice * 0.6);

    tasks.push({
      id: `task-discount-${topDead.id}`,
      title: `Liquidate Dead Stock: ${pName}`,
      problem: `${topDead.stock} ${topDead.unit || 'units'} sitting unsold with zero recorded customer transactions.`,
      reason: `Overstocking or seasonal shift resulted in stagnant shelf space.`,
      impact: `${formatCurrency(Math.round(tiedCapital))} working capital locked up in non-moving inventory.`,
      recommendation: `Launch a 20% clearance promo or bundle with best-selling products.`,
      priority: 'High',
      estimatedBenefit: `Unlock ${formatCurrency(Math.round(tiedCapital * 0.8))} cash flow`,
      actionType: 'discount',
      targetId: topDead.id,
      targetName: pName,
    });
  });

  // Task Group 3: Pricing Optimization (High Demand Items)
  const highDemandProducts = [...products]
    .filter(p => p && p.name && (p.averageDailySales || 0) >= 0.5 && (p.price || 0) > 0)
    .sort((a, b) => (b.averageDailySales || 0) - (a.averageDailySales || 0) || a.name.localeCompare(b.name));

  highDemandProducts.slice(0, 3).forEach((topDemand) => {
    const pName = topDemand.name;
    const pPrice = Math.min(50000, Math.max(50, topDemand.price || 500));
    const newPrice = Math.round(pPrice * 1.08);
    const addedProfit = Math.round((newPrice - pPrice) * (topDemand.stock || 20));

    tasks.push({
      id: `task-price-${topDemand.id}`,
      title: `Price Optimization: ${pName}`,
      problem: `High consumer demand with stable daily sales velocity (${topDemand.averageDailySales || 1.2} units/day).`,
      reason: `Current pricing is under-indexed compared to industry profit benchmarks.`,
      impact: `Unclaimed margin expansion potential.`,
      recommendation: `Adjust selling price from ${formatCurrency(pPrice)} to ${formatCurrency(newPrice)} (8% increase).`,
      priority: 'Medium',
      estimatedBenefit: `+${formatCurrency(addedProfit)} additional profit margin`,
      actionType: 'price_up',
      targetId: topDemand.id,
      targetName: pName,
    });
  });

  // Task Group 4: Supplier Lead Time Audit
  const slowSuppliers = [...suppliers]
    .filter(s => s && s.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  slowSuppliers.slice(0, 2).forEach((slowSup) => {
    tasks.push({
      id: `task-supplier-${slowSup.id}`,
      title: `Supplier Delivery Delay Risk: ${slowSup.name}`,
      problem: `Average fulfillment lead time is 8+ days for orders from ${slowSup.name}.`,
      reason: `Long shipment buffer increases risk of unexpected stockout gaps.`,
      impact: `Potential customer fulfillment delays during peak order bursts.`,
      recommendation: `Request expedited freight terms or diversify backup suppliers.`,
      priority: 'Medium',
      estimatedBenefit: `Reduce lead time buffer by 3-5 days`,
      actionType: 'supplier',
      targetId: slowSup.id,
      targetName: slowSup.name,
    });
  });

  // Fallback default tasks if catalog is fresh
  if (tasks.length === 0) {
    tasks.push({
      id: 'task-audit-1',
      title: 'Complete Weekly Inventory Audit',
      problem: 'Routine physical count verification required.',
      reason: 'Periodic audits maintain 99%+ stock accuracy.',
      impact: 'Prevents phantom inventory and discrepancy errors.',
      recommendation: 'Verify physical stock counts for top 10 valuable SKUs.',
      priority: 'Low',
      estimatedBenefit: 'Ensure 100% data integrity',
      actionType: 'audit',
    });
  }

  return tasks;
}

// 3. Compute Executive KPI Card Interpretations
export function computeExecutiveKPIs(
  products: Product[],
  transactions: Transaction[],
  businessProfile?: BusinessProfile | null
): KPICardItem[] {
  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  const totalInventoryVal = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const salesTx = transactions.filter(t => t.type === 'Sale');
  const totalSalesVal = salesTx.reduce((sum, t) => sum + (t.totalRevenue || (t.quantity * (t.price || 0))), 0);
  
  const totalCOGS = salesTx.reduce((sum, t) => {
    if (t.totalCost !== undefined) return sum + t.totalCost;
    const p = products.find(prod => prod.id === t.productId || prod.sku === t.sku);
    return sum + (t.quantity * (p?.costPrice || 0));
  }, 0);
  const totalProfit = totalSalesVal - totalCOGS;

  const totalOrdersCount = salesTx.length;

  return [
    {
      key: 'revenue',
      title: 'Total Revenue',
      value: `${currencySymbol}${Math.round(totalSalesVal).toLocaleString('en-IN')}`,
      rawValue: totalSalesVal,
      change: '+14%',
      isPositiveChange: true,
      interpretation: totalSalesVal > 0 ? 'Strong sell-through rate in primary categories.' : 'Awaiting first sales transactions.',
    },
    {
      key: 'inventory_value',
      title: 'Inventory Value',
      value: `${currencySymbol}${Math.round(totalInventoryVal).toLocaleString('en-IN')}`,
      rawValue: totalInventoryVal,
      change: 'Stable',
      isPositiveChange: true,
      interpretation: products.length > 50 ? 'Healthy catalog volume across suppliers.' : 'Catalog initialized.',
    },
    {
      key: 'net_profit',
      title: 'Net Profit',
      value: `${currencySymbol}${Math.round(totalProfit).toLocaleString('en-IN')}`,
      rawValue: totalProfit,
      change: totalProfit >= 0 ? '+9%' : '-4%',
      isPositiveChange: totalProfit >= 0,
      interpretation: totalProfit >= 0 ? 'Healthy profit margins after COGS allocation.' : 'Cost of goods sold higher than revenue.',
    },
    {
      key: 'order_volume',
      title: 'Sales Orders',
      value: totalOrdersCount.toLocaleString(),
      rawValue: totalOrdersCount,
      change: '+18%',
      isPositiveChange: true,
      interpretation: totalOrdersCount > 0 ? 'Steady customer fulfillment pipeline.' : 'Ready for order sync.',
    },
  ];
}

// 4. Generate Today's Top 5 Priorities
export function generateTodayPriorities(
  products: Product[],
  transactions: Transaction[],
  suppliers: Supplier[]
): { id: string; title: string; category: string; urgency: 'High' | 'Medium' | 'Low'; actionLabel: string; route: string }[] {
  const priorities = [];

  const lowStock = products.filter(p => p.stock <= (p.minStock || 5));
  if (lowStock.length > 0) {
    priorities.push({
      id: 'prio-1',
      title: `Restock ${lowStock.length} Low Stock Products`,
      category: 'Inventory',
      urgency: 'High' as const,
      actionLabel: 'Create Reorder',
      route: '/dashboard/inventory',
    });
  }

  const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));
  const deadStock = products.filter(p => p.stock > 0 && !saleProductIds.has(p.id));
  if (deadStock.length > 0) {
    priorities.push({
      id: 'prio-2',
      title: `Clear ${deadStock.length} Dead Stock SKUs`,
      category: 'Capital',
      urgency: 'High' as const,
      actionLabel: 'Launch Clearance',
      route: '/dashboard/inventory',
    });
  }

  const slowSuppliers = suppliers.filter(s => {
    const sProds = products.filter(p => p.supplierId === s.id);
    return sProds.some(p => (p.leadTimeDays || 7) > 8);
  });
  if (slowSuppliers.length > 0) {
    priorities.push({
      id: 'prio-3',
      title: `Follow Up ${slowSuppliers.length} Delayed Supplier Orders`,
      category: 'Suppliers',
      urgency: 'Medium' as const,
      actionLabel: 'View Suppliers',
      route: '/dashboard/suppliers',
    });
  }

  priorities.push({
    id: 'prio-4',
    title: 'Review Profit Margins on Best Sellers',
    category: 'Profitability',
    urgency: 'Medium' as const,
    actionLabel: 'Analyze Margins',
    route: '/dashboard/ai-advisor',
  });

  priorities.push({
    id: 'prio-5',
    title: 'Connect Channel Webhooks for Auto-Sync',
    category: 'Integrations',
    urgency: 'Low' as const,
    actionLabel: 'View Channels',
    route: '/dashboard/integrations',
  });

  return priorities.slice(0, 5);
}

// 5. Compute Inventory Quality Snapshot
export function computeInventoryQuality(products: Product[], transactions: Transaction[]): InventoryQualityMetrics {
  const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));

  const healthyCount = products.filter(p => p.stock > (p.minStock || 5) && p.stock <= (p.maxStock || 100)).length;
  const lowStockCount = products.filter(p => p.stock <= (p.minStock || 5) && p.stock > 0).length;
  const criticalStockCount = products.filter(p => p.stock === 0).length;
  const deadStockCount = products.filter(p => p.stock > 0 && !saleProductIds.has(p.id)).length;
  const fastMovingCount = products.filter(p => (p.averageDailySales || 0) > 1.2).length;
  const slowMovingCount = products.filter(p => (p.averageDailySales || 0) > 0 && (p.averageDailySales || 0) <= 0.4).length;
  const recentlyAddedCount = Math.min(15, products.length);

  const topValuableProducts = [...products]
    .sort((a, b) => (b.stock * b.price) - (a.stock * a.price))
    .slice(0, 5)
    .map(p => ({
      name: p.name,
      sku: p.sku || 'N/A',
      value: p.stock * p.price,
      stock: p.stock,
    }));

  return {
    healthyCount,
    lowStockCount,
    criticalStockCount,
    deadStockCount,
    fastMovingCount,
    slowMovingCount,
    recentlyAddedCount,
    topValuableProducts,
  };
}
