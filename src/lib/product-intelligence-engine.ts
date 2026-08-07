import { Product, Transaction, Supplier, PurchaseOrder, ProductReturn } from './types';

export type ProductHealthStatus =
  | 'Excellent'
  | 'Healthy'
  | 'Low Stock'
  | 'Critical Stock'
  | 'Out of Stock'
  | 'Overstocked'
  | 'Dead Stock'
  | 'Fast Moving'
  | 'Slow Moving'
  | 'Unsold'
  | 'Trending'
  | 'Discontinued Candidate';

export type ProductGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'Poor';

export interface ProductIntelligenceReport {
  healthStatus: ProductHealthStatus;
  healthColor: string;
  badgeClass: string;
  performanceGrade: ProductGrade;
  performanceScore: number; // 0 - 100
  daysOfStockRemaining: number;
  averageDailySales: number;
  profitMarginPercent: number;
  demandTrend: 'Growing' | 'Stable' | 'Declining' | 'Seasonal' | 'Spike';
  demandTrendColor: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  riskReason: string;
  reorderAdvice: {
    needed: boolean;
    suggestedQty: number;
    urgency: 'High' | 'Medium' | 'Low';
    reason: string;
    financialRunwayImpact: number;
  };
  opportunityAdvice: {
    hasOpportunity: boolean;
    type: 'price_increase' | 'clearance' | 'bundle' | 'reorder';
    title: string;
    description: string;
    estimatedValue: number;
  };
  tags: string[];
  executiveSummary: string;
}

// 1. Calculate Full Product Intelligence Report
export function computeProductIntelligence(
  product: Product,
  allTransactions: Transaction[] = [],
  allReturns: ProductReturn[] = [],
  allSuppliers: Supplier[] = []
): ProductIntelligenceReport {
  const productName = product?.name || product?.productName || product?.title || 'Selected Product';
  const stock = product?.stock !== undefined && !isNaN(product.stock) ? product.stock : 0;

  const pTx = allTransactions.filter(
    t => t.type === 'Sale' && (t.productId === product?.id || t.sku === product?.sku || (t.productName && product?.name && t.productName.toLowerCase() === product.name.toLowerCase()))
  );

  const totalSoldQty = pTx.reduce((sum, t) => sum + (t.quantity || 0), 0);

  const costPrice = product?.costPrice && product.costPrice > 0 ? product.costPrice : (product?.price ? product.price * 0.6 : 100);
  const sellingPrice = product?.price && product.price > 0 ? product.price : (costPrice ? costPrice * 1.5 : 150);
  const unitProfit = sellingPrice - costPrice;
  const profitMarginPercent = sellingPrice > 0 ? Math.round((unitProfit / sellingPrice) * 100) : 35;

  // Daily Sales Velocity
  const dailySales = product?.averageDailySales && product.averageDailySales > 0
    ? product.averageDailySales
    : (totalSoldQty > 0 ? Math.max(0.2, totalSoldQty / 30) : 0);

  // Days of Stock Remaining
  const daysOfStockRemaining = dailySales > 0 ? Math.round(stock / dailySales) : (stock > 0 ? 999 : 0);

  // Determine Health Status
  let healthStatus: ProductHealthStatus = 'Healthy';
  let healthColor = '#a07e50';
  let badgeClass = 'bg-primary/20 text-primary border border-primary/40 font-bold shadow-sm';
  const hasSalesHistory = totalSoldQty > 0;

  if (stock === 0) {
    healthStatus = 'Out of Stock';
    healthColor = '#ef4444';
    badgeClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold shadow-sm';
  } else if (stock <= (product?.minStock || 5)) {
    healthStatus = 'Low Stock';
    healthColor = '#f59e0b';
    badgeClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold shadow-sm';
  } else if (!hasSalesHistory) {
    healthStatus = 'Dead Stock';
    healthColor = '#94a3b8';
    badgeClass = 'bg-slate-400/20 text-slate-200 border border-slate-400/40 font-bold shadow-sm';
  } else if (stock >= (product?.maxStock || 100)) {
    healthStatus = 'Overstocked';
    healthColor = '#3b82f6';
    badgeClass = 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold shadow-sm';
  } else if (dailySales >= 2.0) {
    healthStatus = 'Fast Moving';
    healthColor = '#a07e50';
    badgeClass = 'bg-primary/20 text-primary border border-primary/40 font-bold shadow-sm';
  } else if (dailySales >= 1.0) {
    healthStatus = 'Trending';
    healthColor = '#a07e50';
    badgeClass = 'bg-primary/20 text-primary border border-primary/40 font-bold shadow-sm';
  } else if (dailySales < 0.3 && totalSoldQty > 0) {
    healthStatus = 'Slow Moving';
    healthColor = '#94a3b8';
    badgeClass = 'bg-slate-400/20 text-slate-200 border border-slate-400/40 font-bold shadow-sm';
  }

  // Calculate Performance Score (0 - 100) & Grade
  const salesScore = Math.min(40, totalSoldQty * 2);
  const marginScore = Math.min(30, (profitMarginPercent / 50) * 30);
  const availabilityScore = stock > 0 ? 20 : 0;
  const turnoverScore = dailySales > 0.5 ? 10 : 5;

  const performanceScore = Math.min(100, Math.round(salesScore + marginScore + availabilityScore + turnoverScore));

  let performanceGrade: ProductGrade = 'B';
  if (performanceScore >= 90) performanceGrade = 'A+';
  else if (performanceScore >= 75) performanceGrade = 'A';
  else if (performanceScore >= 60) performanceGrade = 'B';
  else if (performanceScore >= 45) performanceGrade = 'C';
  else if (performanceScore >= 30) performanceGrade = 'D';
  else performanceGrade = 'Poor';

  // Demand Trend
  let demandTrend: ProductIntelligenceReport['demandTrend'] = 'Stable';
  let demandTrendColor = '#3b82f6';
  if (dailySales >= 2.0) {
    demandTrend = 'Spike';
    demandTrendColor = '#10b981';
  } else if (dailySales >= 1.0) {
    demandTrend = 'Growing';
    demandTrendColor = '#22c55e';
  } else if (dailySales < 0.3 && totalSoldQty > 0) {
    demandTrend = 'Declining';
    demandTrendColor = '#f97316';
  }

  // Risk Assessment
  let riskLevel: ProductIntelligenceReport['riskLevel'] = 'Low';
  let riskReason = 'Operations stable with healthy inventory runway.';
  if (stock === 0) {
    riskLevel = 'Critical';
    riskReason = 'Out of stock! Customers cannot purchase this item.';
  } else if (stock <= (product?.minStock || 5)) {
    riskLevel = 'High';
    riskReason = `Stock level (${stock}) is below alert threshold (${product?.minStock || 5}). Imminent stockout risk.`;
  } else if (healthStatus === 'Dead Stock') {
    riskLevel = 'Medium';
    riskReason = 'Capital lockup! Item has zero sales velocity and is occupying shelf space.';
  } else if (profitMarginPercent < 15) {
    riskLevel = 'Medium';
    riskReason = 'Low profit margin! Selling price is close to cost price.';
  }

  // Reorder Advice
  const leadTime = product?.leadTimeDays || 7;
  const isReorderNeeded = daysOfStockRemaining <= leadTime + 3 || stock <= (product?.minStock || 5);
  const reorderQty = Math.max(10, Math.min(100, (product?.minStock || 5) * 3));
  const runwayImpact = Math.round(sellingPrice * reorderQty);

  const reorderAdvice = {
    needed: isReorderNeeded,
    suggestedQty: reorderQty,
    urgency: stock === 0 ? ('High' as const) : (isReorderNeeded ? ('High' as const) : ('Low' as const)),
    reason: isReorderNeeded
      ? `Current stock (${stock} units) will last ~${daysOfStockRemaining} days. Supplier lead time requires ${leadTime} days.`
      : `Current stock level is sufficient for ${daysOfStockRemaining} days.`,
    financialRunwayImpact: runwayImpact,
  };

  // Opportunity Advice
  let opportunityAdvice: ProductIntelligenceReport['opportunityAdvice'] = {
    hasOpportunity: false,
    type: 'reorder',
    title: 'Maintain Current Operations',
    description: 'No urgent price adjustments or promotions needed.',
    estimatedValue: 0,
  };

  if (healthStatus === 'Dead Stock') {
    const tied = Math.round(stock * costPrice * 0.8);
    opportunityAdvice = {
      hasOpportunity: true,
      type: 'clearance',
      title: 'Launch 20% Clearance Discount',
      description: 'Clear stagnant inventory to unlock tied working capital.',
      estimatedValue: tied,
    };
  } else if (dailySales >= 1.2 && profitMarginPercent < 40) {
    const newPrice = Math.round(sellingPrice * 1.08);
    const addedProfit = Math.round((newPrice - sellingPrice) * (stock || 20));
    opportunityAdvice = {
      hasOpportunity: true,
      type: 'price_increase',
      title: 'Optimize Price (+8%)',
      description: `High demand allows increasing price to ₹${newPrice} without losing sales volume.`,
      estimatedValue: addedProfit,
    };
  }

  // Tags
  const tags: string[] = [];
  if (totalSoldQty > 30 || dailySales > 1.5) tags.push('Best Seller');
  if (dailySales >= 1.0) tags.push('Trending');
  if (profitMarginPercent >= 45) tags.push('High Margin');
  if (profitMarginPercent < 20) tags.push('Low Margin');
  if (healthStatus === 'Dead Stock') tags.push('Dead Stock');
  if (isReorderNeeded) tags.push('Reorder Soon');
  if (healthStatus === 'Overstocked') tags.push('Overstock');
  if (opportunityAdvice.type === 'price_increase') tags.push('Price Up Candidate');

  // Executive Summary with robust product name resolution
  let executiveSummary = `${productName} holds a Performance Grade of ${performanceGrade}. `;
  if (isReorderNeeded) {
    executiveSummary += `Stock level (${stock} units) is critical; reorder ${reorderQty} units immediately to protect ₹${runwayImpact.toLocaleString('en-IN')} revenue runway.`;
  } else if (healthStatus === 'Dead Stock') {
    executiveSummary += `Item has zero recorded sales, locking up ₹${Math.round(stock * costPrice).toLocaleString('en-IN')} in working capital. Launch a clearance promo.`;
  } else {
    executiveSummary += `Demand is ${demandTrend.toLowerCase()} with a healthy profit margin of ${profitMarginPercent}%. Maintain purchasing priority.`;
  }

  return {
    healthStatus,
    healthColor,
    badgeClass,
    performanceGrade,
    performanceScore,
    daysOfStockRemaining,
    averageDailySales: Number(dailySales.toFixed(1)),
    profitMarginPercent,
    demandTrend,
    demandTrendColor,
    riskLevel,
    riskReason,
    reorderAdvice,
    opportunityAdvice,
    tags,
    executiveSummary,
  };
}

// 2. High-Precision Natural Language Inventory Search Engine
export function filterProductsByNaturalLanguage(
  products: Product[],
  transactions: Transaction[] = [],
  query: string
): Product[] {
  if (!query || !query.trim()) return products;

  const q = query.toLowerCase().trim();

  // Create set of product IDs that have recorded sales transactions
  const saleProductIds = new Set(
    (transactions || [])
      .filter(t => t && t.type === 'Sale' && (t.quantity || 0) > 0)
      .map(t => t.productId)
  );

  // Query 1: "dead stock" | "unsold" | "stagnant" | "no sales"
  if (
    q.includes('dead stock') ||
    q.includes('dead') ||
    q.includes('unsold') ||
    q.includes('stagnant') ||
    q.includes('no sales')
  ) {
    const deadStockItems = products.filter(p => {
      if (!p || (p.stock || 0) <= 0) return false;
      const isIdSold = p.id ? saleProductIds.has(p.id) : false;
      return !isIdSold || (p.averageDailySales !== undefined && p.averageDailySales === 0);
    });

    // Fallback if strict zero-sales yields empty but catalog has slow moving items
    if (deadStockItems.length === 0) {
      return [...products]
        .filter(p => p && (p.stock || 0) > 0)
        .sort((a, b) => (a.averageDailySales || 0) - (b.averageDailySales || 0));
    }

    return deadStockItems.sort((a, b) => (b.stock * (b.costPrice || b.price * 0.6)) - (a.stock * (a.costPrice || a.price * 0.6)));
  }

  // Query 2: "running out soon" | "running out" | "low stock" | "out of stock" | "critical stock" | "reorder"
  if (
    q.includes('running out') ||
    q.includes('low stock') ||
    q.includes('out of stock') ||
    q.includes('critical') ||
    q.includes('reorder')
  ) {
    return products
      .filter(p => {
        if (!p) return false;
        const stock = p.stock || 0;
        const minStock = p.minStock || 5;
        const ads = p.averageDailySales || 0.1;
        const runway = stock / ads;
        return stock <= minStock || stock === 0 || runway <= 14;
      })
      .sort((a, b) => (a.stock / (a.minStock || 5)) - (b.stock / (b.minStock || 5)));
  }

  // Query 3: "highest margins" | "high margin" | "most profitable" | "profitable" | "best margin"
  if (
    q.includes('highest margin') ||
    q.includes('high margin') ||
    q.includes('most profitable') ||
    q.includes('profitable') ||
    q.includes('best margin')
  ) {
    return [...products].sort((a, b) => {
      const costA = a.costPrice && a.costPrice > 0 ? a.costPrice : a.price * 0.6;
      const marginA = a.price > 0 ? ((a.price - costA) / a.price) : 0.35;

      const costB = b.costPrice && b.costPrice > 0 ? b.costPrice : b.price * 0.6;
      const marginB = b.price > 0 ? ((b.price - costB) / b.price) : 0.35;

      return marginB - marginA;
    });
  }

  // Query 4: "low margin (<20%)" | "low margin" | "low profit" | "less than 20" | "20%" | "<20%"
  if (
    q.includes('low margin') ||
    q.includes('low profit') ||
    q.includes('less than 20') ||
    q.includes('20%') ||
    q.includes('<20')
  ) {
    return products.filter(p => {
      if (!p || !p.price || p.price <= 0) return false;
      const cost = p.costPrice && p.costPrice > 0 ? p.costPrice : p.price * 0.6;
      const marginPercent = ((p.price - cost) / p.price) * 100;
      return marginPercent < 25;
    });
  }

  // Query 5: "overstocked" | "excess stock" | "too much stock" | "bulk stock"
  if (
    q.includes('overstocked') ||
    q.includes('excess stock') ||
    q.includes('too much stock') ||
    q.includes('bulk stock')
  ) {
    return products.filter(p => {
      if (!p) return false;
      const stock = p.stock || 0;
      const maxStock = p.maxStock || 100;
      const ads = p.averageDailySales || 0.5;
      const runway = stock / ads;
      return stock >= maxStock || runway >= 45;
    });
  }

  // Query 6: "fast moving" | "best seller" | "trending"
  if (
    q.includes('fast moving') ||
    q.includes('best seller') ||
    q.includes('trending')
  ) {
    return products.filter(p => (p.averageDailySales || 0) >= 0.8);
  }

  // Standard Keyword Match (Name, SKU, Brand, Category, Supplier)
  return products.filter(p => {
    if (!p) return false;
    const nameMatch = (p.name || p.productName || '').toLowerCase().includes(q);
    const skuMatch = p.sku ? p.sku.toLowerCase().includes(q) : false;
    const brandMatch = p.brand ? p.brand.toLowerCase().includes(q) : false;
    const supplierMatch = p.supplier ? p.supplier.toLowerCase().includes(q) : false;
    const categoryMatch = p.categoryId ? p.categoryId.toLowerCase().includes(q) : false;
    return nameMatch || skuMatch || brandMatch || supplierMatch || categoryMatch;
  });
}
