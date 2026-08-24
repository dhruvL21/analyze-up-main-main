'use server';

import { openai } from '@/ai/openai';
import { z } from 'zod';

const ProductNameSchema = z.string().min(1, 'Product name is required to generate a description.');

export async function generateProductDescription(productName: string): Promise<string> {
  const validatedName = ProductNameSchema.parse(productName);

  const prompt = `
Generate a professional, creative, and compelling 2-3 sentence product description for a product named "${productName}". 
The target audience is sophisticated consumers looking for quality and reliability. Do not include pricing or technical specs unless inferred by the product name.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional marketing copywriter specializing in inventory management and e-commerce.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 150,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty AI response');

    return content.trim();
  } catch (error) {
    console.error('Error in generateProductDescription:', error);
    throw new Error('Failed to generate AI description. Please try again or enter manually.');
  }
}
