'use server';

import type { Product, Transaction, Supplier, PurchaseOrder, ProductReturn, BusinessProfile } from '@/lib/types';
import { executeRAGQuery } from '@/ai/rag/rag-orchestrator';
import type { RAGResponse } from '@/ai/rag/types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Production-grade RAG entry point returning the string reply.
 * Connects directly to OpenAI with semantic embeddings, vector retrieval,
 * deterministic business calculations, and verifiable source citations.
 */
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
  const res = await askAnalyzeUpRAGChat(
    userMessage,
    chatHistory,
    products,
    transactions,
    suppliers,
    orders,
    returns,
    businessProfile
  );
  return res.text;
}

/**
 * Full RAG entry point returning both text reply and structured RAGResponse (with citations & analytics).
 */
export async function askAnalyzeUpRAGChat(
  userMessage: string,
  chatHistory: ChatMessage[] = [],
  products: Product[] = [],
  transactions: Transaction[] = [],
  suppliers: Supplier[] = [],
  orders: PurchaseOrder[] = [],
  returns: ProductReturn[] = [],
  businessProfile?: BusinessProfile | null
): Promise<{ text: string; ragResponse?: RAGResponse }> {
  const businessId = businessProfile?.businessName
    ? `biz_${businessProfile.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    : 'default_workspace';

  try {
    const ragResult = await executeRAGQuery({
      businessId,
      query: userMessage,
      chatHistory,
      products,
      transactions,
      suppliers,
      orders,
      returns,
      businessProfile,
      options: {
        topK: 8,
      },
    });

    return {
      text: ragResult.answer,
      ragResponse: ragResult,
    };
  } catch (error) {
    console.error('[askAnalyzeUpRAGChat] Error executing RAG orchestrator:', error);
    return {
      text: 'I encountered an error analyzing your workspace data. Please check your data connection and try again.',
    };
  }
}
