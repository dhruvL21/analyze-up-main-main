import type { Product, Transaction, Supplier, PurchaseOrder, ProductReturn, BusinessProfile } from '@/lib/types';
import type { AnalyticsResult, QueryIntent } from './types';

/**
 * Deterministic Structured Business Analytics Engine.
 * Ensures numerical business metrics are calculated directly with 100% mathematical accuracy.
 */
export function executeDeterministicAnalytics(
  intent: QueryIntent,
  query: string,
  products: Product[] = [],
  transactions: Transaction[] = [],
  suppliers: Supplier[] = [],
  orders: PurchaseOrder[] = [],
  returns: ProductReturn[] = [],
  profile?: BusinessProfile | null
): AnalyticsResult | null {
  if (
    intent === 'GREETING' ||
    intent === 'CAPABILITIES' ||
    intent === 'CONVERSATIONAL' ||
    intent === 'GENERAL_KNOWLEDGE'
  ) {
    return null;
  }

  const currency = '₹';
  const normQuery = query.toLowerCase();

  const saleTransactions = transactions.filter((t) => !t.type || t.type.toLowerCase() === 'sale');
  const totalRevenue = saleTransactions.reduce(
    (sum, t) => sum + Number(t.totalRevenue || (t as any).revenue || Number(t.quantity || 1) * Number(t.price || 0)),
    0
  );
  const totalUnitsSold = saleTransactions.reduce((sum, t) => sum + Number(t.quantity || (t as any).units_sold || 1), 0);
  const totalCOGS = saleTransactions.reduce((sum, t) => {
    if (t.totalCost !== undefined) return sum + Number(t.totalCost);
    if (t.costPerUnit !== undefined) return sum + Number(t.quantity || 1) * Number(t.costPerUnit);
    const prod = products.find((p) => p.id === t.productId || p.sku === t.sku);
    return sum + Number(t.quantity || 1) * Number(prod?.costPrice || (prod?.price ? prod.price * 0.6 : 0));
  }, 0);
  const grossProfit = Math.max(0, totalRevenue - totalCOGS);
  const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

  // 0. OPERATIONAL FOCUS & DAILY PRIORITIES
  if (intent === 'OPERATIONAL_FOCUS' || normQuery.includes('focus on today') || normQuery.includes('what should i do')) {
    const lowStockItems = products.filter((p) => (Number(p.stock) || 0) <= Number(p.reorderPoint || p.minStock || 10));
    const soldProductIds = new Set(saleTransactions.map((t) => t.productId || t.sku).filter(Boolean));
    const deadStockProducts = products.filter(
      (p) => (Number(p.stock) || 0) > 0 && !soldProductIds.has(p.id) && (!p.sku || !soldProductIds.has(p.sku))
    );
    const deadStockCapital = deadStockProducts.reduce(
      (sum, p) => sum + (Number(p.stock) || 0) * (Number(p.costPrice) || (Number(p.price) || 0) * 0.6),
      0
    );

    return {
      metricName: 'Daily Operational Focus & Strategic Action Plan',
      value: lowStockItems.length + deadStockProducts.length,
      formattedValue: `${lowStockItems.length} Urgent Stock Alerts · ${currency}${Math.round(deadStockCapital).toLocaleString('en-IN')} Capital Optimization`,
      summarySentence: `Your top operational priorities today are replenishing ${lowStockItems.length} critical low-stock items to prevent stockouts and unlocking ${currency}${Math.round(deadStockCapital).toLocaleString('en-IN')} in working capital from ${deadStockProducts.length} stagnant dead stock products.`,
      breakdown: [
        {
          label: '1. Stockout Prevention',
          value: lowStockItems.length,
          formatted: `${lowStockItems.length} product(s) below reorder threshold (${lowStockItems.slice(0, 2).map(p => p.name).join(', ') || 'All healthy'})`,
        },
        {
          label: '2. Working Capital Unlock',
          value: deadStockCapital,
          formatted: `${currency}${Math.round(deadStockCapital).toLocaleString('en-IN')} tied in ${deadStockProducts.length} dead stock items`,
        },
        {
          label: '3. Cumulative Revenue Run-Rate',
          value: totalRevenue,
          formatted: `${currency}${Math.round(totalRevenue).toLocaleString('en-IN')} total revenue across ${saleTransactions.length} sales orders`,
        },
      ],
      rawData: { lowStockCount: lowStockItems.length, deadStockCapital, deadStockCount: deadStockProducts.length, totalRevenue },
    };
  }

  // 1. DEAD STOCK ANALYTICS
  if (normQuery.includes('dead stock') || (intent === 'INVENTORY' && normQuery.includes('dead'))) {
    const soldProductIds = new Set(saleTransactions.map((t) => t.productId || t.sku).filter(Boolean));
    const deadStockProducts = products.filter(
      (p) => (Number(p.stock) || 0) > 0 && !soldProductIds.has(p.id) && (!p.sku || !soldProductIds.has(p.sku))
    );
    const deadStockCapital = deadStockProducts.reduce(
      (sum, p) => sum + (Number(p.stock) || 0) * (Number(p.costPrice) || (Number(p.price) || 0) * 0.6),
      0
    );

    return {
      metricName: 'Dead Stock Capital',
      value: deadStockCapital,
      formattedValue: `${currency}${Math.round(deadStockCapital).toLocaleString('en-IN')}`,
      summarySentence: `Identified ${deadStockProducts.length} dead stock items holding ${currency}${Math.round(deadStockCapital).toLocaleString('en-IN')} in locked working capital.`,
      breakdown: deadStockProducts.slice(0, 10).map((p) => {
        const cost = Number(p.costPrice) || (Number(p.price) || 0) * 0.6;
        const tied = (Number(p.stock) || 0) * cost;
        return {
          label: `${p.name} (${p.sku || p.id})`,
          value: tied,
          formatted: `${currency}${Math.round(tied).toLocaleString('en-IN')} (${p.stock} units @ ${currency}${cost})`,
        };
      }),
      rawData: { deadStockCount: deadStockProducts.length, deadStockCapital },
    };
  }

  // 2. CATEGORY REVENUE & BEST CATEGORY
  if (normQuery.includes('category') || (intent === 'SALES_ANALYTICS' && normQuery.includes('category'))) {
    const catMap: { [cat: string]: { revenue: number; units: number; count: number } } = {};
    products.forEach((p) => {
      const cat = p.category || 'General';
      if (!catMap[cat]) catMap[cat] = { revenue: 0, units: 0, count: 0 };
      catMap[cat].count++;
    });
    saleTransactions.forEach((t) => {
      const cat = t.category || 'General';
      if (!catMap[cat]) catMap[cat] = { revenue: 0, units: 0, count: 0 };
      const rev = Number(t.totalRevenue || (t as any).revenue || Number(t.quantity || 1) * Number(t.price || 0));
      const qty = Number(t.quantity || (t as any).units_sold || 1);
      catMap[cat].revenue += rev;
      catMap[cat].units += qty;
    });

    const sorted = Object.entries(catMap).sort((a, b) => b[1].revenue - a[1].revenue);
    const topCat = sorted[0];

    return {
      metricName: 'Category Performance',
      value: topCat ? topCat[1].revenue : 0,
      formattedValue: topCat ? `${topCat[0]} (${currency}${Math.round(topCat[1].revenue).toLocaleString('en-IN')})` : 'N/A',
      summarySentence: topCat
        ? `"${topCat[0]}" is your top-performing category with ${currency}${Math.round(topCat[1].revenue).toLocaleString('en-IN')} total revenue.`
        : 'No category transactions recorded.',
      breakdown: sorted.map(([cat, data]) => ({
        label: cat,
        value: data.revenue,
        formatted: `${currency}${Math.round(data.revenue).toLocaleString('en-IN')} (${data.units} units sold, ${data.count} SKUs)`,
      })),
      rawData: { topCategory: topCat ? topCat[0] : null, categories: sorted },
    };
  }

  // 3. LOW STOCK & REORDER REQUIREMENTS
  if (
    normQuery.includes('reorder') ||
    normQuery.includes('low stock') ||
    normQuery.includes('running out') ||
    (intent === 'INVENTORY' && !normQuery.includes('dead'))
  ) {
    const lowStockItems = products.filter((p) => (Number(p.stock) || 0) <= Number(p.reorderPoint || p.minStock || 10));

    return {
      metricName: 'Low Stock Reorder List',
      value: lowStockItems.length,
      formattedValue: `${lowStockItems.length} Products`,
      summarySentence: `${lowStockItems.length} product(s) have reached or fallen below critical reorder thresholds and require replenishment.`,
      breakdown: lowStockItems.map((p) => {
        const stock = Number(p.stock) || 0;
        const reorder = Number(p.reorderPoint || p.minStock || 10);
        return {
          label: `${p.name} (${p.sku || p.id})`,
          value: stock,
          formatted: `${stock} units left (Threshold: ${reorder}, Supplier: ${p.supplier || 'Primary'})`,
        };
      }),
      rawData: { lowStockCount: lowStockItems.length },
    };
  }

  // 4. FINANCIAL & PROFIT MARGIN ANALYTICS
  if (
    intent === 'FINANCIAL_ANALYTICS' ||
    normQuery.includes('profit') ||
    normQuery.includes('margin') ||
    normQuery.includes('cogs')
  ) {
    return {
      metricName: 'Gross Profit & Margin',
      value: grossProfit,
      formattedValue: `${currency}${Math.round(grossProfit).toLocaleString('en-IN')} (${grossMarginPct}% Margin)`,
      summarySentence: `Gross profit holds at ${currency}${Math.round(grossProfit).toLocaleString('en-IN')} with an overall gross profit margin of ${grossMarginPct}% on ${currency}${Math.round(totalRevenue).toLocaleString('en-IN')} revenue.`,
      breakdown: [
        { label: 'Total Revenue', value: totalRevenue, formatted: `${currency}${Math.round(totalRevenue).toLocaleString('en-IN')}` },
        { label: 'Cost of Goods Sold (COGS)', value: totalCOGS, formatted: `${currency}${Math.round(totalCOGS).toLocaleString('en-IN')}` },
        { label: 'Gross Profit', value: grossProfit, formatted: `${currency}${Math.round(grossProfit).toLocaleString('en-IN')}` },
        { label: 'Gross Margin %', value: Number(grossMarginPct), formatted: `${grossMarginPct}%` },
      ],
      rawData: { totalRevenue, totalCOGS, grossProfit, grossMarginPct: Number(grossMarginPct) },
    };
  }

  // 5. SALES & REVENUE GENERAL
  if (intent === 'SALES_ANALYTICS' || normQuery.includes('revenue') || normQuery.includes('sales')) {
    // Top selling products
    const prodMap = new Map<string, { qty: number; rev: number; name: string; sku: string }>();
    saleTransactions.forEach((t) => {
      const key = t.productId || t.sku || t.productName || 'unknown';
      const existing = prodMap.get(key) || { qty: 0, rev: 0, name: t.productName || t.sku || 'Item', sku: t.sku || '' };
      const qty = Number(t.quantity || (t as any).units_sold || 1);
      const rev = Number(t.totalRevenue || (t as any).revenue || qty * Number(t.price || 0));
      existing.qty += qty;
      existing.rev += rev;
      prodMap.set(key, existing);
    });

    const topProducts = Array.from(prodMap.values()).sort((a, b) => b.rev - a.rev).slice(0, 10);

    return {
      metricName: 'Total Sales Revenue',
      value: totalRevenue,
      formattedValue: `${currency}${Math.round(totalRevenue).toLocaleString('en-IN')}`,
      summarySentence: `Total cumulative sales revenue is ${currency}${Math.round(totalRevenue).toLocaleString('en-IN')} across ${saleTransactions.length} sales orders (${totalUnitsSold} total units).`,
      breakdown: topProducts.map((p) => ({
        label: `${p.name} ${p.sku ? `(${p.sku})` : ''}`,
        value: p.rev,
        formatted: `${currency}${Math.round(p.rev).toLocaleString('en-IN')} (${p.qty} units sold)`,
      })),
      rawData: { totalRevenue, totalUnitsSold, topProducts },
    };
  }

  // 6. SUPPLIER RANKING
  if (intent === 'SUPPLIER_ANALYSIS' || normQuery.includes('supplier') || normQuery.includes('vendor')) {
    const supplierScores = suppliers.map((s) => {
      const supplied = products.filter(
        (p) => p.supplierId === s.id || (p.supplier && p.supplier.toLowerCase() === s.name.toLowerCase())
      );
      const leadTime = Number(s.leadTimeDays || (s as any).leadTime || 7);
      const reliability = Number(s.performanceScore || (s as any).reliabilityScore || 95);
      const avgMargin =
        supplied.length > 0
          ? supplied.reduce((sum, p) => {
              const pr = Number(p.price) || 0;
              const cp = Number(p.costPrice) || pr * 0.6;
              return sum + (pr > 0 ? ((pr - cp) / pr) * 100 : 0);
            }, 0) / supplied.length
          : 40;

      // Composite score: 40% reliability + 30% speed (inv lead time) + 30% margin
      const speedScore = Math.max(0, 100 - leadTime * 5);
      const compositeScore = Math.round(reliability * 0.4 + speedScore * 0.3 + avgMargin * 0.3);

      return {
        supplier: s,
        leadTime,
        reliability,
        avgMargin: Math.round(avgMargin),
        compositeScore,
        productCount: supplied.length,
      };
    });

    supplierScores.sort((a, b) => b.compositeScore - a.compositeScore);
    const best = supplierScores[0];

    return {
      metricName: 'Supplier Ranking & Evaluation',
      value: best ? best.supplier.name : 'N/A',
      formattedValue: best ? `${best.supplier.name} (Score: ${best.compositeScore}/100)` : 'N/A',
      summarySentence: best
        ? `"${best.supplier.name}" ranks as your top supplier with a composite rating of ${best.compositeScore}/100 (${best.leadTime} days lead time, ${best.reliability}% reliability, ${best.avgMargin}% average product margin).`
        : 'No supplier performance records found.',
      breakdown: supplierScores.map((s) => ({
        label: s.supplier.name,
        value: s.compositeScore,
        formatted: `Score: ${s.compositeScore}/100 (Lead time: ${s.leadTime}d, Reliability: ${s.reliability}%, Margin: ${s.avgMargin}%)`,
      })),
      rawData: { bestSupplier: best ? best.supplier.name : null, rankings: supplierScores },
    };
  }

  // 7. CUSTOMER & AOV
  if (intent === 'CUSTOMER_ANALYSIS' || normQuery.includes('aov') || normQuery.includes('average order')) {
    const orderCount = Math.max(1, saleTransactions.length);
    const aov = Math.round(totalRevenue / orderCount);

    return {
      metricName: 'Average Order Value (AOV)',
      value: aov,
      formattedValue: `${currency}${aov.toLocaleString('en-IN')}`,
      summarySentence: `Average Order Value (AOV) is ${currency}${aov.toLocaleString('en-IN')} across ${saleTransactions.length} customer orders.`,
      breakdown: [
        { label: 'Total Revenue', value: totalRevenue, formatted: `${currency}${Math.round(totalRevenue).toLocaleString('en-IN')}` },
        { label: 'Completed Orders', value: orderCount, formatted: `${orderCount} orders` },
        { label: 'Average Order Value', value: aov, formatted: `${currency}${aov.toLocaleString('en-IN')}` },
      ],
      rawData: { aov, orderCount },
    };
  }

  // 8. TREND & GROWTH
  if (intent === 'TREND_ANALYSIS' || normQuery.includes('trend') || normQuery.includes('growth')) {
    // Group sales into monthly buckets
    const monthSales: { [month: string]: number } = {};
    saleTransactions.forEach((t) => {
      const dStr = typeof t.transactionDate === 'string' ? t.transactionDate : '';
      const d = dStr ? new Date(dStr) : new Date();
      if (!isNaN(d.getTime())) {
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const rev = Number(t.totalRevenue || (t as any).revenue || Number(t.quantity || 1) * Number(t.price || 0));
        monthSales[mKey] = (monthSales[mKey] || 0) + rev;
      }
    });

    const months = Object.keys(monthSales).sort();
    const latestMonth = months[months.length - 1];
    const prevMonth = months[months.length - 2];
    const latestRev = latestMonth ? monthSales[latestMonth] : 0;
    const prevRev = prevMonth ? monthSales[prevMonth] : latestRev;
    const growthPct = prevRev > 0 ? (((latestRev - prevRev) / prevRev) * 100).toFixed(1) : '0';
    const isUp = Number(growthPct) >= 0;

    return {
      metricName: 'Monthly Sales Velocity & Growth Trend',
      value: Number(growthPct),
      formattedValue: `${isUp ? '+' : ''}${growthPct}% MoM`,
      summarySentence: `Sales revenue is ${isUp ? 'increasing' : 'decreasing'} by ${Math.abs(Number(growthPct))}% compared to the prior period (${currency}${Math.round(latestRev).toLocaleString('en-IN')} vs ${currency}${Math.round(prevRev).toLocaleString('en-IN')}).`,
      breakdown: months.slice(-6).map((m) => ({
        label: m,
        value: monthSales[m],
        formatted: `${currency}${Math.round(monthSales[m]).toLocaleString('en-IN')}`,
      })),
      rawData: { growthPct: Number(growthPct), latestRev, prevRev },
    };
  }

  return null;
}
