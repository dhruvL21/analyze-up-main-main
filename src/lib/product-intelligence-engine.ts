import { Product, Transaction, Supplier, PurchaseOrder, ProductReturn } from './types';

export type ProductHealthStatus =
  | 'Excellent'
  | 'Healthy'
  | 'Low Stock'
  | 'Critical Stock'
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
  allTransactions: Transaction[],
  allReturns: ProductReturn[] = [],
  allSuppliers: Supplier[] = []
): ProductIntelligenceReport {
  const pTx = allTransactions.filter(
    t => t.type === 'Sale' && (t.productId === product.id || t.sku === product.sku || t.productName === product.name)
  );

  const totalSoldQty = pTx.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const totalRevenue = pTx.reduce((sum, t) => sum + (t.totalRevenue || (t.quantity * (t.price || 0))), 0);
  
  const costPrice = product.costPrice && product.costPrice > 0 ? product.costPrice : (product.price ? product.price * 0.6 : 100);
  const sellingPrice = product.price && product.price > 0 ? product.price : costPrice * 1.5;
  const unitProfit = sellingPrice - costPrice;
  const profitMarginPercent = sellingPrice > 0 ? Math.round((unitProfit / sellingPrice) * 100) : 35;

  // Daily Sales Velocity
  const dailySales = product.averageDailySales && product.averageDailySales > 0
    ? product.averageDailySales
    : (totalSoldQty > 0 ? Math.max(0.2, totalSoldQty / 30) : 0);

  // Days of Stock Remaining
  const daysOfStockRemaining = dailySales > 0 ? Math.round(product.stock / dailySales) : (product.stock > 0 ? 999 : 0);

  // Determine Health Status
  let healthStatus: ProductHealthStatus = 'Healthy';
  let healthColor = '#22c55e';
  let badgeClass = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';

  if (product.stock === 0) {
    healthStatus = 'Critical Stock';
    healthColor = '#ef4444';
    badgeClass = 'bg-rose-500/15 text-rose-500 border-rose-500/30';
  } else if (product.stock <= (product.minStock || 5)) {
    healthStatus = 'Low Stock';
    healthColor = '#f59e0b';
    badgeClass = 'bg-amber-500/15 text-amber-500 border-amber-500/30';
  } else if (totalSoldQty === 0 && product.stock > 0) {
    healthStatus = 'Dead Stock';
    healthColor = '#64748b';
    badgeClass = 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  } else if (product.stock >= (product.maxStock || 100)) {
    healthStatus = 'Overstocked';
    healthColor = '#3b82f6';
    badgeClass = 'bg-blue-500/15 text-blue-500 border-blue-500/30';
  } else if (dailySales >= 2.0) {
    healthStatus = 'Fast Moving';
    healthColor = '#10b981';
    badgeClass = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
  } else if (dailySales >= 1.0) {
    healthStatus = 'Trending';
    healthColor = '#8b5cf6';
    badgeClass = 'bg-purple-500/15 text-purple-500 border-purple-500/30';
  } else if (dailySales < 0.3 && totalSoldQty > 0) {
    healthStatus = 'Slow Moving';
    healthColor = '#f97316';
    badgeClass = 'bg-orange-500/15 text-orange-500 border-orange-500/30';
  }

  // Calculate Performance Score (0 - 100) & Grade
  const salesScore = Math.min(40, totalSoldQty * 2);
  const marginScore = Math.min(30, (profitMarginPercent / 50) * 30);
  const availabilityScore = product.stock > 0 ? 20 : 0;
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
  if (product.stock === 0) {
    riskLevel = 'Critical';
    riskReason = 'Out of stock! Customers cannot purchase this item.';
  } else if (product.stock <= (product.minStock || 5)) {
    riskLevel = 'High';
    riskReason = `Stock level (${product.stock}) is below alert threshold (${product.minStock || 5}). Imminent stockout risk.`;
  } else if (healthStatus === 'Dead Stock') {
    riskLevel = 'Medium';
    riskReason = 'Capital lockup! Item has zero sales velocity and is occupying shelf space.';
  } else if (profitMarginPercent < 15) {
    riskLevel = 'Medium';
    riskReason = 'Low profit margin! Selling price is close to cost price.';
  }

  // Reorder Advice
  const leadTime = product.leadTimeDays || 7;
  const isReorderNeeded = daysOfStockRemaining <= leadTime + 3 || product.stock <= (product.minStock || 5);
  const reorderQty = (product.minStock || 5) * 4 || 50;
  const runwayImpact = Math.round(sellingPrice * reorderQty);

  const reorderAdvice = {
    needed: isReorderNeeded,
    suggestedQty: reorderQty,
    urgency: product.stock === 0 ? ('High' as const) : (isReorderNeeded ? ('High' as const) : ('Low' as const)),
    reason: isReorderNeeded
      ? `Current stock (${product.stock} units) will last ~${daysOfStockRemaining} days. Supplier lead time requires ${leadTime} days.`
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
    const tied = Math.round(product.stock * costPrice * 0.8);
    opportunityAdvice = {
      hasOpportunity: true,
      type: 'clearance',
      title: 'Launch 20% Clearance Discount',
      description: 'Clear stagnant inventory to unlock tied working capital.',
      estimatedValue: tied,
    };
  } else if (dailySales >= 1.2 && profitMarginPercent < 40) {
    const newPrice = Math.round(sellingPrice * 1.08);
    const addedProfit = Math.round((newPrice - sellingPrice) * (product.stock || 20));
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

  // Executive Summary
  let executiveSummary = `${product.name} holds a Performance Grade of ${performanceGrade}. `;
  if (isReorderNeeded) {
    executiveSummary += `Stock level (${product.stock} units) is critical; reorder ${reorderQty} units immediately to protect ₹${runwayImpact.toLocaleString('en-IN')} revenue runway.`;
  } else if (healthStatus === 'Dead Stock') {
    executiveSummary += `Item has zero recorded sales, locking up ₹${Math.round(product.stock * costPrice).toLocaleString('en-IN')} in working capital. Launch a clearance promo.`;
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

// 2. Natural Language Inventory Search Engine
export function filterProductsByNaturalLanguage(
  products: Product[],
  transactions: Transaction[],
  query: string
): Product[] {
  if (!query || !query.trim()) return products;

  const q = query.toLowerCase().trim();

  const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));

  // "running out this week" or "low stock" or "out of stock"
  if (q.includes('running out') || q.includes('low stock') || q.includes('out of stock') || q.includes('critical')) {
    return products.filter(p => p && p.stock <= (p.minStock || 5));
  }

  // "dead stock" or "unsold" or "stagnant"
  if (q.includes('dead stock') || q.includes('unsold') || q.includes('stagnant') || q.includes('no sales')) {
    return products.filter(p => p && p.stock > 0 && !saleProductIds.has(p.id));
  }

  // "highest margin" or "high margin" or "profitable"
  if (q.includes('highest margin') || q.includes('high margin') || q.includes('most profitable')) {
    return [...products].sort((a, b) => {
      const marginA = ((a.price - a.costPrice) / (a.price || 1));
      const marginB = ((b.price - b.costPrice) / (b.price || 1));
      return marginB - marginA;
    });
  }

  // "less than 20%" or "low margin"
  if (q.includes('less than 20') || q.includes('low margin') || q.includes('low profit')) {
    return products.filter(p => {
      const margin = p.price > 0 ? ((p.price - p.costPrice) / p.price) * 100 : 0;
      return margin < 20;
    });
  }

  // "overstocked" or "excess stock"
  if (q.includes('overstocked') || q.includes('excess stock') || q.includes('too much stock')) {
    return products.filter(p => p && p.stock >= (p.maxStock || 100));
  }

  // "fast moving" or "best seller"
  if (q.includes('fast moving') || q.includes('best seller') || q.includes('trending')) {
    return products.filter(p => (p.averageDailySales || 0) >= 1.0);
  }

  // Standard Keyword Match (Name, SKU, Brand, Category, Supplier)
  return products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.sku && p.sku.toLowerCase().includes(q)) ||
    (p.brand && p.brand.toLowerCase().includes(q)) ||
    (p.supplier && p.supplier.toLowerCase().includes(q))
  );
}
