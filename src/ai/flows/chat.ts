'use server';

import { openai } from '@/ai/openai';
import { getIndustryConfig } from '@/lib/industry-intelligence';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function askAnalyzeUpChat(
  userMessage: string,
  chatHistory: ChatMessage[],
  products: any[],
  transactions: any[],
  businessProfile?: any
): Promise<string> {
  const industry = getIndustryConfig(businessProfile?.businessType);

  const systemPrompt = `
You are "AnalyzeUp AI Business Copilot", an intelligent, expert AI advisor for "${businessProfile?.businessName || 'the business'}" in the ${industry.label} industry.
Business Size: ${businessProfile?.businessSize || 'SMB'}, Base Currency: ${businessProfile?.currency || 'INR (₹)'}.
Industry Priority Focus: ${industry.aiPriority}

You have access to real-time business data:

1. Current Products in Stock:
${JSON.stringify(products, null, 2)}

2. Recent Sales/Purchase Transactions:
${JSON.stringify(transactions, null, 2)}

INSTRUCTIONS:
1. Answer the founder's questions with actionable business decisions rather than just raw facts.
2. Ground all answers strictly in the provided inventory and transaction data.
3. Tailor strategic suggestions specifically for a ${industry.label} business.
4. Format responses cleanly using markdown (bullet points, bold text, step-by-step decision points).
5. Always use the business's selected currency format (${businessProfile?.currency || '₹'}).
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

    const reply = response.choices[0].message.content || "I couldn't generate a response. Please try again.";
    return reply;
  } catch (error) {
    console.error('Error in askAnalyzeUpChat:', error);
    return "Sorry, I encountered an error while analyzing your data. Please check your connection and try again.";
  }
}
