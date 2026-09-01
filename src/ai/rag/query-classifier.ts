import type { QueryIntent } from './types';

/**
 * Classifies a user query into one of the core business intents.
 * Uses pattern matching and keyword heuristics for instant, deterministic routing.
 */
export function classifyQueryIntent(query: string): QueryIntent {
  const normalized = query.toLowerCase().trim();

  // 0. Operational Focus, Daily Action Plans, and Strategic Priorities
  if (
    /\b(focus\s+on\s+today|what\s+should\s+i\s+(focus|do)\b|top\s+priorit(y|ies)|priorit(y|ies)|action\s+plan|plan\s+for\s+(sales|today|tomorrow|week|month)|next\s+\d+\s+day\s+plan)\b/i.test(
      normalized
    )
  ) {
    return 'OPERATIONAL_FOCUS';
  }

  // 1. Specific SKU / Product lookup patterns
  if (
    /\bsku[\s\-:]*([a-z0-9_\-]+)/i.test(normalized) ||
    /^(price|stock|cost|margin)\s+(of|for)\s+/i.test(normalized) ||
    /\b(search|find|lookup|details\s+for)\s+(product|item|sku)\b/i.test(normalized)
  ) {
    return 'PRODUCT_LOOKUP';
  }

  // 2. Customer & Average Order Value questions (checked before generic order words)
  if (
    /\b(customer|buyer|client|aov|average\s+order\s+value|repeat\s+rate|retention|ltv)\b/i.test(normalized) ||
    /\bwho\s+(are|is)\s+(our\s+top|the\s+best)\s+customer\b/i.test(normalized)
  ) {
    return 'CUSTOMER_ANALYSIS';
  }

  // 3. Specific Order / Transaction lookup
  if (
    /\b(order|invoice|tx|transaction|receipt)[\s#\-:]+([0-9a-z_\-]{2,})/i.test(normalized) ||
    /\b(where\s+is|status\s+of)\s+(order|invoice|tx|package)\b/i.test(normalized) ||
    /\border\s+status\b/i.test(normalized)
  ) {
    return 'ORDER_LOOKUP';
  }

  // 4. Inventory & Dead Stock questions
  if (
    /\bdead\s*stock\b/i.test(normalized) ||
    /\b(out\s+of\s+stock|low\s+stock|re-?order(ed|ing|s)?|stockout|safety\s+stock|inventory\s+level)\b/i.test(
      normalized
    ) ||
    /\bwhich\s+products\s+(are|have)\s+(dead|low|running\s+out|slow)\b/i.test(normalized) ||
    /\bholding\s+cost|tied\s+up\s+in\s+stock|excess\s+inventory\b/i.test(normalized)
  ) {
    return 'INVENTORY';
  }

  // 5. Supplier & Procurement questions
  if (
    /\b(supplier|vendor|distributor|procurement|lead\s+time|purchase\s+order)\b/i.test(normalized) ||
    /\bwhich\s+supplier\s+is\s+best\b/i.test(normalized)
  ) {
    return 'SUPPLIER_ANALYSIS';
  }

  // 6. Trend & Growth questions
  if (
    /\b(trend|growth|increasing|decreasing|compared\s+to|forecast|projection|seasonal)\b/i.test(normalized) ||
    /\bare\s+sales\s+(growing|dropping|falling|up|down)\b/i.test(normalized)
  ) {
    return 'TREND_ANALYSIS';
  }

  // 7. High-level Financial & Gross Margin analytics
  if (
    /\b(gross\s+profit|net\s+profit|profit\s+margin|cogs|cost\s+of\s+goods|financial|ebitda|margin\s+drop)\b/i.test(
      normalized
    ) ||
    /\bhow\s+profitable\b/i.test(normalized)
  ) {
    return 'FINANCIAL_ANALYTICS';
  }

  // 8. Sales & Revenue questions
  if (
    /\b(revenue|total\s+sales|sales\s+last\s+month|top\s+selling|best\s+selling|highest\s+revenue|units\s+sold)\b/i.test(
      normalized
    ) ||
    /\bwhich\s+category\s+(generated|sold|made)\s+the\s+most\b/i.test(normalized)
  ) {
    return 'SALES_ANALYTICS';
  }

  // 9. Qualitative & Customer Feedback / Review questions
  if (
    /\b(why|feedback|review|unhappy|complain|reason|issue|problem|satisfaction)\b/i.test(normalized) ||
    /\bwhat\s+problems\s+are\s+customers\b/i.test(normalized)
  ) {
    return 'QUALITATIVE_SEARCH';
  }

  return 'GENERAL_BUSINESS';
}
