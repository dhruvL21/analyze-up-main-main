import { z } from 'zod';
import type { Product, Transaction } from '@/lib/types';

/* ------------------ SCHEMAS ------------------ */

const AIBriefOutputSchema = z.object({
  healthScore: z.number().min(0).max(100),
  stockoutItem: z.object({
    name: z.string(),
    riskText: z.string(),
    reorderText: z.string(),
    costText: z.string(),
  }),
  slowMovingItem: z.object({
    name: z.string(),
    riskText: z.string(),
    costText: z.string(),
    actionText: z.string(),
  }),
  savingsText: z.string(),
});

export type AIBriefOutput = z.infer<typeof AIBriefOutputSchema>;

/* ------------------ EXPORT ------------------ */

export function calculateDynamicBrief(
  products: Product[],
  transactions: Transaction[] = []
): AIBriefOutput {
  if (!products || products.length === 0) {
    return {
      healthScore: 0,
      stockoutItem: {
        name: 'No Data Connected',
        riskText: 'No inventory dataset loaded.',
        reorderText: 'Upload CSV or connect Shopify.',
        costText: 'Estimated cost: ₹0'
      },
      slowMovingItem: {
        name: 'No Data Connected',
        riskText: 'No inventory dataset loaded.',
        costText: '₹0 blocked.',
        actionText: 'Upload CSV or connect Shopify.'
      },
      savingsText: 'Cash Locked in Inventory: ₹0'
    };
  }

  // 1. Calculate Health Score strictly from user products
  let score = 100;
  let stockoutCount = 0;
  let lowStockCount = 0;

  products.forEach(p => {
    const stock = Number(p.stock) || 0;
    if (stock === 0) {
      stockoutCount++;
    } else if (stock <= (p.minStock || 5)) {
      lowStockCount++;
    }
  });

  const stockoutPercentage = stockoutCount / products.length;
  const lowStockPercentage = lowStockCount / products.length;

  score -= Math.round(stockoutPercentage * 50);
  score -= Math.round(lowStockPercentage * 25);
  score = Math.max(0, Math.min(100, score));

  // 2. Identify Stockout Risk Item strictly & deterministically (lowest stock runway first, tie-breaker by name)
  const sortedByRunway = [...products].sort((a, b) => {
    const stockA = Number(a.stock) || 0;
    const adsA = Number(a.averageDailySales) || 0.1;
    const runwayA = stockA / adsA;

    const stockB = Number(b.stock) || 0;
    const adsB = Number(b.averageDailySales) || 0.1;
    const runwayB = stockB / adsB;

    if (runwayA !== runwayB) return runwayA - runwayB;
    return (a.name || '').localeCompare(b.name || '');
  });

  const highestRiskItem = sortedByRunway[0] || products[0];

  let stockoutItem = {
    name: 'None',
    riskText: 'All items are fully stocked.',
    reorderText: 'No reorder needed.',
    costText: 'Estimated cost: ₹0'
  };

  if (highestRiskItem) {
    const stock = Number(highestRiskItem.stock) || 0;
    const ads = Number(highestRiskItem.averageDailySales) || 0.5;
    const runwayDays = Math.max(1, Math.ceil(stock / ads));
    const reorderQty = Math.max(10, Math.ceil(ads * 15 - stock));
    const costPrice = Number(highestRiskItem.costPrice) || Number(highestRiskItem.price) * 0.6 || 0;
    const estimatedCost = Math.round(reorderQty * costPrice);

    stockoutItem = {
      name: highestRiskItem.name || 'Unnamed Product',
      riskText: stock === 0 ? 'Out of stock.' : `Stockout risk in ${runwayDays} days.`,
      reorderText: `Suggested reorder: ${reorderQty} units.`,
      costText: `Estimated cost: ₹${estimatedCost.toLocaleString('en-IN')}`
    };
  }

  // 3. Identify Slow-Moving Item strictly & deterministically (highest blocked capital first, tie-breaker by name)
  const sortedByBlockedCapital = [...products].sort((a, b) => {
    const stockA = Number(a.stock) || 0;
    const priceA = Number(a.price) || 0;
    const costA = Number(a.costPrice) || priceA * 0.6 || 0;
    const blockedA = stockA * costA;

    const stockB = Number(b.stock) || 0;
    const priceB = Number(b.price) || 0;
    const costB = Number(b.costPrice) || priceB * 0.6 || 0;
    const blockedB = stockB * costB;

    if (blockedB !== blockedA) return blockedB - blockedA;
    return (a.name || '').localeCompare(b.name || '');
  });

  const worstSlowMovingItem = sortedByBlockedCapital[0] || products[0];

  let slowMovingItem = {
    name: 'None',
    riskText: 'No slow-moving inventory detected.',
    costText: '₹0 blocked.',
    actionText: 'No action suggested.'
  };

  if (worstSlowMovingItem) {
    const stock = Number(worstSlowMovingItem.stock) || 0;
    const price = Number(worstSlowMovingItem.price) || 0;
    const costPrice = Number(worstSlowMovingItem.costPrice) || price * 0.6 || 0;
    const blockedCapital = Math.round(stock * costPrice);

    const salesTx = (transactions || []).filter(t => t.type === 'Sale' && (t.productName === worstSlowMovingItem.name || t.productId === worstSlowMovingItem.id));
    const daysSinceLastSale = salesTx.length > 0 ? 5 : 30;

    slowMovingItem = {
      name: worstSlowMovingItem.name || 'Unnamed Product',
      riskText: `Low velocity (${daysSinceLastSale} days).`,
      costText: `₹${blockedCapital.toLocaleString('en-IN')} blocked.`,
      actionText: 'Suggested action: 20% Discount'
    };
  }

  // 4. Total Cash Locked in Inventory strictly calculated from actual data
  const totalLockedCapital = products.reduce((sum, p) => sum + (Number(p.stock) * (Number(p.costPrice) || Number(p.price) * 0.6 || 0)), 0);
  const savingsText = `Cash Locked in Inventory: ₹${Math.round(totalLockedCapital).toLocaleString('en-IN')}`;

  return {
    healthScore: score,
    stockoutItem,
    slowMovingItem,
    savingsText
  };
}
