import type { QueryIntent } from './types';

/**
 * Classifies a user query into one of the core business intents:
 * - Conversational & Direct LLM: GREETING, CAPABILITIES, CONVERSATIONAL, GENERAL_KNOWLEDGE
 * - Grounded Vector Store & Analytics: OPERATIONAL_FOCUS, PRODUCT_LOOKUP, ORDER_LOOKUP,
 *   INVENTORY, SUPPLIER_ANALYSIS, TREND_ANALYSIS, FINANCIAL_ANALYTICS, SALES_ANALYTICS,
 *   CUSTOMER_ANALYSIS, QUALITATIVE_SEARCH, GENERAL_BUSINESS
 */
export function classifyQueryIntent(query: string): QueryIntent {
  const normalized = query.toLowerCase().trim();

  // 1. Greetings & Salutations (Direct LLM)
  if (
    /^(hello|hi|hey|howdy|hola|greetings|good\s+(morning|afternoon|evening|day)|hi\s+there|hello\s+there|hey\s+there|what'?s\s+up|sup|namaste|yo)[\s!.,?]*$/i.test(
      normalized
    ) ||
    /^(hello|hi|hey)\s+(analyzeup|copilot|assistant|ai|bot)[\s!.,?]*$/i.test(normalized)
  ) {
    return 'GREETING';
  }

  // 2. Identity, Help, and Bot Capabilities (Direct LLM)
  if (
    /\b(what\s+can\s+you\s+do|who\s+are\s+you|what\s+are\s+you|how\s+can\s+you\s+help|what\s+are\s+your\s+(features|capabilities)|how\s+do\s+(i|you)\s+work|what\s+is\s+analyzeup|tell\s+me\s+about\s+yourself|help\s+me\s+get\s+started|what\s+should\s+i\s+ask)\b/i.test(
      normalized
    ) ||
    /^(help|features|guide|capabilities|commands|menu|what\s+to\s+do)[\s!?.]*$/i.test(normalized)
  ) {
    return 'CAPABILITIES';
  }

  // 3. Conversational Pleasantries & Closures (Direct LLM)
  if (
    /^(thank\s*you|thanks|thx|ok|okay|bye|goodbye|see\s+you|cya|great|awesome|perfect|cool|nice|sounds\s+good|got\s+it|understood)[\s!.,?]*$/i.test(
      normalized
    ) ||
    /\b(thank\s+you\s+so\s+much|thanks\s+a\s+lot|have\s+a\s+(good|great|nice)\s+day)\b/i.test(normalized)
  ) {
    return 'CONVERSATIONAL';
  }

  // 4. Writing, Drafting, and Content Generation Assistance (Direct LLM)
  if (
    /\b(write|draft|compose|create|generate)\s+(an?\s+)?(email|letter|message|template|policy|script|description|copy)\b/i.test(
      normalized
    ) ||
    /^(write|draft|compose)\b/i.test(normalized)
  ) {
    return 'GENERAL_KNOWLEDGE';
  }

  // 5. Operational Focus, Daily Action Plans, and Strategic Priorities
  if (
    /\b(focus\s+on\s+today|what\s+should\s+i\s+(focus|do)\b|top\s+priorit(y|ies)|priorit(y|ies)|action\s+plan|plan\s+for\s+(sales|today|tomorrow|week|month)|next\s+\d+\s+day\s+plan)\b/i.test(
      normalized
    )
  ) {
    return 'OPERATIONAL_FOCUS';
  }

  // 5. Specific SKU / Product lookup patterns
  if (
    /\bsku[\s\-:]*([a-z0-9_\-]+)/i.test(normalized) ||
    /^(price|stock|cost|margin)\s+(of|for)\s+/i.test(normalized) ||
    /\b(search|find|lookup|details\s+for)\s+(product|item|sku)\b/i.test(normalized)
  ) {
    return 'PRODUCT_LOOKUP';
  }

  // 6. Customer & Average Order Value questions (checked before generic order words)
  if (
    /\b(customer|buyer|client|aov|average\s+order\s+value|repeat\s+rate|retention|ltv)\b/i.test(normalized) ||
    /\bwho\s+(are|is)\s+(our\s+top|the\s+best)\s+customer\b/i.test(normalized)
  ) {
    return 'CUSTOMER_ANALYSIS';
  }

  // 7. Specific Order / Transaction lookup
  if (
    /\b(order|invoice|tx|transaction|receipt)[\s#\-:]+([0-9a-z_\-]{2,})/i.test(normalized) ||
    /\b(where\s+is|status\s+of)\s+(order|invoice|tx|package)\b/i.test(normalized) ||
    /\border\s+status\b/i.test(normalized)
  ) {
    return 'ORDER_LOOKUP';
  }

  // 8. Inventory & Dead Stock questions
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

  // 9. Supplier & Procurement questions
  if (
    /\b(supplier|vendor|distributor|procurement|lead\s+time|purchase\s+order)\b/i.test(normalized) ||
    /\bwhich\s+supplier\s+is\s+best\b/i.test(normalized)
  ) {
    return 'SUPPLIER_ANALYSIS';
  }

  // 10. Trend & Growth questions
  if (
    /\b(trend|growth|increasing|decreasing|compared\s+to|forecast|projection|seasonal)\b/i.test(normalized) ||
    /\bare\s+sales\s+(growing|dropping|falling|up|down)\b/i.test(normalized)
  ) {
    return 'TREND_ANALYSIS';
  }

  // 11. High-level Financial & Gross Margin analytics
  if (
    /\b(gross\s+profit|net\s+profit|profit\s+margin|cogs|cost\s+of\s+goods|financial|ebitda|margin\s+drop)\b/i.test(
      normalized
    ) ||
    /\bhow\s+profitable\b/i.test(normalized)
  ) {
    return 'FINANCIAL_ANALYTICS';
  }

  // 12. Sales & Revenue questions
  if (
    /\b(revenue|total\s+sales|sales\s+last\s+month|top\s+selling|best\s+selling|highest\s+revenue|units\s+sold)\b/i.test(
      normalized
    ) ||
    /\bwhich\s+category\s+(generated|sold|made)\s+the\s+most\b/i.test(normalized)
  ) {
    return 'SALES_ANALYTICS';
  }

  // 13. Qualitative & Customer Feedback / Review questions
  if (
    /\b(why|feedback|review|unhappy|complain|reason|issue|problem|satisfaction)\b/i.test(normalized) ||
    /\bwhat\s+problems\s+are\s+customers\b/i.test(normalized)
  ) {
    return 'QUALITATIVE_SEARCH';
  }

  // 14. Contextual Check: Does the query refer to our private store/workspace data?
  const hasStoreContext = /\b(our|my|we|us|this\s+store|this\s+shop|this\s+business|my\s+store|my\s+business|my\s+shop|current\s+data|uploaded\s+data|our\s+data|in\s+stock|available\s+stock|catalog|inventory|products|orders|sales|transactions|suppliers)\b/i.test(
    normalized
  );

  if (hasStoreContext) {
    return 'GENERAL_BUSINESS';
  }

  // 15. Outside dataset / General Knowledge questions (Direct LLM)
  return 'GENERAL_KNOWLEDGE';
}
