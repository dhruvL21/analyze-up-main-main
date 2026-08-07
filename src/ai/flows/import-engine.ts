'use server';

import { openai } from '@/ai/openai';
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
  const h = header.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();

  for (const field of targetFields) {
    if (field.key === 'skip') continue;
    const labelLower = field.label.toLowerCase();
    const keyLower = field.key.toLowerCase();

    if (h === keyLower || h === labelLower) return field.key;

    // Common synonyms
    if (field.key === 'orderNumber' && (h.includes('invoice') || h.includes('order no') || h.includes('bill no'))) return 'orderNumber';
    if (field.key === 'productName' && (h.includes('item name') || h.includes('product') || h.includes('item title'))) return 'productName';
    if (field.key === 'name' && (h.includes('item name') || h.includes('product name') || h.includes('title'))) return 'name';
    if (field.key === 'sellingPrice' && (h.includes('retail') || h.includes('selling') || h.includes('mrp') || h.includes('sale price'))) return 'sellingPrice';
    if (field.key === 'price' && (h.includes('retail') || h.includes('selling') || h.includes('mrp') || h.includes('price'))) return 'price';
    if (field.key === 'costPrice' && (h.includes('purchase') || h.includes('cost') || h.includes('buy price'))) return 'costPrice';
    if (field.key === 'unitCost' && (h.includes('purchase') || h.includes('cost') || h.includes('unit cost'))) return 'unitCost';
    if (field.key === 'quantity' && (h.includes('qty') || h.includes('quantity') || h.includes('units') || h.includes('qty sold'))) return 'quantity';
    if (field.key === 'stock' && (h.includes('stock') || h.includes('quantity') || h.includes('qty'))) return 'stock';
    if (field.key === 'supplier' && (h.includes('supplier') || h.includes('vendor') || h.includes('wholesaler'))) return 'supplier';
    if (field.key === 'supplierName' && (h.includes('supplier') || h.includes('vendor'))) return 'supplierName';
    if (field.key === 'customerName' && (h.includes('customer') || h.includes('buyer'))) return 'customerName';
    if (field.key === 'sku' && (h.includes('sku') || h.includes('code') || h.includes('barcode'))) return 'sku';
    if (field.key === 'category' && (h.includes('category') || h.includes('department'))) return 'category';
  }

  return 'skip';
}
