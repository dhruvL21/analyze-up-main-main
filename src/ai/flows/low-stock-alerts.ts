'use server';

import { openai } from '@/ai/openai';
import { z } from 'zod';

/* ------------------ SCHEMAS ------------------ */

const AIStockAdvisorInputSchema = z.object({
  productName: z.string(),
  averageDailySales: z.number(),
  supplierLeadTimeDays: z.number(),
  currentStockLevel: z.number(),
});

export type AIStockAdvisorInput = z.infer<
  typeof AIStockAdvisorInputSchema
>;

const AIStockAdvisorOutputSchema = z.object({
  stockoutRisk: z.boolean(),
  recommendedReorderQuantity: z.number(),
  reasoning: z.union([z.string(), z.array(z.string())]),
});

export type AIStockAdvisorOutput = {
  stockoutRisk: boolean;
  recommendedReorderQuantity: number;
  reasoning: string;
  productName: string;
};

/* ------------------ EXPORT ------------------ */

export async function aiStockAdvisor(
  input: AIStockAdvisorInput
): Promise<AIStockAdvisorOutput> {
  const validatedInput = AIStockAdvisorInputSchema.parse(input);

  const prompt = `
You are an AI inventory assistant.
In the "reasoning" explanation, refer to the product by its actual name "${validatedInput.productName}" rather than using generic terms like "the product".

Respond ONLY in valid JSON matching the schema:

{
  "stockoutRisk": boolean,
  "recommendedReorderQuantity": number,
  "reasoning": string | string[]
}

Product Name: ${input.productName}
Average Daily Sales: ${input.averageDailySales}
Supplier Lead Time (Days): ${input.supplierLeadTimeDays}
Current Stock Level: ${input.currentStockLevel}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful inventory assistant.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error('Empty AI response');
    }

    const rawParsed = JSON.parse(content);
    const validated = AIStockAdvisorOutputSchema.parse(rawParsed);
    
    return {
      stockoutRisk: validated.stockoutRisk,
      recommendedReorderQuantity: validated.recommendedReorderQuantity,
      reasoning: Array.isArray(validated.reasoning) ? validated.reasoning.join(' ') : validated.reasoning,
      productName: input.productName,
    };
  } catch (error) {
    console.warn('aiStockAdvisor falling back to deterministic calculation:', error);
    const leadTimeBuffer = input.averageDailySales * input.supplierLeadTimeDays;
    const stockoutRisk = input.currentStockLevel <= leadTimeBuffer;
    const targetStock = input.averageDailySales * (input.supplierLeadTimeDays + 14);
    const recommendedReorderQuantity = Math.max(10, Math.ceil(targetStock - input.currentStockLevel));

    return {
      stockoutRisk,
      recommendedReorderQuantity,
      reasoning: `${input.productName} currently has ${input.currentStockLevel} units in stock. With daily sales of ${input.averageDailySales} units and a supplier lead time of ${input.supplierLeadTimeDays} days, ${stockoutRisk ? 'reordering is urgently recommended to prevent a stockout.' : 'stock level is currently adequate.'}`,
      productName: input.productName,
    };
  }
}

