'use server';

import { openai } from '@/ai/openai';
import { getIndustryConfig } from '@/lib/industry-intelligence';
import { processCopilotQuery, CopilotResponse } from '@/lib/copilot-engine';
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

  // First process deterministic Copilot intelligence response
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

  // Construct system prompt containing calculated deterministic metrics
  const systemPrompt = `
You are "AnalyzeUp AI Business Copilot", an expert AI advisor for "${businessProfile?.businessName || 'the business'}" in the ${industry.label} industry.
Currency: ${businessProfile?.currency || 'INR (₹)'}.

DETERMINISTIC BUSINESS METRICS COMPUTED BY APPLICATION:
- Query Intent: ${copilotRes.intentLabel}
- What Happened: ${copilotRes.what}
- Why It Happened: ${copilotRes.why}
- Recommended Action: ${copilotRes.actionText}
- Supporting Data: ${copilotRes.supportingData.map(d => `${d.label}: ${d.value}`).join(' | ')}

INSTRUCTIONS:
1. Explain the computed metrics clearly using concise, executive Markdown formatting.
2. Structure the response into:
   ### ${copilotRes.intentLabel.toUpperCase()}
   - **WHAT:** ${copilotRes.what}
   - **WHY:** ${copilotRes.why}
   - **RECOMMENDED ACTION:** ${copilotRes.actionText}
3. Include the supporting metrics in a clear list.
4. Ground all statements strictly in these computed metrics. Never invent unverified sales or profit numbers.
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
      temperature: 0,
    });

    const reply = response.choices[0].message.content || copilotRes.answerMarkdown;
    return reply;
  } catch (error) {
    console.error('OpenAI API call bypassed/failed, returning deterministic Copilot answer:', error);
    return copilotRes.answerMarkdown;
  }
}
