'use server';

import { openai } from '@/ai/openai';
import { getIndustryConfig } from '@/lib/industry-intelligence';
import { processCopilotQuery } from '@/lib/copilot-engine';
import { computeBusinessHealth, generateActionTasks } from '@/lib/command-center-engine';
import { detectProcurementRisks, calculateProcurementSavings } from '@/lib/supplier-intelligence-engine';
import { generateBusinessForecastingReport } from '@/lib/forecasting-engine';
import { computeCustomerGrowthIntelligence } from '@/lib/customer-growth-engine';
import type { Product, Transaction, Supplier, PurchaseOrder, ProductReturn, BusinessProfile } from '@/lib/types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function askAnalyzeUpChat(
  userMessage: string,
  chatHistory: ChatMessage[] = [],
  products: Product[] = [],
  transactions: Transaction[] = [],
  suppliers: Supplier[] = [],
  orders: PurchaseOrder[] = [],
  returns: ProductReturn[] = [],
  businessProfile?: BusinessProfile | null
): Promise<string> {
  const industry = getIndustryConfig(businessProfile?.businessType);
  const currency = businessProfile?.currency || 'INR (₹)';
  const currSym = currency.includes('USD') ? '$' : '₹';

  // 1. Deterministic Application Computations
  const copilotRes = processCopilotQuery(
    userMessage,
    chatHistory,
    products,
    transactions,
    suppliers,
    orders,
    returns,
    businessProfile
  );

  const hasData = (products && products.length > 0) || (transactions && transactions.length > 0);

  // 2. Comprehensive Computed Analytics (when data is present)
  let comprehensiveDataBlock = '';

  if (hasData) {
    // Health & Scorecard
    const health = computeBusinessHealth(products, transactions, suppliers, returns);
    const actionTasks = generateActionTasks(products, transactions, suppliers, orders, businessProfile);
    
    // Procurement & Suppliers
    const risks = detectProcurementRisks(products, suppliers, orders, transactions);
    const savings = calculateProcurementSavings(products, suppliers);
    
    // Forecasting
    const forecasting = generateBusinessForecastingReport(products, transactions, suppliers, orders);
    
    // Customer Growth & RFM
    const growth = computeCustomerGrowthIntelligence(products, transactions, suppliers, orders, returns, businessProfile);

    // Financial aggregates
    const saleTransactions = transactions.filter(t => t.type === 'Sale');
    const totalRevenue = saleTransactions.reduce((sum, t) => sum + (t.totalRevenue || (t.quantity * (t.price || 0))), 0);
    const totalUnitsSold = saleTransactions.reduce((sum, t) => sum + t.quantity, 0);
    const totalCOGS = saleTransactions.reduce((sum, t) => {
      if (t.totalCost !== undefined) return sum + t.totalCost;
      if (t.costPerUnit !== undefined) return sum + (t.quantity * t.costPerUnit);
      const prod = products.find(p => p.id === t.productId || p.sku === t.sku);
      return sum + (t.quantity * (prod?.costPrice || 0));
    }, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

    // Inventory metrics
    const totalStockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalInventoryRetailValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
    const totalInventoryCostValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.costPrice || 0)), 0);
    const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.reorderPoint || p.minStock || 10));
    const deadStockProducts = products.filter(p => (p.stock || 0) > 0 && !saleTransactions.some(t => t.productId === p.id || (p.sku && t.sku === p.sku)));

    // Top selling products
    const productSalesMap = new Map<string, { qty: number; revenue: number; name: string; sku: string }>();
    saleTransactions.forEach(t => {
      const key = t.productId || t.sku || t.productName || 'unknown';
      const existing = productSalesMap.get(key) || { qty: 0, revenue: 0, name: t.productName || t.sku || 'Item', sku: t.sku || '' };
      existing.qty += t.quantity;
      existing.revenue += (t.totalRevenue || (t.quantity * (t.price || 0)));
      productSalesMap.set(key, existing);
    });
    const topSellers = Array.from(productSalesMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Returns metrics
    const totalReturnedUnits = returns.reduce((sum, r) => sum + (r.quantity || 1), 0);
    const totalRefundedAmount = returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const returnRatePct = totalUnitsSold > 0 ? ((totalReturnedUnits / totalUnitsSold) * 100).toFixed(1) : '0';

    comprehensiveDataBlock = `
=== 📊 FULL COMPREHENSIVE BUSINESS DATA ACCESS ===

1. BUSINESS HEALTH & COMMAND CENTER:
- Overall Health Score: ${health.score}/100 (${health.category})
- Health Factors: Inventory Health (${health.factors.inventoryHealth}/100), Margin Health (${health.factors.marginHealth}/100), Capital Efficiency (${health.factors.capitalEfficiency}/100), Supplier Performance (${health.factors.supplierPerformance}/100), Dead Stock Ratio (${health.factors.deadStockRatio}/100)
- Core Health Summary: ${health.summarySentence}
- Top Recommended Action Tasks:
${actionTasks.slice(0, 5).map((a, i) => `  ${i + 1}. [${a.priority.toUpperCase()}] ${a.title} - ${a.problem} -> Action: ${a.recommendation} (Benefit: ${a.estimatedBenefit})`).join('\n')}

2. FINANCIAL & REVENUE PERFORMANCE:
- Total Sales Revenue: ${currSym}${Math.round(totalRevenue).toLocaleString()}
- Total Units Sold: ${totalUnitsSold.toLocaleString()} units (${saleTransactions.length} sales orders)
- Cost of Goods Sold (COGS): ${currSym}${Math.round(totalCOGS).toLocaleString()}
- Gross Profit: ${currSym}${Math.round(grossProfit).toLocaleString()}
- Gross Margin: ${grossMarginPct}%
- Top 10 Best-Selling Products:
${topSellers.map((s, i) => `  ${i + 1}. ${s.name} (${s.sku}): ${s.qty} units sold, ${currSym}${Math.round(s.revenue).toLocaleString()} revenue`).join('\n')}

3. INVENTORY & STOCK POSITION:
- Total Managed SKUs: ${products.length} products
- Total Physical Units in Stock: ${totalStockUnits.toLocaleString()} units
- Total Inventory Retail Value: ${currSym}${Math.round(totalInventoryRetailValue).toLocaleString()}
- Total Inventory Cost Value (Tied Capital): ${currSym}${Math.round(totalInventoryCostValue).toLocaleString()}
- Low Stock Items (Reorder Required): ${lowStockProducts.length} items (${lowStockProducts.slice(0, 8).map(p => `${p.name}: ${p.stock} units left, reorder threshold ${p.reorderPoint || p.minStock || 10}`).join('; ') || 'None'})
- Dead Stock Items (Zero sales velocity): ${deadStockProducts.length} items (${deadStockProducts.slice(0, 8).map(p => `${p.name}: ${p.stock} units tied up`).join('; ') || 'None'})
- Full Product Catalog (Sample Items):
${products.slice(0, 40).map(p => {
  const marginStr = p.price > 0 ? (((p.price - (p.costPrice || 0)) / p.price) * 100).toFixed(1) + '%' : '0%';
  return `  • [${p.sku || 'SKU'}] ${p.name} | Cat: ${p.category || 'General'} | Stock: ${p.stock} | Cost: ${currSym}${p.costPrice || 0} | Retail: ${currSym}${p.price} | Margin: ${marginStr} | Reorder: ${p.reorderPoint || p.minStock || 10} | LeadTime: ${p.leadTimeDays || 7}d | Supplier: ${p.supplier || 'Primary'}`;
}).join('\n')}

4. RECENT TRANSACTION LOG (Sample):
${transactions.slice(-15).reverse().map(t => {
  const dateStr = typeof t.transactionDate === 'string' ? new Date(t.transactionDate).toLocaleDateString() : 'Recent';
  const unitPrice = t.price || t.unitPrice || 0;
  const lineTotal = t.totalRevenue || (t.quantity * unitPrice);
  return `  • ${dateStr} | Type: ${t.type} | SKU: ${t.sku || t.productId} | Product: ${t.productName || 'Item'} | Qty: ${t.quantity} | Unit Price: ${currSym}${unitPrice} | Total: ${currSym}${lineTotal} | Customer: ${t.customerName || 'Direct'} | Status: ${t.status || 'Completed'}`;
}).join('\n')}

5. SUPPLIERS & PROCUREMENT INTELLIGENCE:
- Active Suppliers: ${suppliers.length} vendors
${suppliers.map(s => `  • ${s.name} | Category: ${s.category || 'General'} | Rating: ${s.rating || 4.5}/5 | Avg Lead Time: ${s.leadTimeDays || 7} days | Performance Score: ${s.performanceScore || 90}/100`).join('\n')}
- Procurement Risks: ${risks.length > 0 ? risks.map(r => `[${r.riskLevel}] ${r.supplierName} - ${r.productName}: ${r.reason}`).join('; ') : 'No high-risk supplier issues detected.'}
- Procurement Cost Savings: ${currSym}${Math.round(savings.totalPotentialSaving).toLocaleString()} potential annual savings across ${savings.savingsList.length} items.

6. INBOUND PURCHASE ORDERS:
- Active Purchase Orders: ${orders.length} orders (${orders.slice(0, 5).map(o => `PO #${o.id.slice(-6)}: ${o.supplierName || 'Supplier'} - Status: ${o.status}, Expected: ${o.expectedDeliveryDate || 'Soon'}, Amount: ${currSym}${o.totalCost || 0}`).join('; ') || 'No active purchase orders'})

7. CUSTOMER GROWTH & RETENTION (RFM):
- Unique Customers: ${growth.totalCustomers}
- Repeat Customer Rate: ${growth.repeatPurchaseRatePercent}%
- At-Risk / Churning: ${growth.atRiskCustomers.length} customers
- Top Opportunities: ${growth.opportunities.slice(0, 3).map(o => `${o.title} (${o.description})`).join('; ') || 'Maintain healthy growth.'}

8. DEMAND FORECASTING & 30-DAY STOCKOUT PROJECTIONS:
- 30-Day Projected Revenue: ${currSym}${Math.round(forecasting.totalProjected30DayRevenue).toLocaleString()}
- Predicted Stockouts in Next 30 Days: ${forecasting.stockoutProjections.length} items (${forecasting.stockoutProjections.slice(0, 5).map(p => `${p.productName}: stockout in ${p.daysRemaining !== null ? `${p.daysRemaining} days` : 'immediate'}, recommend reordering ${p.recommendedReorderQty} units`).join('; ') || 'None'})

9. RETURNS & DEFECT ANALYTICS:
- Total Return Tickets: ${returns.length}
- Return Rate: ${returnRatePct}%
- Total Refunded: ${currSym}${Math.round(totalRefundedAmount).toLocaleString()}
- Return Reasons: ${returns.slice(0, 5).map(r => `${r.productName}: ${r.reason}`).join('; ') || 'No return issues'}
`;
  }

  // 3. System Prompt Construction
  const systemPrompt = `
You are "AnalyzeUp AI Business Copilot", the premier autonomous executive AI consultant and decision intelligence agent for "${businessProfile?.businessName || 'the business'}" in the ${industry.label} industry.
Currency: ${currency}.
Workspace Status: ${hasData ? 'Active business data loaded with full catalog, sales, suppliers, customer RFM, and forecasting telemetry.' : 'Fresh workspace awaiting initial data upload'}.

${hasData ? comprehensiveDataBlock : `
=== 🚀 FRESH WORKSPACE ONBOARDING & CSV SPECIFICATION ===
The workspace is currently clean and awaiting the user's data upload.
You have full mastery over AnalyzeUp's unified 22-column Universal Database Schema:

CANONICAL 22-COLUMN DATABASE SCHEMA:
1. Invoice No (e.g., INV-2026-001)
2. Order ID (e.g., ORD-9812)
3. Order Date (e.g., 2026-08-25)
4. Customer ID (e.g., CUST-104)
5. Customer Name (e.g., Rajesh Sharma)
6. SKU (e.g., SKU-TSHIRT-001)
7. Item Name (e.g., Classic Cotton Crewneck)
8. Category (e.g., Apparel)
9. Supplier ID (e.g., SUP-TEX-01)
10. Supplier Name (e.g., Zenith Textiles)
11. Qty Sold (e.g., 4)
12. Purchase Price / Unit Cost (e.g., 250)
13. Retail Price / Selling Price (e.g., 799)
14. Discount (e.g., 50)
15. Tax (e.g., 18)
16. Current Stock (e.g., 85)
17. Reorder Level (e.g., 20)
18. Safety Stock (e.g., 10)
19. Lead Time Days (e.g., 7)
20. Payment Mode (e.g., UPI / Credit Card / Cash)
21. Order Status (e.g., Delivered / Processing)
22. Warehouse (e.g., Central Hub - Mumbai)

KEY ONBOARDING CAPABILITIES TO EXPLAIN:
- AI Universal Data Mapper: Users don't need to reformat anything. Our AI automatically recognizes any custom headers (like "Item_Qty", "SellingPrice", "Vendor", "StockQty") and maps them to canonical fields.
- Direct Template Download: Users can download the official 22-column sample CSV template from the Connect or Import wizard.
- Connect Channels: Supports CSV/Excel drag & drop, Google Drive automatic hourly/daily background sync, and live Shopify store integration.
- Data Privacy & Security: All business metrics, pricing, margins, and customer data remain strictly isolated, encrypted, and private to the workspace.
`}

CURRENT QUERY CONTEXT & COMPUTED COPILOT INTENT:
- Query Intent: ${copilotRes.intentLabel}
- What Happened: ${copilotRes.what}
- Why It Happened: ${copilotRes.why}
- Recommended Action: ${copilotRes.actionText}
- Supporting Metrics: ${copilotRes.supportingData.map(d => `${d.label}: ${d.value}`).join(' | ') || 'N/A'}

GUIDELINES FOR YOUR RESPONSES:
1. You have complete 360-degree access to all products, SKUs, inventory levels, sales orders, profit margins, supplier ratings, lead times, customer RFM cohorts, and demand forecasts.
2. Directly, accurately, and authoritatively answer the user's specific questions using the exact data provided above.
3. If the user asks for calculations, counts, rankings, product lookups, supplier comparisons, or root causes, calculate and present the answer clearly using rich Markdown formatting (bullet points, bold highlights, tables, and metric pills).
4. If real business data is present, you may structure analytical diagnostic responses using:
   ### ${copilotRes.intentLabel.toUpperCase()}
   - **WHAT:** Clear summary of the fact, metric, or event.
   - **WHY:** Data-driven root cause explanation with supporting figures.
   - **RECOMMENDED ACTION:** Concrete, actionable next steps with expected financial or operational benefit.
5. If the user asks general, conversational, onboarding, or exploratory questions, provide friendly, intelligent, and insightful responses tailored to their exact query.
6. Always ground numbers strictly in the provided workspace data. Never fabricate numbers.
`;

  try {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: formattedMessages as any,
      temperature: 0.2,
    });

    const reply = response.choices[0].message.content || copilotRes.answerMarkdown;
    return reply;
  } catch (error) {
    console.error('OpenAI API call error, falling back to deterministic Copilot response:', error);
    return copilotRes.answerMarkdown;
  }
}
