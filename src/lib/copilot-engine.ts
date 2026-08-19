import { Product, Transaction, Supplier, PurchaseOrder, ProductReturn, BusinessProfile } from './types';
import { computeBusinessHealth, generateActionTasks, generateTodayPriorities, ActionTask } from './command-center-engine';
import { computeProductIntelligence, filterProductsByNaturalLanguage } from './product-intelligence-engine';
import {
  calculateSupplierPerformanceScore,
  calculateSupplierCostIntelligence,
  detectProcurementRisks,
  calculateProcurementSavings,
  generateSmartProcurementRecommendation,
} from './supplier-intelligence-engine';
import { generateBusinessForecastingReport, ForecastingReport } from './forecasting-engine';
import { computeCustomerGrowthIntelligence } from './customer-growth-engine';
import { runBusinessSimulation } from './simulation-engine';

export type IntentType =
  | 'PRODUCT_ANALYSIS'
  | 'INVENTORY_ANALYSIS'
  | 'SUPPLIER_ANALYSIS'
  | 'PROCUREMENT_ANALYSIS'
  | 'REVENUE_ANALYSIS'
  | 'PROFIT_ANALYSIS'
  | 'ORDER_ANALYSIS'
  | 'RETURN_ANALYSIS'
  | 'BUSINESS_HEALTH'
  | 'RECOMMENDATION'
  | 'FORECASTING_ANALYSIS'
  | 'EXECUTIVE_REPORT'
  | 'GROWTH_ANALYSIS'
  | 'SIMULATION_QUERY'
  | 'GENERAL_BUSINESS_QUERY'
  | 'UNKNOWN';

export interface CopilotResponse {
  intent: IntentType;
  intentLabel: string;
  answerMarkdown: string;
  what: string;
  why: string;
  actionText: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  confidenceReason?: string;
  supportingData: { label: string; value: string }[];
  recommendedAction?: {
    label: string;
    actionType: 'reorder' | 'discount' | 'price_up' | 'supplier' | 'navigate' | 'po';
    targetRoute?: string;
    targetId?: string;
    actionTask?: ActionTask;
  };
  suggestedFollowUps: string[];
}

export const COPILOT_SUGGESTIONS = [
  { category: 'Priorities', question: 'What should I focus on today?' },
  { category: 'Forecasting', question: 'What will my revenue look like next month?' },
  { category: 'Forecasting', question: 'Which products will run out of stock next week?' },
  { category: 'Forecasting', question: 'What should I buy next month?' },
  { category: 'Profitability', question: 'Why did my profit decrease?' },
  { category: 'Profitability', question: 'Which products are losing money?' },
  { category: 'Inventory', question: 'Which products should I reorder?' },
  { category: 'Capital', question: 'Which products are tying up the most capital?' },
  { category: 'Suppliers', question: 'Which supplier is becoming risky?' },
  { category: 'Procurement', question: 'Where can I reduce costs?' },
];

function normalize(str: string): string {
  return (str || '').toLowerCase().trim();
}

export function classifyBusinessIntent(
  query: string,
  history: { role: string; content: string }[] = []
): {
  intent: IntentType;
  intentLabel: string;
  resolvedEntity?: string;
  timeframe?: string;
} {
  const q = normalize(query);

  if ((q === 'why?' || q === 'why' || q.includes('why is that') || q.includes('tell me why')) && history.length > 0) {
    const lastUserMsg = [...history].reverse().find(m => m.role === 'user')?.content || '';
    const lastIntent = classifyBusinessIntent(lastUserMsg, []);
    return {
      intent: lastIntent.intent,
      intentLabel: `${lastIntent.intentLabel} (Follow-Up Root Cause)`,
    };
  }

  // Executive Report & Performance Summaries
  if (
    q.includes('report') ||
    q.includes('executive') ||
    q.includes('period comparison') ||
    q.includes('what changed from') ||
    q.includes('summarize last month') ||
    q.includes('profit bridge') ||
    q.includes('scorecard') ||
    q.includes('biggest risks')
  ) {
    return { intent: 'EXECUTIVE_REPORT', intentLabel: 'Executive Report & Performance Summary' };
  }

  // Predictive & Forecasting Questions
  if (
    q.includes('forecast') ||
    q.includes('predict') ||
    q.includes('next month') ||
    q.includes('next week') ||
    q.includes('future') ||
    q.includes('look like next') ||
    q.includes('run out of stock') ||
    q.includes('what to buy next') ||
    q.includes('become dead stock')
  ) {
    return { intent: 'FORECASTING_ANALYSIS', intentLabel: 'Predictive Demand & Revenue Forecasting' };
  }

  if (
    q.includes('what if') ||
    q.includes('if i increase') ||
    q.includes('if i reduce') ||
    q.includes('if i order') ||
    q.includes('if i switch') ||
    q.includes('what happens if') ||
    q.includes('simulate')
  ) {
    return { intent: 'SIMULATION_QUERY', intentLabel: 'AI Strategy & Business Simulation' };
  }

  if (
    q.includes('today') ||
    q.includes('focus') ||
    q.includes('what should i do') ||
    q.includes('recommendation') ||
    q.includes('priorities') ||
    q.includes('action plan')
  ) {
    return { intent: 'RECOMMENDATION', intentLabel: 'Today Priorities & Recommendations' };
  }

  if (
    q.includes('business health') ||
    q.includes('how is my business doing') ||
    q.includes('health score') ||
    q.includes('overall health') ||
    q.includes('business performing')
  ) {
    return { intent: 'BUSINESS_HEALTH', intentLabel: 'Business Health Score Analysis' };
  }

  if (
    q.includes('profit') ||
    q.includes('margin') ||
    q.includes('losing money') ||
    q.includes('loss') ||
    q.includes('roi') ||
    q.includes('profitability')
  ) {
    return { intent: 'PROFIT_ANALYSIS', intentLabel: 'Profitability & Margin Analysis' };
  }

  if (
    q.includes('supplier') ||
    q.includes('vendor') ||
    q.includes('who should i buy from') ||
    q.includes('supplier risk') ||
    q.includes('best supplier')
  ) {
    return { intent: 'SUPPLIER_ANALYSIS', intentLabel: 'Supplier Intelligence & Performance' };
  }

  if (
    q.includes('procurement') ||
    q.includes('reduce cost') ||
    q.includes('reduce costs') ||
    q.includes('savings') ||
    q.includes('cheaper') ||
    q.includes('pay less')
  ) {
    return { intent: 'PROCUREMENT_ANALYSIS', intentLabel: 'Procurement & Cost Savings' };
  }

  if (
    q.includes('reorder') ||
    q.includes('stockout') ||
    q.includes('dead stock') ||
    q.includes('tying up capital') ||
    q.includes('inventory health') ||
    q.includes('stock') ||
    q.includes('inventory')
  ) {
    return { intent: 'INVENTORY_ANALYSIS', intentLabel: 'Inventory Velocity & Health' };
  }

  if (
    q.includes('grow') ||
    q.includes('growth') ||
    q.includes('cross-sell') ||
    q.includes('cross sell') ||
    q.includes('upsell') ||
    q.includes('at risk customer') ||
    q.includes('at-risk customer') ||
    q.includes('customer retention') ||
    q.includes('repeat purchase') ||
    q.includes('limiting my growth') ||
    q.includes('increase revenue')
  ) {
    return { intent: 'GROWTH_ANALYSIS', intentLabel: 'Customer Growth & Retention Intelligence' };
  }

  if (
    q.includes('revenue') ||
    q.includes('sales velocity') ||
    q.includes('sales volume') ||
    q.includes('top selling') ||
    q.includes('best seller')
  ) {
    return { intent: 'REVENUE_ANALYSIS', intentLabel: 'Revenue & Demand Analysis' };
  }

  if (q.includes('return') || q.includes('defective') || q.includes('refund')) {
    return { intent: 'RETURN_ANALYSIS', intentLabel: 'Returns & Refund Diagnostics' };
  }

  if (q.includes('product') || q.includes('item') || q.includes('sku') || q.includes('catalog')) {
    return { intent: 'PRODUCT_ANALYSIS', intentLabel: 'Product Performance Intelligence' };
  }

  return { intent: 'GENERAL_BUSINESS_QUERY', intentLabel: 'General Business Query' };
}

export function processCopilotQuery(
  query: string,
  history: { role: string; content: string }[] = [],
  products: Product[] = [],
  transactions: Transaction[] = [],
  suppliers: Supplier[] = [],
  orders: PurchaseOrder[] = [],
  returns: ProductReturn[] = [],
  businessProfile?: BusinessProfile | null
): CopilotResponse {
  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';
  const formatCur = (val: number) => `${currencySymbol}${Math.round(val).toLocaleString('en-IN')}`;

  const { intent, intentLabel } = classifyBusinessIntent(query, history);

  const health = computeBusinessHealth(products, transactions, suppliers, returns);
  const actionTasks = generateActionTasks(products, transactions, suppliers, orders, businessProfile);
  const todayPriorities = generateTodayPriorities(products, transactions, suppliers);
  const risks = detectProcurementRisks(products, suppliers, orders, transactions);
  const savings = calculateProcurementSavings(products, suppliers, orders, transactions);
  const forecastReport = generateBusinessForecastingReport(products, transactions, suppliers, orders);
  const growthReport = computeCustomerGrowthIntelligence(products, transactions, suppliers, orders, returns, businessProfile);

  const salesTx = transactions.filter(t => t.type === 'Sale');
  const totalRevenue = salesTx.reduce((sum, t) => sum + (t.totalRevenue || (t.quantity * (t.price || 0))), 0);
  const totalCOGS = salesTx.reduce((sum, t) => {
    if (t.totalCost !== undefined) return sum + t.totalCost;
    const p = products.find(prod => prod.id === t.productId || prod.sku === t.sku);
    return sum + (t.quantity * (p?.costPrice || 0));
  }, 0);
  const totalProfit = totalRevenue - totalCOGS;
  const overallMarginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 35;

  const saleProductIds = new Set(salesTx.map(t => t.productId));
  const deadStockProducts = products.filter(p => p.stock > 0 && !saleProductIds.has(p.id));
  const tiedCapital = deadStockProducts.reduce((sum, p) => sum + (p.stock * (p.costPrice || p.price * 0.6)), 0);
  const lowStockProducts = products.filter(p => p.stock <= (p.minStock || 5));

  let confidence: CopilotResponse['confidence'] = forecastReport.overallConfidence;
  let confidenceReason: string | undefined = forecastReport.confidenceReason;

  // 0. GROWTH ANALYSIS INTENT
  if (intent === 'GROWTH_ANALYSIS') {
    const topOpp = growthReport.opportunities[0];
    const topCS = growthReport.crossSellOpportunities[0];
    const atRiskCount = growthReport.atRiskCustomers.length;

    const what = `Growth Health Score is ${growthReport.growthHealthScore}/100 (${growthReport.scoreCategory}) with ${growthReport.opportunities.length} identified growth opportunities.`;
    const why = topOpp
      ? `Primary growth driver: ${topOpp.title} (Score ${topOpp.opportunityScore}/100, Expected Profit +${formatCur(topOpp.expectedAdditionalProfit)}).`
      : `Customer repeat purchase rate is ${growthReport.repeatPurchaseRatePercent}%.`;

    const actionText = topOpp
      ? topOpp.recommendation
      : 'Review Executive Growth Intelligence suite to accept high-scoring growth recommendations.';

    const answerMarkdown = `### CUSTOMER GROWTH & RETENTION INTELLIGENCE\n\n` +
      `- **Growth Health Score:** ${growthReport.growthHealthScore}/100 (${growthReport.scoreCategory})\n` +
      `- **Repeat Purchase Rate:** ${growthReport.repeatPurchaseRatePercent}% (${growthReport.repeatRateChangePoints >= 0 ? '+' : ''}${growthReport.repeatRateChangePoints} pts vs prior)\n` +
      `- **At-Risk Customers:** ${atRiskCount} customer(s) exceeding repurchase window.\n` +
      `- **Top Cross-Sell Opportunity:** ${topCS ? `${topCS.primaryProductName} + ${topCS.suggestedProductName} (+${formatCur(topCS.potentialRevenueImpact)})` : 'None detected'}\n\n` +
      `**AI Growth Recommendation:** ${actionText}`;

    return {
      intent,
      intentLabel,
      answerMarkdown,
      what,
      why,
      actionText,
      confidence: growthReport.hasData ? 'HIGH' : 'LOW',
      confidenceReason: growthReport.dataQualityMessage || 'Calculated from historical order patterns and product sales velocity.',
      supportingData: [
        { label: 'Growth Score', value: `${growthReport.growthHealthScore}/100` },
        { label: 'Repeat Rate', value: `${growthReport.repeatPurchaseRatePercent}%` },
        { label: 'At-Risk Buyers', value: `${atRiskCount}` },
        { label: 'Concentration Risk', value: `${growthReport.revenueConcentration.riskLevel}` },
      ],
      recommendedAction: {
        label: 'Open Growth Intelligence Suite',
        actionType: 'navigate',
        targetRoute: '/dashboard/executive',
      },
      suggestedFollowUps: [
        'Which products should I cross-sell?',
        'Which customers are at risk of leaving?',
        'What is limiting my business growth?',
      ],
    };
  }

  // 0.5. SIMULATION QUERY INTENT
  if (intent === 'SIMULATION_QUERY') {
    const qLower = query.toLowerCase();

    let simType: any = 'PRICE_CHANGE';
    let params: Record<string, any> = {};

    if (qLower.includes('order') || qLower.includes('purchase')) {
      simType = 'INVENTORY_PURCHASE';
      params.purchaseQty = 300;
    } else if (qLower.includes('discount')) {
      simType = 'DISCOUNT_PROMOTION';
      params.discountPercent = 20;
    } else if (qLower.includes('switch') || qLower.includes('supplier')) {
      simType = 'SUPPLIER_SWITCH';
    } else if (qLower.includes('reduce price')) {
      simType = 'PRICE_CHANGE';
      params.priceChangePercent = -10;
    } else {
      simType = 'PRICE_CHANGE';
      params.priceChangePercent = 10;
    }

    // Match product name if present
    const matchedProd = products.find(p => p.name && qLower.includes(p.name.toLowerCase())) || products[0];

    const simRes = runBusinessSimulation(simType, matchedProd?.id || '', params, products, transactions, suppliers, orders, businessProfile);

    const revDiff = simRes.simulated.projectedRevenue - simRes.baseline.revenue;
    const profDiff = simRes.simulated.projectedProfit - simRes.baseline.grossProfit;

    const what = `Simulated impact for ${simRes.title}: Projected Revenue ${formatCur(simRes.simulated.projectedRevenue)} (${revDiff >= 0 ? '+' : ''}${formatCur(revDiff)}) with Gross Profit ${formatCur(simRes.simulated.projectedProfit)} (${profDiff >= 0 ? '+' : ''}${formatCur(profDiff)}).`;
    const why = `Demand shift is estimated at ${simRes.simulated.demandChangePercent || 0}%. Unit margin shifts by ${simRes.simulated.marginChangePercentagePoints >= 0 ? '+' : ''}${simRes.simulated.marginChangePercentagePoints} pts.`;
    const actionText = simRes.recommendation;

    const answerMarkdown = `### AI BUSINESS SIMULATION RESULT (READ-ONLY SIMULATION)\n\n` +
      `- **Scenario:** ${simRes.title}\n` +
      `- **Projected Revenue:** ${formatCur(simRes.simulated.projectedRevenue)} \`SIMULATED\` (${revDiff >= 0 ? '+' : ''}${formatCur(revDiff)})\n` +
      `- **Projected Gross Profit:** ${formatCur(simRes.simulated.projectedProfit)} \`SIMULATED\` (${profDiff >= 0 ? '+' : ''}${formatCur(profDiff)})\n` +
      `- **Margin Shift:** ${simRes.simulated.marginChangePercentagePoints >= 0 ? '+' : ''}${simRes.simulated.marginChangePercentagePoints} percentage points\n` +
      `- **Opportunity Score:** ${simRes.opportunityScore}/100 | **Risk Score:** ${simRes.riskScore}/100\n` +
      `- **Confidence:** ${simRes.confidence} (${simRes.confidenceReason})\n\n` +
      `**Assumptions:**\n` +
      simRes.assumptions.map(a => `- ${a}`).join('\n') + `\n\n` +
      `**AI Strategic Recommendation:** ${actionText}`;

    return {
      intent,
      intentLabel,
      answerMarkdown,
      what,
      why,
      actionText,
      confidence: simRes.confidence,
      confidenceReason: simRes.confidenceReason,
      supportingData: [
        { label: 'Baseline Revenue', value: formatCur(simRes.baseline.revenue) },
        { label: 'Simulated Revenue', value: formatCur(simRes.simulated.projectedRevenue) },
        { label: 'Simulated Profit', value: formatCur(simRes.simulated.projectedProfit) },
        { label: 'Stockout Risk', value: simRes.simulated.stockoutRiskLevel },
      ],
      recommendedAction: {
        label: 'Open AI Strategy Lab',
        actionType: 'navigate',
        targetRoute: '/dashboard/executive',
      },
      suggestedFollowUps: [
        'What if I order 500 units instead?',
        'What if supplier cost increases by 10%?',
        'What if I switch suppliers?',
      ],
    };
  }

  // 1. FORECASTING ANALYSIS INTENT
  if (intent === 'FORECASTING_ANALYSIS') {
    const projRev = forecastReport.totalProjected30DayRevenue;
    const projProf = forecastReport.totalProjected30DayProfit;
    const criticals = forecastReport.stockoutProjections.filter(s => s.stockoutRiskLevel === 'HIGH');
    const topStockout = criticals[0];

    const what = `Projected 30-day business revenue is ${formatCur(projRev)} with expected gross profit of ${formatCur(projProf)}.`;
    let why = `Revenue trajectory is driven by product sales velocity. ${criticals.length} product(s) are projected to stock out before supplier lead time replenishes.`;
    if (topStockout) {
      why += ` Critical SKU: ${topStockout.productName} (depletes in ${topStockout.daysRemaining} days).`;
    }

    const actionText = topStockout
      ? `Issue purchase order for ${topStockout.recommendedReorderQty} units of ${topStockout.productName} immediately with ${topStockout.preferredSupplierName}.`
      : 'Review 30-day demand forecast page to model aggressive and conservative sales scenarios.';

    const answerMarkdown = `### PREDICTIVE BUSINESS FORECAST (NEXT 30 DAYS)\n\n` +
      `- **Projected 30-Day Revenue:** ${formatCur(projRev)}\n` +
      `- **Projected 30-Day Gross Profit:** ${formatCur(projProf)}\n` +
      `- **Imminent Stockouts:** ${criticals.length} SKU(s) at high stockout risk.\n` +
      `- **Confidence Level:** ${forecastReport.overallConfidence} (${forecastReport.confidenceReason})\n\n` +
      `**Recommended Action:** ${actionText}`;

    return {
      intent,
      intentLabel,
      answerMarkdown,
      what,
      why,
      actionText,
      confidence,
      confidenceReason,
      supportingData: [
        { label: 'Projected 30D Revenue', value: formatCur(projRev) },
        { label: 'Projected 30D Profit', value: formatCur(projProf) },
        { label: 'Imminent Stockouts', value: `${criticals.length} SKUs` },
        { label: 'Excess Capital Risk', value: formatCur(forecastReport.projectedExcessCapital) },
      ],
      recommendedAction: {
        label: 'Open Business Forecasting Dashboard',
        actionType: 'navigate',
        targetRoute: '/dashboard/forecasting',
      },
      suggestedFollowUps: [
        'Which products will run out of stock next week?',
        'What should I focus on today?',
        'Where can I reduce costs?',
      ],
    };
  }

  // 2. RECOMMENDATION / TODAY PRIORITIES
  if (intent === 'RECOMMENDATION') {
    const topTask = actionTasks[0];
    const what = `Identified ${todayPriorities.length} operational priorities for your business today.`;
    const why = topTask
      ? `Top priority: ${topTask.title}. Reason: ${topTask.reason}`
      : 'Operations are stable. Review catalog inventory velocity.';
    const actionText = topTask
      ? topTask.recommendation
      : 'Maintain current inventory velocity and check weekly margin benchmarks.';

    const answerMarkdown = `### TODAY'S OPERATIONAL PRIORITIES\n\n` +
      todayPriorities.map((p, i) => `**${i + 1}. ${p.title}**\n- Category: ${p.category}\n- Recommended Action: ${p.actionLabel}`).join('\n\n') +
      `\n\n**AI Recommendation:** ${actionText}`;

    return {
      intent,
      intentLabel,
      answerMarkdown,
      what,
      why,
      actionText,
      confidence,
      confidenceReason,
      supportingData: [
        { label: 'Business Health', value: `${health.score}/100 (${health.category})` },
        { label: 'Stockout Risk Items', value: `${lowStockProducts.length} SKUs` },
        { label: 'Dead Stock Locked', value: formatCur(tiedCapital) },
        { label: 'Procurement Savings', value: formatCur(savings.totalPotentialSaving) },
      ],
      recommendedAction: topTask ? {
        label: topTask.title,
        actionType: topTask.actionType as any,
        targetRoute: '/dashboard/inventory',
        targetId: topTask.targetId,
        actionTask: topTask,
      } : undefined,
      suggestedFollowUps: [
        'What will my revenue look like next month?',
        'Why did my profit decrease?',
        'Which supplier is becoming risky?',
      ],
    };
  }

  // 3. PROFIT / MARGIN ANALYSIS
  if (intent === 'PROFIT_ANALYSIS') {
    const marginProducts = [...products].map(p => {
      const cost = p.costPrice || (p.price * 0.6);
      const margin = p.price > 0 ? ((p.price - cost) / p.price) * 100 : 0;
      return { product: p, cost, margin };
    }).sort((a, b) => a.margin - b.margin);

    const lowestMargin = marginProducts[0];
    const highCostRisk = risks.find(r => r.type === 'cost_increase');

    const what = `Total gross profit is ${formatCur(totalProfit)} with an overall business profit margin of ${overallMarginPercent}%.`;
    let why = `Primary margin pressure: ${lowestMargin ? `${lowestMargin.product.name} has a low margin of ${Math.round(lowestMargin.margin)}%` : 'Stable cost structure'}.`;
    if (highCostRisk) {
      why += ` Additionally, ${highCostRisk.reason}`;
    }

    const actionText = highCostRisk
      ? highCostRisk.recommendation
      : 'Review unit selling prices for low-margin SKUs or negotiate bulk purchase discounts.';

    const answerMarkdown = `### PROFITABILITY & MARGIN DIAGNOSTIC\n\n` +
      `- **Total Gross Profit:** ${formatCur(totalProfit)}\n` +
      `- **Business Profit Margin:** ${overallMarginPercent}%\n` +
      `- **Primary Cause:** ${why}\n\n` +
      `**Recommended Action:** ${actionText}`;

    return {
      intent,
      intentLabel,
      answerMarkdown,
      what,
      why,
      actionText,
      confidence,
      confidenceReason,
      supportingData: [
        { label: 'Gross Revenue', value: formatCur(totalRevenue) },
        { label: 'Net Profit', value: formatCur(totalProfit) },
        { label: 'Overall Margin', value: `${overallMarginPercent}%` },
        { label: 'Lowest Margin SKU', value: lowestMargin ? `${Math.round(lowestMargin.margin)}%` : 'N/A' },
      ],
      recommendedAction: {
        label: 'Open Profit Intelligence',
        actionType: 'navigate',
        targetRoute: '/dashboard/insights',
      },
      suggestedFollowUps: [
        'Which supplier is causing price increases?',
        'Where can I reduce costs?',
        'What will my profit look like next month?',
      ],
    };
  }

  // 4. INVENTORY & SUPPLIER
  if (intent === 'INVENTORY_ANALYSIS') {
    const topReorder = lowStockProducts[0];
    const what = `${lowStockProducts.length} product(s) are below alert thresholds and ${deadStockProducts.length} SKUs are dead stock.`;
    const why = topReorder
      ? `${topReorder.name} stock (${topReorder.stock} units) is below reorder threshold of ${topReorder.minStock || 5}.`
      : `Capital lockup: ${formatCur(tiedCapital)} tied up in ${deadStockProducts.length} non-moving items.`;

    const actionText = topReorder
      ? `Reorder ${topReorder.minStock ? topReorder.minStock * 4 : 40} units of ${topReorder.name} immediately with ${topReorder.supplier || 'supplier'}.`
      : 'Launch a clearance promotion to unlock tied-up working capital.';

    const answerMarkdown = `### INVENTORY HEALTH & REORDER DIAGNOSTIC\n\n` +
      `- **Low Stock SKUs:** ${lowStockProducts.length} items requiring immediate restock.\n` +
      `- **Dead Stock Lockup:** ${formatCur(tiedCapital)} tied in ${deadStockProducts.length} stagnant SKUs.\n\n` +
      `**Action Plan:** ${actionText}`;

    return {
      intent,
      intentLabel,
      answerMarkdown,
      what,
      why,
      actionText,
      confidence,
      confidenceReason,
      supportingData: [
        { label: 'Total Catalog SKUs', value: `${products.length} SKUs` },
        { label: 'Low Stock Items', value: `${lowStockProducts.length}` },
        { label: 'Dead Stock Capital', value: formatCur(tiedCapital) },
        { label: 'Avg Daily Velocity', value: `${(products.reduce((a, b) => a + (b.averageDailySales || 0), 0) / (products.length || 1)).toFixed(1)}/day` },
      ],
      recommendedAction: topReorder ? {
        label: `Reorder ${topReorder.name}`,
        actionType: 'reorder',
        targetRoute: '/dashboard/inventory',
        targetId: topReorder.id,
      } : {
        label: 'Clear Dead Stock',
        actionType: 'discount',
        targetRoute: '/dashboard/inventory',
      },
      suggestedFollowUps: [
        'Which products will run out of stock next week?',
        'Which supplier should I buy from?',
        'What should I focus on today?',
      ],
    };
  }

  // 5. SUPPLIER & PROCUREMENT
  if (intent === 'SUPPLIER_ANALYSIS' || intent === 'PROCUREMENT_ANALYSIS') {
    const topRisk = risks[0];
    const topSaving = savings.savingsList[0];

    const what = `${suppliers.length} active vendors managed. ${risks.length} procurement risk(s) detected with ${formatCur(savings.totalPotentialSaving)} in potential annual savings.`;
    const why = topRisk
      ? `${topRisk.supplierName}: ${topRisk.reason}`
      : (topSaving ? `Paying ₹${topSaving.currentCost} to ${topSaving.currentSupplierName} vs ₹${topSaving.alternativeCost} with ${topSaving.alternativeSupplierName}.` : 'Suppliers operating normally.');

    const actionText = topSaving
      ? topSaving.recommendation
      : (topRisk ? topRisk.recommendation : 'Review supplier lead times and delivery performance on purchase orders.');

    const answerMarkdown = `### SUPPLIER INTELLIGENCE & PROCUREMENT REPORT\n\n` +
      `- **Active Vendors:** ${suppliers.length}\n` +
      `- **Procurement Risks:** ${risks.length} active risk alerts.\n` +
      `- **Potential Annual Savings:** ${formatCur(savings.totalPotentialSaving)}\n\n` +
      `**Recommended Vendor Action:** ${actionText}`;

    return {
      intent,
      intentLabel,
      answerMarkdown,
      what,
      why,
      actionText,
      confidence,
      confidenceReason,
      supportingData: [
        { label: 'Active Vendors', value: `${suppliers.length}` },
        { label: 'Risk Alerts', value: `${risks.length}` },
        { label: 'Potential Savings', value: formatCur(savings.totalPotentialSaving) },
      ],
      recommendedAction: {
        label: 'View Supplier Intelligence',
        actionType: 'supplier',
        targetRoute: '/dashboard/suppliers',
      },
      suggestedFollowUps: [
        'Compare vendors side-by-side',
        'Which products should I reorder?',
        'What will my revenue look like next month?',
      ],
    };
  }

  // 5.5. REVENUE & SALES DEMAND
  if (intent === 'REVENUE_ANALYSIS') {
    const what = `Total Gross Revenue is ${formatCur(totalRevenue)} generated from ${salesTx.length} completed transactions.`;
    const why = `Revenue is generated across ${products.length} catalog items with an average transaction value of ${salesTx.length > 0 ? formatCur(totalRevenue / salesTx.length) : formatCur(0)}.`;
    const actionText = 'Analyze top-selling categories to expand high-velocity product lines and optimize stock replenishment.';

    const answerMarkdown = `### REVENUE & SALES DEMAND ANALYSIS\n\n` +
      `- **Total Gross Revenue:** ${formatCur(totalRevenue)}\n` +
      `- **Total Sales Transactions:** ${salesTx.length}\n` +
      `- **Catalog Products:** ${products.length} items\n\n` +
      `**Recommended Action:** ${actionText}`;

    return {
      intent,
      intentLabel,
      answerMarkdown,
      what,
      why,
      actionText,
      confidence,
      confidenceReason,
      supportingData: [
        { label: 'Gross Revenue', value: formatCur(totalRevenue) },
        { label: 'Sales Transactions', value: `${salesTx.length}` },
        { label: 'Avg Margin', value: `${overallMarginPercent}%` },
      ],
      recommendedAction: {
        label: 'View Revenue Reports',
        actionType: 'navigate',
        targetRoute: '/dashboard/reports',
      },
      suggestedFollowUps: [
        'What will my revenue look like next month?',
        'Why did my profit decrease?',
        'Which products should I reorder?',
      ],
    };
  }

  // 6. BUSINESS HEALTH OVERVIEW
  const what = `Business Health Quotient is ${health.score}/100 (${health.category}).`;
  const why = health.summarySentence;
  const actionText = 'Focus on reordering critical inventory and liquidating dead stock to boost operational cash flow.';

  const answerMarkdown = `### BUSINESS HEALTH SCORE: ${health.score}/100 (${health.category})\n\n` +
    `- **Inventory Health:** ${health.factors.inventoryHealth}%\n` +
    `- **Profit Margin Index:** ${health.factors.marginHealth}%\n` +
    `- **Capital Efficiency:** ${health.factors.capitalEfficiency}%\n` +
    `- **Supplier Performance:** ${health.factors.supplierPerformance}%\n\n` +
    `**Executive Summary:** ${health.summarySentence}`;

  return {
    intent: intent || 'BUSINESS_HEALTH',
    intentLabel: intentLabel || 'Business Health Overview',
    answerMarkdown,
    what,
    why,
    actionText,
    confidence,
    confidenceReason,
    supportingData: [
      { label: 'Health Score', value: `${health.score}/100` },
      { label: 'Status', value: health.category },
      { label: 'Catalog SKUs', value: `${products.length}` },
    ],
    recommendedAction: {
      label: 'View Action Center',
      actionType: 'navigate',
      targetRoute: '/dashboard',
    },
    suggestedFollowUps: [
      'What will my revenue look like next month?',
      'What should I focus on today?',
      'Why did my profit decrease?',
    ],
  };
}
