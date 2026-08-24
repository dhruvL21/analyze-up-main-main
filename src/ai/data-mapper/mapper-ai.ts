/**
 * MODEL 1 — Universal Data Mapping & Normalization AI
 * 
 * Inspects source columns and sample data rows, semantically maps them to the
 * canonical AnalyzeUp schema (analyzeup_v1), scores confidence per field,
 * flags low-confidence mappings, and determines if user confirmation is required.
 */
import { openai } from '@/ai/openai';
import { Model1MappingResult, Model1MappingResultSchema } from '@/schemas/mapping-contract';

// Target canonical schema field definitions
const CANONICAL_PRODUCT_FIELDS = [
  { key: 'name', label: 'Product Name / Title', required: true, aliases: ['item name', 'product name', 'product', 'title', 'item', 'description', 'part name', 'article', 'product_name'] },
  { key: 'sku', label: 'SKU / Item Code / Barcode', required: false, aliases: ['sku', 'item code', 'product code', 'barcode', 'item no', 'article no', 'part no', 'upc', 'ean'] },
  { key: 'price', label: 'Selling Price / Retail Price (₹)', required: true, aliases: ['selling price', 'retail price', 'price', 'mrp', 'sale price', 'unit price', 'rate'] },
  { key: 'costPrice', label: 'Cost Price / Purchase Price (₹)', required: false, aliases: ['purchase price', 'cost price', 'cost', 'buying price', 'unit cost', 'cogs', 'buy price'] },
  { key: 'stock', label: 'Current Stock / Inventory Qty', required: true, aliases: ['stock', 'inventory', 'quantity', 'qty', 'units available', 'available stock', 'on hand', 'stock level', 'units'] },
  { key: 'category', label: 'Category / Department', required: false, aliases: ['category', 'department', 'type', 'group', 'product type', 'classification', 'collection', 'dept'] },
  { key: 'minStock', label: 'Minimum Stock / Reorder Point', required: false, aliases: ['min stock', 'minimum stock', 'reorder level', 'reorder point', 'safety stock', 'threshold'] },
  { key: 'maxStock', label: 'Maximum Stock Capacity', required: false, aliases: ['max stock', 'maximum stock', 'capacity', 'upper limit'] },
  { key: 'supplier', label: 'Supplier / Vendor Name', required: false, aliases: ['supplier', 'vendor', 'manufacturer', 'distributor', 'source', 'supplier name'] },
  { key: 'leadTimeDays', label: 'Supplier Lead Time (Days)', required: false, aliases: ['lead time', 'delivery days', 'procurement time', 'lead days'] },
  { key: 'unit', label: 'Unit of Measure', required: false, aliases: ['unit', 'uom', 'pack', 'measure'] },
  { key: 'brand', label: 'Brand Name', required: false, aliases: ['brand', 'maker', 'label'] },
  { key: 'city', label: 'Warehouse / Branch City', required: false, aliases: ['city', 'location', 'region', 'warehouse city', 'destination', 'place'] },
  { key: 'status', label: 'Product Status', required: false, aliases: ['status', 'item status', 'condition', 'state'] },
  { key: 'remarks', label: 'Remarks / Notes', required: false, aliases: ['remarks', 'remark', 'notes', 'note', 'comment', 'comments', 'feedback'] },
  { key: 'description', label: 'Product Description', required: false, aliases: ['description', 'details', 'specs', 'notes'] },
];

const CANONICAL_SALES_FIELDS = [
  { key: 'product_name', label: 'Product Name Sold', required: true, aliases: ['item name', 'product name', 'product', 'item', 'item title', 'article', 'description'] },
  { key: 'sku', label: 'SKU / Barcode', required: false, aliases: ['sku', 'item code', 'barcode', 'product code', 'article no'] },
  { key: 'units_sold', label: 'Units Sold / Quantity', required: true, aliases: ['quantity', 'units sold', 'qty', 'quantity sold', 'volume', 'qty sold', 'units', 'pieces', 'count'] },
  { key: 'selling_price', label: 'Unit Selling Price', required: true, aliases: ['retail price', 'selling price', 'price', 'rate', 'unit price', 'mrp', 'sale price'] },
  { key: 'cost_per_unit', label: 'Cost Per Unit', required: false, aliases: ['purchase price', 'cost price', 'cost', 'cost per unit', 'unit cost', 'buy price'] },
  { key: 'revenue', label: 'Total Revenue', required: false, aliases: ['total revenue', 'revenue', 'total price', 'amount', 'total sales', 'line total', 'total'] },
  { key: 'order_number', label: 'Invoice / Order Number', required: false, aliases: ['invoice no', 'invoice', 'order id', 'order no', 'order number', 'bill no', 'receipt', 'bill'] },
  { key: 'customer_name', label: 'Customer Name', required: false, aliases: ['customer name', 'customer', 'client', 'buyer', 'account', 'bill to'] },
  { key: 'city', label: 'Customer / Shipping City', required: false, aliases: ['city', 'location', 'region', 'destination', 'town', 'place', 'state'] },
  { key: 'sale_date', label: 'Sale / Invoice Date', required: false, aliases: ['order date', 'invoice date', 'date', 'sale date', 'bill date', 'timestamp', 'created at'] },
  { key: 'payment_method', label: 'Payment Mode', required: false, aliases: ['payment method', 'payment mode', 'payment', 'pay mode', 'mode of payment', 'gateway'] },
  { key: 'status', label: 'Order Status', required: false, aliases: ['order status', 'status', 'delivery status', 'state', 'fulfillment status'] },
  { key: 'discount', label: 'Discount', required: false, aliases: ['discount', 'disc', 'offer', 'rebate'] },
  { key: 'tax', label: 'Tax Amount', required: false, aliases: ['tax', 'gst', 'vat', 'duty'] },
  { key: 'remarks', label: 'Remarks / Notes', required: false, aliases: ['remarks', 'remark', 'notes', 'note', 'comment', 'comments', 'feedback', 'memo'] },
];

/**
 * Fuzzy heuristic matcher fallback
 */
function fuzzyMatchField(header: string, isSales: boolean): { key: string; confidence: number } {
  const norm = header.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const fields = isSales ? CANONICAL_SALES_FIELDS : CANONICAL_PRODUCT_FIELDS;

  for (const field of fields) {
    for (const alias of field.aliases) {
      if (norm === alias) {
        return { key: field.key, confidence: 95 };
      }
      if (norm.includes(alias) || alias.includes(norm)) {
        return { key: field.key, confidence: 85 };
      }
    }
  }

  return { key: 'skip', confidence: 60 };
}

/**
 * Stage 1: Detect File Type
 */
function detectFileType(headers: string[]): 'INVENTORY_MASTER' | 'SALES_REPORT' | 'PURCHASE_ORDERS' | 'SUPPLIER_LIST' | 'RETURNS_REPORT' | 'UNKNOWN' {
  const h = headers.map(s => s.toLowerCase()).join(' ');

  if (h.includes('invoice') || h.includes('customer') || h.includes('sold') || h.includes('revenue') || h.includes('order date')) {
    return 'SALES_REPORT';
  }
  if (h.includes('return') || h.includes('refund') || h.includes('defective')) {
    return 'RETURNS_REPORT';
  }
  if (h.includes('po number') || h.includes('purchase order') || h.includes('expected delivery')) {
    return 'PURCHASE_ORDERS';
  }
  if (h.includes('vendor') || (h.includes('supplier') && h.includes('phone') && !h.includes('stock'))) {
    return 'SUPPLIER_LIST';
  }
  return 'INVENTORY_MASTER';
}

/**
 * Universal Data Mapper (Model 1 Entry Point)
 */
export async function executeUniversalDataMapping(
  headers: string[],
  sampleRows: Record<string, any>[] = []
): Promise<Model1MappingResult> {
  const detectedFileType = detectFileType(headers);
  const isSales = detectedFileType === 'SALES_REPORT';
  const targetFields = isSales ? CANONICAL_SALES_FIELDS : CANONICAL_PRODUCT_FIELDS;

  const sampleSnippet = sampleRows.slice(0, 4).map(row => {
    const cleaned: Record<string, any> = {};
    headers.forEach(h => {
      cleaned[h] = row[h];
    });
    return cleaned;
  });

  const prompt = `
You are MODEL 1: Universal Data Mapping & Normalization AI for AnalyzeUp business intelligence software.
Your SOLE responsibility is to semantically inspect external tabular columns and map them to the canonical schema.
Do NOT make business forecasts or predictions.

DETECTED FILE TYPE: ${detectedFileType}

TARGET CANONICAL FIELDS:
${targetFields.map(f => `- "${f.key}": ${f.label} (${f.required ? 'REQUIRED' : 'OPTIONAL'})`).join('\n')}
- "skip": Unrelated or redundant column

EXTERNAL COLUMN HEADERS:
${headers.join(', ')}

SAMPLE DATA ROWS:
${JSON.stringify(sampleSnippet, null, 2)}

INSTRUCTIONS:
1. Map EACH external header to the best matching canonical field key, or "skip".
2. Assign a confidence score (0.0 to 1.0) for each column mapping.
3. Identify missing required fields from the target schema.
4. Flag any suspicious, malformed, or ambiguous columns.

EXAMPLE JSON OUTPUT FORMAT:
{
  "mapping": {
    "Item Name": "name",
    "Stock Qty": "stock",
    "Retail Price": "price",
    "Internal ID": "skip"
  },
  "confidence": {
    "Item Name": 0.98,
    "Stock Qty": 0.95,
    "Retail Price": 0.92,
    "Internal ID": 0.99
  },
  "warnings": []
}
`;

  const finalMapping: Record<string, string> = {};
  const finalConfidence: Record<string, number> = {};
  let warnings: string[] = [];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an intelligent data schema mapping agent. Respond strictly with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.0,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');

    const parsed = JSON.parse(content);
    const aiMapping = parsed.mapping || {};
    const aiConf = parsed.confidence || {};
    warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];

    const allowedKeys = new Set([...targetFields.map(f => f.key), 'skip']);

    headers.forEach(h => {
      const mappedKey = aiMapping[h];
      if (mappedKey && allowedKeys.has(mappedKey)) {
        finalMapping[h] = mappedKey;
        finalConfidence[h] = Math.round((Number(aiConf[h]) || 0.9) * 100);
      } else {
        const fallback = fuzzyMatchField(h, isSales);
        finalMapping[h] = fallback.key;
        finalConfidence[h] = fallback.confidence;
      }
    });
  } catch (error) {
    console.warn('Model 1 LLM mapping failed, falling back to deterministic heuristics:', error);
    headers.forEach(h => {
      const fallback = fuzzyMatchField(h, isSales);
      finalMapping[h] = fallback.key;
      finalConfidence[h] = fallback.confidence;
    });
  }

  // Calculate missing required fields
  const mappedTargetKeys = new Set(Object.values(finalMapping));
  const missingFields: string[] = [];
  targetFields.filter(f => f.required).forEach(req => {
    if (!mappedTargetKeys.has(req.key)) {
      missingFields.push(req.label);
    }
  });

  // Calculate low confidence fields
  const lowConfidenceFields: string[] = [];
  Object.entries(finalConfidence).forEach(([col, conf]) => {
    const targetKey = finalMapping[col];
    if (targetKey !== 'skip' && conf < 80) {
      lowConfidenceFields.push(col);
    }
  });

  const mappedConfidences = Object.entries(finalConfidence)
    .filter(([col]) => finalMapping[col] !== 'skip')
    .map(([, conf]) => conf);

  const overallConfidence = mappedConfidences.length > 0
    ? Math.round(mappedConfidences.reduce((a, b) => a + b, 0) / mappedConfidences.length)
    : 85;

  const requiresUserConfirmation = lowConfidenceFields.length > 0 || missingFields.length > 0 || overallConfidence < 80;

  return Model1MappingResultSchema.parse({
    mapping: finalMapping,
    fieldConfidence: finalConfidence,
    overallConfidence,
    detectedFileType,
    warnings,
    missingFields,
    lowConfidenceFields,
    normalizedSchema: 'analyzeup_v1',
    requiresUserConfirmation,
    sourceHeaders: headers,
    sampleRows,
  });
}
