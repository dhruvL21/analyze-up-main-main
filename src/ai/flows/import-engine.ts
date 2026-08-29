import { openai, isOpenAIConfigured } from '@/ai/openai';
import {
  BusinessFileType,
  FILE_TYPE_DEFINITIONS,
  FieldMapping,
  TargetFieldDef,
} from './import-mapper-constants';

export interface DetectionResult {
  fileType: BusinessFileType;
  fileTypeName: string;
  confidence: number; // 0 - 100
  reasoning: string;
  isAiPowered: boolean;
}

/**
 * Stage 1: AI File Type Detection
 */
export async function detectBusinessFileType(
  externalHeaders: string[],
  sampleRows: Record<string, any>[] = []
): Promise<DetectionResult> {
  if (!isOpenAIConfigured()) {
    return heuristicDetectFileType(externalHeaders);
  }
  const sampleSnippet = sampleRows.slice(0, 3).map(row => {
    const cleaned: Record<string, any> = {};
    externalHeaders.forEach(h => {
      cleaned[h] = row[h];
    });
    return cleaned;
  });

  const prompt = `
You are an expert AI Human Accountant & Chief Data Officer for AnalyzeUp business intelligence software.
Analyze the CSV headers and sample data rows to determine WHAT TYPE of business file this is.

POSSIBLE FILE TYPES:
1. "INVENTORY_MASTER": Product list, master catalog, stock levels, cost & selling prices, SKUs, suppliers.
2. "SALES_REPORT": Invoices, sales transactions, order numbers, customer names, quantity sold, sales revenue, payment methods.
3. "PURCHASE_ORDERS": Supplier purchase orders, expected delivery dates, quantities ordered, unit cost prices, PO status.
4. "SUPPLIER_LIST": Supplier directory, vendor names, contact persons, phone numbers, emails, lead times.
5. "CUSTOMER_LIST": Customer directory, names, emails, phone numbers, cities, loyalty points.
6. "RETURNS_REPORT": Product returns, return tickets, return reasons, disposal actions, refund amounts.
7. "WAREHOUSE_STOCK": Warehouse bin stock counts, physical inventory counts.
8. "UNKNOWN": Unrelated or general file.

CSV HEADERS:
${externalHeaders.join(', ')}

SAMPLE DATA ROWS:
${JSON.stringify(sampleSnippet, null, 2)}

INSTRUCTIONS:
1. Identify the MOST ACCURATE Business File Type.
2. Assign a confidence score from 50 to 99 (e.g. 98).
3. Provide a short 1-sentence reasoning in plain English for a business owner (e.g. "Contains Invoice Numbers, Customer Names, and Quantities Sold").

EXAMPLE RESPONSE FORMAT:
{
  "fileType": "SALES_REPORT",
  "confidence": 98,
  "reasoning": "Detected invoice numbers, customer names, quantity sold, and payment methods characteristic of a sales report."
}

Respond ONLY with valid JSON.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an intelligent business file classifier.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty AI response');

    const parsed = JSON.parse(content);
    const rawType = (parsed.fileType || 'UNKNOWN').toUpperCase() as BusinessFileType;
    const fileType = FILE_TYPE_DEFINITIONS[rawType] ? rawType : 'INVENTORY_MASTER';
    const confidence = Math.min(99, Math.max(50, Number(parsed.confidence) || 90));
    const reasoning = parsed.reasoning || `Detected ${FILE_TYPE_DEFINITIONS[fileType].name} based on header patterns.`;

    return {
      fileType,
      fileTypeName: FILE_TYPE_DEFINITIONS[fileType].name,
      confidence,
      reasoning,
      isAiPowered: true,
    };
  } catch (error) {
    console.warn('AI File Type Detection Fallback to Heuristics:', error);
    // Rule Engine Fallback
    return heuristicDetectFileType(externalHeaders);
  }
}

function heuristicDetectFileType(headers: string[]): DetectionResult {
  const hCombined = headers.join(' ').toLowerCase();

  if (
    hCombined.includes('invoice') ||
    hCombined.includes('order no') ||
    hCombined.includes('qty sold') ||
    hCombined.includes('customer name') ||
    hCombined.includes('payment')
  ) {
    return {
      fileType: 'SALES_REPORT',
      fileTypeName: FILE_TYPE_DEFINITIONS.SALES_REPORT.name,
      confidence: 95,
      reasoning: 'Recognized invoice numbers, order dates, and quantity sold columns.',
      isAiPowered: false,
    };
  }

  if (
    hCombined.includes('po number') ||
    hCombined.includes('po no') ||
    hCombined.includes('expected date') ||
    hCombined.includes('quantity ordered')
  ) {
    return {
      fileType: 'PURCHASE_ORDERS',
      fileTypeName: FILE_TYPE_DEFINITIONS.PURCHASE_ORDERS.name,
      confidence: 94,
      reasoning: 'Recognized purchase order references and supplier fulfillment columns.',
      isAiPowered: false,
    };
  }

  if (
    hCombined.includes('return reason') ||
    hCombined.includes('refund') ||
    hCombined.includes('action taken') ||
    hCombined.includes('return id')
  ) {
    return {
      fileType: 'RETURNS_REPORT',
      fileTypeName: FILE_TYPE_DEFINITIONS.RETURNS_REPORT.name,
      confidence: 93,
      reasoning: 'Recognized return reasons, refund amounts, and restock actions.',
      isAiPowered: false,
    };
  }

  if (
    hCombined.includes('supplier name') &&
    (hCombined.includes('contact') || hCombined.includes('lead time')) &&
    !hCombined.includes('price')
  ) {
    return {
      fileType: 'SUPPLIER_LIST',
      fileTypeName: FILE_TYPE_DEFINITIONS.SUPPLIER_LIST.name,
      confidence: 92,
      reasoning: 'Recognized vendor contact directory and lead-time fields.',
      isAiPowered: false,
    };
  }

  return {
    fileType: 'INVENTORY_MASTER',
    fileTypeName: FILE_TYPE_DEFINITIONS.INVENTORY_MASTER.name,
    confidence: 88,
    reasoning: 'Recognized product catalog, stock levels, and price fields.',
    isAiPowered: false,
  };
}

/**
 * Stage 2 & 3: Smart Semantic Mapping tailored to Detected File Type
 */
export async function getSmartMappingForFileType(
  fileType: BusinessFileType,
  externalHeaders: string[],
  sampleRows: Record<string, any>[] = []
): Promise<{ mapping: FieldMapping; confidence: Record<string, number>; isAiPowered: boolean }> {
  const targetFields = FILE_TYPE_DEFINITIONS[fileType]?.fields || FILE_TYPE_DEFINITIONS.INVENTORY_MASTER.fields;
  const targetFieldKeys = targetFields.map(f => f.key);

  if (!isOpenAIConfigured()) {
    const mapping: FieldMapping = {};
    const confidence: Record<string, number> = {};
    externalHeaders.forEach(h => {
      const fuzzy = getFuzzyMatchForFileType(h, targetFields);
      mapping[h] = fuzzy;
      confidence[h] = fuzzy !== 'skip' ? 92 : 60;
    });
    return { mapping, confidence, isAiPowered: false };
  }

  const sampleSnippet = sampleRows.slice(0, 3).map(row => {
    const cleaned: Record<string, any> = {};
    externalHeaders.forEach(h => {
      cleaned[h] = row[h];
    });
    return cleaned;
  });

  const prompt = `
You are an expert AI Data Mapping Engineer for AnalyzeUp.
Map external CSV columns to our internal target fields for a "${FILE_TYPE_DEFINITIONS[fileType].name}".

TARGET SCHEMA FIELDS FOR THIS FILE TYPE:
${targetFields.map(f => `- "${f.key}": ${f.label} (${f.description}) ${f.required ? '[REQUIRED]' : ''}`).join('\n')}

EXTERNAL CSV HEADERS:
${externalHeaders.join(', ')}

SAMPLE DATA:
${JSON.stringify(sampleSnippet, null, 2)}

INSTRUCTIONS:
1. Map each external header to the MOST RELEVANT target field key listed above.
2. If a column is irrelevant for this file type, map it to "skip".
3. Provide confidence score (0.0 to 1.0) per column.

Respond ONLY with valid JSON.
{
  "mappings": { "CSV_Header": "target_key" },
  "confidence": { "CSV_Header": 0.95 }
}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an intelligent semantic data mapper.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty AI response');

    const parsed = JSON.parse(content);
    const aiMap = parsed.mappings || {};
    const aiConf = parsed.confidence || {};

    const mapping: FieldMapping = {};
    const confidence: Record<string, number> = {};

    externalHeaders.forEach(h => {
      const target = aiMap[h];
      if (target && targetFieldKeys.includes(target)) {
        mapping[h] = target;
        confidence[h] = Math.round((aiConf[h] || 0.92) * 100);
      } else {
        const fuzzy = getFuzzyMatchForFileType(h, targetFields);
        mapping[h] = fuzzy;
        confidence[h] = fuzzy !== 'skip' ? 88 : 50;
      }
    });

    return { mapping, confidence, isAiPowered: true };
  } catch (error) {
    console.warn('AI Semantic Mapping Fallback:', error);
    const mapping: FieldMapping = {};
    const confidence: Record<string, number> = {};

    externalHeaders.forEach(h => {
      const fuzzy = getFuzzyMatchForFileType(h, targetFields);
      mapping[h] = fuzzy;
      confidence[h] = fuzzy !== 'skip' ? 90 : 60;
    });

    return { mapping, confidence, isAiPowered: false };
  }
}

function getFuzzyMatchForFileType(header: string, targetFields: TargetFieldDef[]): string {
  const h = header.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  for (const field of targetFields) {
    if (field.key === 'skip') continue;
    const labelLower = field.label.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const keyLower = field.key.toLowerCase();

    if (h === keyLower || h === labelLower) return field.key;

    // 1. Order Identification & Dates
    if (field.key === 'orderId' && (h === 'order id' || h.includes('order id') || h.includes('order ref') || h.includes('order identifier'))) return 'orderId';
    if (field.key === 'orderNumber' && (h.includes('invoice') || h.includes('order no') || h.includes('order id') || h.includes('order number') || h.includes('bill no') || h.includes('bill') || h.includes('receipt') || h.includes('inv no') || h.includes('transaction id'))) return 'orderNumber';
    if (field.key === 'orderDate' && (h.includes('order date') || h.includes('invoice date') || h.includes('sale date') || h.includes('bill date') || h.includes('date') || h.includes('timestamp') || h.includes('created at'))) return 'orderDate';
    if (field.key === 'expectedDate' && (h.includes('expected') || h.includes('delivery date') || h.includes('arrival'))) return 'expectedDate';

    // 2. Customers & Locations
    if (field.key === 'customerId' && (h === 'customer id' || h.includes('customer id') || h.includes('client id') || h.includes('cust id') || h.includes('buyer id'))) return 'customerId';
    if (field.key === 'customerName' && (h.includes('customer name') || h.includes('customer') || h.includes('buyer') || h.includes('client') || h.includes('bill to') || h.includes('sold to') || h.includes('account name'))) return 'customerName';
    if (field.key === 'city' && (h === 'city' || h.includes('warehouse') || h.includes('city') || h.includes('location') || h.includes('region') || h.includes('destination') || h.includes('town') || h.includes('place') || h.includes('facility') || h.includes('hub') || h.includes('state'))) return 'city';
    if (field.key === 'address' && (h.includes('address') || h.includes('street') || h.includes('shipping address'))) return 'address';

    // 3. Products & Items
    if (field.key === 'productName' && (h === 'item name' || h.includes('item name') || h.includes('product name') || h.includes('item title') || h.includes('product') || h.includes('item') || h.includes('article') || h.includes('description'))) return 'productName';
    if (field.key === 'name' && (h === 'item name' || h.includes('item name') || h.includes('product name') || h.includes('title') || h.includes('product') || h.includes('item') || h.includes('article') || h.includes('part name'))) return 'name';
    if (field.key === 'sku' && (h === 'sku' || h.includes('sku') || h.includes('barcode') || h.includes('item code') || h.includes('product code') || h.includes('article no') || h.includes('code') || h.includes('upc') || h.includes('ean'))) return 'sku';
    if (field.key === 'category' && (h.includes('category') || h.includes('department') || h.includes('dept') || h.includes('group') || h.includes('type') || h.includes('segment') || h.includes('collection'))) return 'category';
    if (field.key === 'brand' && (h.includes('brand') || h.includes('maker') || h.includes('label'))) return 'brand';

    // 4. Quantities & Inventory
    if (field.key === 'quantity' && (h.includes('qty') || h.includes('quantity') || h.includes('units sold') || h.includes('units') || h.includes('qty sold') || h.includes('volume') || h.includes('pieces') || h.includes('count'))) return 'quantity';
    if (field.key === 'stock' && (h === 'current stock' || h.includes('current stock') || h.includes('stock') || h.includes('inventory') || h.includes('available') || h.includes('on hand') || h.includes('units on hand'))) return 'stock';
    if (field.key === 'safetyStock' && (h === 'safety stock' || h.includes('safety stock') || h.includes('buffer stock'))) return 'safetyStock';
    if (field.key === 'minStock' && (h.includes('reorder level') || h.includes('reorder point') || h.includes('min stock') || h.includes('safety stock') || h.includes('threshold') || h.includes('minimum'))) return 'minStock';
    if (field.key === 'leadTimeDays' && (h.includes('lead time') || h.includes('lead days') || h.includes('delivery days') || h.includes('procurement days'))) return 'leadTimeDays';
    if (field.key === 'unit' && (h.includes('unit') || h.includes('uom') || h.includes('measure') || h.includes('pack'))) return 'unit';

    // 5. Pricing & Financials
    if (field.key === 'sellingPrice' && (h.includes('retail price') || h.includes('selling price') || h.includes('retail') || h.includes('selling') || h.includes('mrp') || h.includes('sale price') || h.includes('unit price') || h.includes('price') || h.includes('rate') || h.includes('amount'))) return 'sellingPrice';
    if (field.key === 'price' && (h.includes('retail price') || h.includes('selling price') || h.includes('retail') || h.includes('selling') || h.includes('mrp') || h.includes('price') || h.includes('rate'))) return 'price';
    if (field.key === 'costPrice' && (h.includes('purchase price') || h.includes('cost price') || h.includes('purchase') || h.includes('cost') || h.includes('buy price') || h.includes('buying price') || h.includes('unit cost') || h.includes('cogs'))) return 'costPrice';
    if (field.key === 'unitCost' && (h.includes('purchase') || h.includes('cost') || h.includes('unit cost') || h.includes('buy price'))) return 'unitCost';
    if (field.key === 'discount' && (h.includes('discount') || h.includes('disc') || h.includes('offer') || h.includes('rebate') || h.includes('markdown'))) return 'discount';
    if (field.key === 'tax' && (h.includes('tax') || h.includes('gst') || h.includes('vat') || h.includes('duty') || h.includes('cess'))) return 'tax';
    if (field.key === 'paymentMode' && (h.includes('payment') || h.includes('pay mode') || h.includes('payment method') || h.includes('mode of payment') || h.includes('tender') || h.includes('gateway'))) return 'paymentMode';

    // 6. Status, Suppliers & Remarks
    if (field.key === 'supplierId' && (h === 'supplier id' || h.includes('supplier id') || h.includes('vendor id') || h.includes('supplier code') || h.includes('sup id'))) return 'supplierId';
    if (field.key === 'supplier' && (h.includes('supplier') || h.includes('vendor') || h.includes('wholesaler') || h.includes('distributor') || h.includes('manufacturer') || h.includes('source'))) return 'supplier';
    if (field.key === 'supplierName' && (h.includes('supplier') || h.includes('vendor') || h.includes('distributor') || h.includes('manufacturer'))) return 'supplierName';
    if (field.key === 'status' && (h.includes('order status') || h.includes('item status') || h.includes('status') || h.includes('state') || h.includes('delivery status') || h.includes('fulfillment') || h.includes('condition'))) return 'status';
    if (field.key === 'remarks' && (h.includes('remark') || h.includes('remarks') || h.includes('note') || h.includes('notes') || h.includes('comment') || h.includes('comments') || h.includes('feedback') || h.includes('memo') || h.includes('instruction'))) return 'remarks';
    if (field.key === 'email' && (h.includes('email') || h.includes('mail'))) return 'email';
    if (field.key === 'phone' && (h.includes('phone') || h.includes('mobile') || h.includes('contact no') || h.includes('tel'))) return 'phone';
  }

  return 'skip';
}
