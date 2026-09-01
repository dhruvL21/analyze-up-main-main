import type { Product, Transaction, Supplier, PurchaseOrder, ProductReturn, BusinessProfile } from '@/lib/types';
import type { VectorDocument, SourceType } from './types';

/**
 * Fast deterministic string hash for change detection
 */
export function generateContentHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Creates entity-level semantic knowledge documents for Products.
 */
export function chunkProducts(
  products: Product[] = [],
  businessId: string,
  transactions: Transaction[] = []
): VectorDocument[] {
  const currency = '₹';
  const now = new Date().toISOString();

  // Index sales velocity and return rates per product
  const salesMap = new Map<string, { unitsSold: number; totalRev: number; lastSaleDate?: string }>();
  transactions.forEach((t) => {
    const key = t.productId || t.sku || t.productName;
    if (!key) return;
    const isSale = !t.type || t.type.toLowerCase() === 'sale';
    if (!isSale) return;

    const existing = salesMap.get(key) || { unitsSold: 0, totalRev: 0 };
    const qty = Number(t.quantity || (t as any).units_sold || 1);
    const rev = Number(t.totalRevenue || (t as any).revenue || qty * (t.price || 0));
    existing.unitsSold += qty;
    existing.totalRev += rev;
    if (t.transactionDate && (!existing.lastSaleDate || String(t.transactionDate) > existing.lastSaleDate)) {
      existing.lastSaleDate = String(t.transactionDate);
    }
    salesMap.set(key, existing);
    if (t.sku) salesMap.set(t.sku, existing);
  });

  return products.map((p) => {
    const price = Number(p.price) || 0;
    const costPrice = Number(p.costPrice) || Math.round(price * 0.6);
    const profit = Math.max(0, price - costPrice);
    const marginPct = price > 0 ? ((profit / price) * 100).toFixed(1) : '0';
    const stock = Number(p.stock) || 0;
    const reorderPoint = Number(p.reorderPoint || p.minStock || 10);
    const supplier = p.supplier || 'Primary Supplier';
    const leadTime = Number(p.leadTimeDays || 7);
    const sku = p.sku || `SKU-${p.id?.slice(0, 6) || 'UNK'}`;
    const name = p.name || p.productName || 'Product';
    const category = p.category || 'General';

    const salesStats = salesMap.get(p.id) || (p.sku ? salesMap.get(p.sku) : undefined) || { unitsSold: 0, totalRev: 0 };
    const isDeadStock = stock > 0 && salesStats.unitsSold === 0;
    const isLowStock = stock <= reorderPoint;
    const stockStatus = isDeadStock ? 'DEAD_STOCK' : isLowStock ? 'LOW_STOCK' : 'HEALTHY';

    const text = [
      `Product Catalog Record: [SKU: ${sku}] "${name}" in category "${category}".`,
      `Selling price is ${currency}${price.toLocaleString('en-IN')}, cost price is ${currency}${costPrice.toLocaleString('en-IN')}, unit profit is ${currency}${profit.toLocaleString('en-IN')} (Margin: ${marginPct}%).`,
      `Current inventory stock level is ${stock} units (Reorder threshold: ${reorderPoint} units; Status: ${stockStatus}).`,
      `Historical units sold: ${salesStats.unitsSold} units (Total revenue generated: ${currency}${salesStats.totalRev.toLocaleString('en-IN')}).`,
      salesStats.lastSaleDate ? `Last recorded sale date: ${salesStats.lastSaleDate.slice(0, 10)}.` : `No recent sale transactions logged.`,
      `Assigned supplier: "${supplier}" with estimated procurement lead time of ${leadTime} days.`,
      p.description ? `Product Description: ${p.description}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const contentHash = generateContentHash(text);

    return {
      id: `vec_prod_${businessId}_${p.id || sku}`,
      businessId,
      sourceRecordId: p.id || sku,
      sourceType: 'product' as SourceType,
      text,
      contentHash,
      metadata: {
        sku,
        name,
        category,
        price,
        costPrice,
        profit,
        marginPct: Number(marginPct),
        stock,
        reorderPoint,
        stockStatus,
        supplier,
        leadTime,
        unitsSold: salesStats.unitsSold,
        totalRev: salesStats.totalRev,
        isDeadStock,
        isLowStock,
      },
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * Creates entity-level semantic knowledge documents for Sales Transactions & Orders.
 */
export function chunkTransactions(
  transactions: Transaction[] = [],
  businessId: string
): VectorDocument[] {
  const currency = '₹';
  const now = new Date().toISOString();

  return transactions.map((t, idx) => {
    const id = t.id || `tx_${idx}`;
    const orderNum = (t as any).orderNumber || (t as any).order_number || (t as any).invoiceNo || `TX-${id.slice(0, 8)}`;
    const prodName = t.productName || (t as any).product_name || 'Product';
    const sku = t.sku || '';
    const qty = Number(t.quantity || (t as any).units_sold || 1);
    const unitPrice = Number(t.price || (t as any).selling_price || 0);
    const revenue = Number(t.totalRevenue || (t as any).revenue || qty * unitPrice);
    const cost = Number(t.totalCost || (t as any).cost || (t as any).total_cost || (t.costPerUnit ? t.costPerUnit * qty : Math.round(revenue * 0.6)));
    const profit = Math.max(0, revenue - cost);
    const dateStr = t.transactionDate ? String(t.transactionDate).slice(0, 10) : 'Recent';
    const customer = (t as any).customerName || (t as any).customer_name || 'Customer';
    const payment = t.paymentMethod || 'Standard';
    const type = t.type || 'Sale';
    const category = t.category || 'General';

    const text = [
      `Sales Transaction [${orderNum}] on ${dateStr}:`,
      `Customer "${customer}" purchased ${qty} unit(s) of "${prodName}" ${sku ? `[SKU: ${sku}]` : ''} in category "${category}".`,
      `Unit price: ${currency}${unitPrice.toLocaleString('en-IN')}, Total Revenue: ${currency}${revenue.toLocaleString('en-IN')}, Cost: ${currency}${cost.toLocaleString('en-IN')}, Profit: ${currency}${profit.toLocaleString('en-IN')}.`,
      `Payment method: ${payment}, Transaction status: ${t.status || 'Completed'}.`,
    ].join(' ');

    const contentHash = generateContentHash(text);

    return {
      id: `vec_tx_${businessId}_${id}`,
      businessId,
      sourceRecordId: id,
      sourceType: 'transaction' as SourceType,
      text,
      contentHash,
      metadata: {
        orderNumber: orderNum,
        productName: prodName,
        sku,
        quantity: qty,
        unitPrice,
        revenue,
        cost,
        profit,
        date: dateStr,
        customer,
        payment,
        type,
        category,
      },
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * Creates entity-level semantic knowledge documents for Suppliers.
 */
export function chunkSuppliers(
  suppliers: Supplier[] = [],
  businessId: string,
  products: Product[] = [],
  orders: PurchaseOrder[] = []
): VectorDocument[] {
  const currency = '₹';
  const now = new Date().toISOString();

  return suppliers.map((s, idx) => {
    const sId = s.id || `sup_${idx}`;
    const name = s.name || 'Vendor';
    const contact = s.contactName || s.email || 'Contact Representative';
    const leadTime = Number(s.leadTimeDays || (s as any).leadTime || 7);
    const reliability = Number(s.performanceScore || (s as any).reliabilityScore || 95);

    // Products supplied
    const suppliedProducts = products.filter(
      (p) => p.supplierId === s.id || (p.supplier && p.supplier.toLowerCase() === name.toLowerCase())
    );
    const totalInventoryValue = suppliedProducts.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);

    // Open orders
    const openOrders = orders.filter(
      (o) => (o.supplierId === s.id || (o.supplierName && o.supplierName.toLowerCase() === name.toLowerCase())) && o.status !== 'Fulfilled' && o.status !== 'Delivered'
    );

    const text = [
      `Supplier Profile: "${name}" (ID: ${sId}, Contact: ${contact}).`,
      `Lead time performance: ${leadTime} days average fulfillment time. Reliability score: ${reliability}%.`,
      `Active catalog items supplied: ${suppliedProducts.length} product(s) with total inventory asset value of ${currency}${totalInventoryValue.toLocaleString('en-IN')}.`,
      suppliedProducts.length > 0
        ? `Supplied items include: ${suppliedProducts.slice(0, 5).map((p) => `${p.name} [SKU: ${p.sku || p.id}]`).join(', ')}.`
        : '',
      openOrders.length > 0
        ? `Currently has ${openOrders.length} active purchase order(s) pending delivery.`
        : `No outstanding delayed purchase orders.`,
    ]
      .filter(Boolean)
      .join(' ');

    const contentHash = generateContentHash(text);

    return {
      id: `vec_sup_${businessId}_${sId}`,
      businessId,
      sourceRecordId: sId,
      sourceType: 'supplier' as SourceType,
      text,
      contentHash,
      metadata: {
        name,
        contact,
        leadTime,
        reliability,
        productCount: suppliedProducts.length,
        inventoryValue: totalInventoryValue,
        openOrdersCount: openOrders.length,
      },
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * Creates entity-level semantic knowledge documents for Purchase Orders.
 */
export function chunkPurchaseOrders(
  orders: PurchaseOrder[] = [],
  businessId: string
): VectorDocument[] {
  const currency = '₹';
  const now = new Date().toISOString();

  return orders.map((o, idx) => {
    const oId = o.id || `po_${idx}`;
    const supplierName = (o as any).supplierName || o.supplierId || 'Supplier';
    const totalCost = Number(o.totalCost || (o as any).totalAmount || 0);
    const status = o.status || 'Pending';
    const orderDate = o.orderDate ? String(o.orderDate).slice(0, 10) : 'Recent';
    const expectedDate = o.expectedDeliveryDate ? String(o.expectedDeliveryDate).slice(0, 10) : 'Upcoming';
    const itemsCount = (o as any).items ? (o as any).items.length : 1;

    const text = [
      `Purchase Order [${oId}] issued to Supplier "${supplierName}" on ${orderDate}:`,
      `Total order amount: ${currency}${totalCost.toLocaleString('en-IN')}, Status: ${status}, Items count: ${itemsCount}.`,
      `Expected delivery date: ${expectedDate}.`,
    ].join(' ');

    const contentHash = generateContentHash(text);

    return {
      id: `vec_po_${businessId}_${oId}`,
      businessId,
      sourceRecordId: oId,
      sourceType: 'order' as SourceType,
      text,
      contentHash,
      metadata: {
        orderId: oId,
        supplierName,
        totalCost,
        status,
        orderDate,
        expectedDate,
      },
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * Creates entity-level semantic knowledge documents for Product Returns.
 */
export function chunkReturns(
  returns: ProductReturn[] = [],
  businessId: string
): VectorDocument[] {
  const currency = '₹';
  const now = new Date().toISOString();

  return returns.map((r, idx) => {
    const rId = r.id || `ret_${idx}`;
    const prodName = r.productName || 'Product';
    const sku = (r as any).sku || '';
    const qty = Number(r.quantity || 1);
    const refund = Number(r.refundAmount || 0);
    const reason = r.reason || 'Not specified';
    const date = r.returnDate ? String(r.returnDate).slice(0, 10) : 'Recent';

    const text = [
      `Product Return [${rId}] on ${date}:`,
      `${qty} unit(s) of "${prodName}" ${sku ? `[SKU: ${sku}]` : ''} returned.`,
      `Refund amount: ${currency}${refund.toLocaleString('en-IN')}. Return reason: "${reason}". Status: ${r.refundStatus || 'Processed'}.`,
    ].join(' ');

    const contentHash = generateContentHash(text);

    return {
      id: `vec_ret_${businessId}_${rId}`,
      businessId,
      sourceRecordId: rId,
      sourceType: 'return' as SourceType,
      text,
      contentHash,
      metadata: {
        returnId: rId,
        productName: prodName,
        sku,
        quantity: qty,
        refundAmount: refund,
        reason,
        date,
      },
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * Creates high-level Financial & Inventory Aggregate Knowledge Documents.
 */
export function chunkFinancialAggregates(
  products: Product[] = [],
  transactions: Transaction[] = [],
  businessId: string,
  profile?: BusinessProfile | null
): VectorDocument[] {
  const currency = '₹';
  const now = new Date().toISOString();
  const docs: VectorDocument[] = [];

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

  const totalStockUnits = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const totalInventoryRetail = products.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);
  const totalInventoryCost = products.reduce(
    (sum, p) => sum + (Number(p.stock) || 0) * (Number(p.costPrice) || (Number(p.price) || 0) * 0.6),
    0
  );

  const soldProductIds = new Set(saleTransactions.map((t) => t.productId || t.sku).filter(Boolean));
  const deadStockProducts = products.filter(
    (p) => (Number(p.stock) || 0) > 0 && !soldProductIds.has(p.id) && (!p.sku || !soldProductIds.has(p.sku))
  );
  const deadStockCapital = deadStockProducts.reduce(
    (sum, p) => sum + (Number(p.stock) || 0) * (Number(p.costPrice) || (Number(p.price) || 0) * 0.6),
    0
  );

  // 1. Overall Executive Financial Summary
  const financialSummaryText = [
    `Executive Financial Summary for ${profile?.businessName || 'Business Workspace'}:`,
    `Total Sales Revenue is ${currency}${Math.round(totalRevenue).toLocaleString('en-IN')} across ${saleTransactions.length} orders (${totalUnitsSold.toLocaleString('en-IN')} total units sold).`,
    `Cost of Goods Sold (COGS) is ${currency}${Math.round(totalCOGS).toLocaleString('en-IN')}, yielding a Gross Profit of ${currency}${Math.round(grossProfit).toLocaleString('en-IN')} (Gross Profit Margin: ${grossMarginPct}%).`,
    `Total physical inventory holds ${totalStockUnits.toLocaleString('en-IN')} units across ${products.length} managed SKUs, with a total retail asset valuation of ${currency}${Math.round(totalInventoryRetail).toLocaleString('en-IN')} and cost valuation (tied working capital) of ${currency}${Math.round(totalInventoryCost).toLocaleString('en-IN')}.`,
  ].join(' ');

  docs.push({
    id: `vec_fin_${businessId}_summary`,
    businessId,
    sourceRecordId: 'fin_summary',
    sourceType: 'financial',
    text: financialSummaryText,
    contentHash: generateContentHash(financialSummaryText),
    metadata: {
      totalRevenue,
      grossProfit,
      grossMarginPct: Number(grossMarginPct),
      totalCOGS,
      totalUnitsSold,
      totalStockUnits,
      totalInventoryRetail,
      totalInventoryCost,
    },
    createdAt: now,
    updatedAt: now,
  });

  // 2. Dead Stock & Capital Optimization Summary
  const deadStockSummaryText = [
    `Inventory Working Capital & Dead Stock Analysis:`,
    `${deadStockProducts.length} product(s) identified as Dead Stock (zero recorded sales velocity).`,
    `Total working capital locked in dead stock: ${currency}${Math.round(deadStockCapital).toLocaleString('en-IN')}.`,
    deadStockProducts.length > 0
      ? `Top tied capital dead stock items include: ${deadStockProducts.slice(0, 6).map((p) => `${p.name} [SKU: ${p.sku || p.id}] (${p.stock} units, ${currency}${Math.round((Number(p.stock) || 0) * (Number(p.costPrice) || (Number(p.price) || 0) * 0.6)).toLocaleString('en-IN')} capital)`).join('; ')}.`
      : `No dead stock identified. Inventory flow is active.`,
  ].join(' ');

  docs.push({
    id: `vec_fin_${businessId}_deadstock`,
    businessId,
    sourceRecordId: 'fin_deadstock',
    sourceType: 'inventory',
    text: deadStockSummaryText,
    contentHash: generateContentHash(deadStockSummaryText),
    metadata: {
      deadStockCount: deadStockProducts.length,
      deadStockCapital,
    },
    createdAt: now,
    updatedAt: now,
  });

  // 3. Category Performance Summary
  const categorySalesMap: { [cat: string]: { revenue: number; units: number; count: number } } = {};
  products.forEach((p) => {
    const cat = p.category || 'General';
    if (!categorySalesMap[cat]) categorySalesMap[cat] = { revenue: 0, units: 0, count: 0 };
    categorySalesMap[cat].count++;
  });
  saleTransactions.forEach((t) => {
    const cat = t.category || 'General';
    if (!categorySalesMap[cat]) categorySalesMap[cat] = { revenue: 0, units: 0, count: 0 };
    const rev = Number(t.totalRevenue || (t as any).revenue || Number(t.quantity || 1) * Number(t.price || 0));
    const qty = Number(t.quantity || (t as any).units_sold || 1);
    categorySalesMap[cat].revenue += rev;
    categorySalesMap[cat].units += qty;
  });

  const categoryEntries = Object.entries(categorySalesMap).sort((a, b) => b[1].revenue - a[1].revenue);
  const categorySummaryText = [
    `Category Revenue & Inventory Breakdown:`,
    categoryEntries
      .map(
        ([cat, data], idx) =>
          `${idx + 1}. Category "${cat}": ${currency}${Math.round(data.revenue).toLocaleString('en-IN')} revenue (${data.units} units sold, ${data.count} active SKUs).`
      )
      .join(' '),
  ].join(' ');

  docs.push({
    id: `vec_fin_${businessId}_category_breakdown`,
    businessId,
    sourceRecordId: 'fin_category_breakdown',
    sourceType: 'financial',
    text: categorySummaryText,
    contentHash: generateContentHash(categorySummaryText),
    metadata: {
      topCategory: categoryEntries[0]?.[0] || 'General',
      categoryCount: categoryEntries.length,
    },
    createdAt: now,
    updatedAt: now,
  });

  return docs;
}
