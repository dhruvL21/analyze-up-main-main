import type { BusinessProfile } from '@/lib/types';
import type { AnalyticsResult, SearchResult, QueryIntent, Citation } from './types';

export interface BuiltContext {
  systemPrompt: string;
  userPrompt: string;
  citations: Citation[];
}

/**
 * Builds compact, verified context for the LLM.
 * Strictly guarantees that the LLM is supplied with verified calculations and retrieved source records.
 */
export function buildRAGPromptContext(
  query: string,
  intent: QueryIntent,
  retrievedResults: SearchResult[],
  analytics: AnalyticsResult | null,
  citations: Citation[],
  profile?: BusinessProfile | null
): BuiltContext {
  const currency = '₹';
  const businessName = profile?.businessName || 'Business Workspace';
  const businessType = profile?.businessType || 'Retail & Commerce';

  // 1. Verified Analytics Block
  let analyticsBlock = '';
  if (analytics) {
    analyticsBlock = `
=== 📊 VERIFIED DETERMINISTIC BUSINESS CALCULATIONS (100% Mathematically Exact) ===
Primary Metric: ${analytics.metricName}
Primary Value: ${analytics.formattedValue}
Core Finding: ${analytics.summarySentence}
${
  analytics.breakdown && analytics.breakdown.length > 0
    ? `Detailed Breakdown:\n` +
      analytics.breakdown
        .slice(0, 10)
        .map((b, i) => `  ${i + 1}. ${b.label}: ${b.formatted}`)
        .join('\n')
    : ''
}
`;
  }

  // 2. Retrieved Semantic Source Documents Block
  const docsBlock =
    retrievedResults.length > 0
      ? `
=== 🗂️ RETRIEVED SEMANTIC BUSINESS RECORDS (Top Relevant Context) ===
${retrievedResults
  .map((r, i) => {
    const doc = r.document;
    return `[Record #${i + 1} | Type: ${doc.sourceType.toUpperCase()} | ID: ${doc.sourceRecordId}]
${doc.text}`;
  })
  .join('\n\n')}
`
      : 'No direct semantic vector documents matched.';

  // 3. System Prompt with STRICT Structured Output Formatting Rules
  const systemPrompt = `You are the AnalyzeUp AI Senior Business Intelligence Copilot for "${businessName}" (${businessType}).
You provide authoritative, clear, and actionable executive business advice grounded in the company's verified operational dataset.

CRITICAL OPERATIONAL RULES:
1. TRUTH & GROUNDING: Always base numerical and factual statements directly on the VERIFIED CALCULATIONS and RETRIEVED RECORDS below. Do NOT invent or extrapolate financial numbers.
2. CITATIONS: When referencing specific products, orders, or suppliers, cite their identifier (e.g. "SKU-102", "INV-2041", "Apex Logistics").
3. CURRENCY: Always format currency using "${currency}" (e.g. ${currency}12,500).

MANDATORY STRUCTURED OUTPUT FORMAT:
You MUST ALWAYS format your entire response using the following clean, executive markdown sections:

### 🎯 Executive Summary
[1-2 concise, punchy sentences answering the exact question immediately with direct figures]

### 📊 Key Insights & Metrics
• **[Key Metric or Finding 1]**: [Exact value or observation] — [Brief context or root cause]
• **[Key Metric or Finding 2]**: [Exact value or observation] — [Brief context or root cause]
• **[Key Metric or Finding 3]**: [Exact value or observation] — [Brief context or root cause]

### 💡 Recommended Action Plan
1. **[Immediate Action]**: [Concrete, high-priority step with specific SKU, supplier, or price adjustment]
2. **[Operational Optimization]**: [Reorder, stock transfer, or promotion tactic]
3. **[Strategic Next Step]**: [Longer-term margin or supplier negotiation advice]`;

  // 4. User Prompt with Injected Context
  const userPrompt = `${analyticsBlock}
${docsBlock}

=== 💬 USER QUESTION ===
${query}

Please analyze the verified business data above and generate an executive, user-friendly response following the MANDATORY STRUCTURED OUTPUT FORMAT strictly.`;

  return {
    systemPrompt,
    userPrompt,
    citations,
  };
}
