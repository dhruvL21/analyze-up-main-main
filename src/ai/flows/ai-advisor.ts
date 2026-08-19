'use server';

import { openai } from '@/ai/openai';
import { getIndustryConfig } from '@/lib/industry-intelligence';
import type { Product, Transaction, Supplier, BusinessProfile } from '@/lib/types';
import { z } from 'zod';

/* -------------------- SCHEMAS -------------------- */

const AIAdvisorOutputSchema = z.object({
  businessHealthComment: z.string().default('No comments available.'),
  deadStockTips: z.record(z.string()).default({}),
  supplierInsights: z.record(z.string()).default({}),
});

export type AIAdvisorInsights = z.infer<typeof AIAdvisorOutputSchema>;

/* -------------------- FLOW EXPORT -------------------- */

export async function generateAIAdvisorInsights(
  products: Product[],
  transactions: Transaction[],
  suppliers: Supplier[],
  businessProfile?: BusinessProfile | null
): Promise<AIAdvisorInsights> {
  const industry = getIndustryConfig(businessProfile?.businessType);

  // Clean and sanitize input payloads before embedding in prompt
  const safeProducts = (products || []).slice(0, 50).map(p => ({
    name: p.name,
    stock: p.stock,
    price: p.price,
    costPrice: p.costPrice,
    category: p.category,
    minStock: p.minStock,
    supplier: p.supplier,
  }));

  const safeTransactions = (transactions || []).slice(-50).map(t => ({
    type: t.type,
    productName: t.productName,
    quantity: t.quantity,
    totalRevenue: t.totalRevenue,
    transactionDate: t.transactionDate,
  }));

  const safeSuppliers = (suppliers || []).slice(0, 20).map(s => ({
    name: s.name,
    leadTimeDays: s.leadTimeDays,
    rating: s.rating,
  }));

  const prompt = `
You are AnalyzeUp, an AI Business Copilot assisting a founder in the "${industry.label}" sector (Business Size: ${businessProfile?.businessSize || 'SMB'}, Country: ${businessProfile?.country || 'India'}).
Industry Priority: ${industry.aiPriority}
Benchmark Profit Margin: ${industry.benchmarkMargin}

Here is the current business data:

Products:
${JSON.stringify(safeProducts, null, 2)}

Recent Transactions:
${JSON.stringify(safeTransactions, null, 2)}

Suppliers:
${JSON.stringify(safeSuppliers, null, 2)}

Based on this data, please generate tailored insights for a ${industry.label} business:
1. A concise, professional, actionable comment on the overall Business Health Score (covering margins, dead stock risk, stock availability, and ${industry.focusAreas.join(', ')}). Mention the biggest decision the founder should make right now.
2. Strategic suggestions to clear "Dead Stock" items tailored to ${industry.label} (e.g. food spoilage clearance, seasonal fashion bundle, electronics accessory promo, etc.).
3. Supplier Intelligence insights: analyze lead time and stock out risks. For each supplier, provide a short actionable risk or performance comment.

Respond ONLY in valid JSON with these exact keys:
"businessHealthComment": string
"deadStockTips": Record<string, string> (keys are exact product names, values are the suggestions)
"supplierInsights": Record<string, string> (keys are exact supplier names, values are the insights)
`;

  try {
    console.log('Generating AI Advisor Insights...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful business consultant. You must respond strictly with the requested JSON structure.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const parsed = JSON.parse(content);
    return AIAdvisorOutputSchema.parse(parsed);
  } catch (error) {
    console.error('Error generating AI advisor insights:', error);
    return {
      businessHealthComment: 'Failed to analyze business health insights. Please try again.',
      deadStockTips: {},
      supplierInsights: {},
    };
  }
}
