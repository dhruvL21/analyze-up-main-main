import { openai, isOpenAIConfigured } from '@/ai/openai';
import type {
  RAGQueryRequest,
  RAGResponse,
  VectorDocument,
  KnowledgeBaseStats,
  QueryIntent,
  Citation,
} from './types';
import {
  chunkProducts,
  chunkTransactions,
  chunkSuppliers,
  chunkPurchaseOrders,
  chunkReturns,
  chunkFinancialAggregates,
} from './chunker';
import { generateBatchEmbeddings } from './embeddings';
import { globalVectorStore, IVectorStore } from './vector-store';
import { classifyQueryIntent } from './query-classifier';
import { executeDeterministicAnalytics } from './analytics-engine';
import { HybridRetriever } from './retriever';
import { buildRAGPromptContext } from './context-builder';

// Tracks indexing state per business
const indexingStatusMap = new Map<string, KnowledgeBaseStats>();

/**
 * Builds and indexes the complete business knowledge base into vector embeddings.
 * Supports incremental indexing (skips unchanged documents).
 */
export async function buildBusinessKnowledgeBase(
  businessId: string,
  products: any[] = [],
  transactions: any[] = [],
  suppliers: any[] = [],
  orders: any[] = [],
  returns: any[] = [],
  profile?: any | null,
  vectorStore: IVectorStore = globalVectorStore
): Promise<KnowledgeBaseStats> {
  if (!businessId) throw new Error('[RAG Orchestrator] businessId is required for knowledge base');

  indexingStatusMap.set(businessId, {
    totalVectors: 0,
    processedRecords: 0,
    lastIndexedAt: new Date().toISOString(),
    status: 'INDEXING',
  });

  try {
    // 1. Generate Entity-Level Chunks
    const productDocs = chunkProducts(products, businessId, transactions);
    const txDocs = chunkTransactions(transactions, businessId);
    const supplierDocs = chunkSuppliers(suppliers, businessId, products, orders);
    const orderDocs = chunkPurchaseOrders(orders, businessId);
    const returnDocs = chunkReturns(returns, businessId);
    const financialDocs = chunkFinancialAggregates(products, transactions, businessId, profile);

    const allDocs: VectorDocument[] = [
      ...productDocs,
      ...txDocs,
      ...supplierDocs,
      ...orderDocs,
      ...returnDocs,
      ...financialDocs,
    ];

    // 2. Generate Vector Embeddings (in batches with hashing and caching)
    const embeddingInputs = allDocs.map((d) => ({
      text: d.text,
      contentHash: d.contentHash,
    }));

    const embeddings = await generateBatchEmbeddings(embeddingInputs);

    // 3. Attach Embeddings to Documents
    allDocs.forEach((doc, idx) => {
      doc.embedding = embeddings[idx];
    });

    // 4. Upsert into Isolated Multi-Tenant Vector Store
    const { upserted, unchanged } = await vectorStore.upsert(businessId, allDocs);

    const stats: KnowledgeBaseStats = {
      totalVectors: allDocs.length,
      processedRecords: upserted + unchanged,
      lastIndexedAt: new Date().toISOString(),
      status: 'COMPLETED',
    };

    indexingStatusMap.set(businessId, stats);
    return stats;
  } catch (err) {
    console.error(`[RAG Orchestrator] Error indexing knowledge base for business ${businessId}:`, err);
    const failedStats: KnowledgeBaseStats = {
      totalVectors: 0,
      processedRecords: 0,
      lastIndexedAt: new Date().toISOString(),
      status: 'FAILED',
    };
    indexingStatusMap.set(businessId, failedStats);
    return failedStats;
  }
}

/**
 * Executes a full production RAG query flow:
 * 1. Intent Classification -> 2. Deterministic Analytics -> 3. Vector Retrieval -> 4. Context Build -> 5. LLM Synthesis
 */
export async function executeRAGQuery(
  request: RAGQueryRequest,
  vectorStore: IVectorStore = globalVectorStore
): Promise<RAGResponse> {
  const startTime = Date.now();
  const {
    businessId,
    query,
    chatHistory = [],
    products = [],
    transactions = [],
    suppliers = [],
    orders = [],
    returns = [],
    businessProfile,
    options = {},
  } = request;

  if (!businessId) throw new Error('[RAG Orchestrator] businessId is required for multi-tenant query');

  // 1. Ensure Knowledge Base is indexed
  const currentStats = await vectorStore.getStats(businessId);
  if (currentStats.totalVectors === 0 && (products.length > 0 || transactions.length > 0)) {
    await buildBusinessKnowledgeBase(
      businessId,
      products,
      transactions,
      suppliers,
      orders,
      returns,
      businessProfile,
      vectorStore
    );
  }

  // 2. Classify Query Intent
  const intent: QueryIntent = options.forceIntent || classifyQueryIntent(query);

  // 3. Deterministic Analytics (100% exact numerical answers)
  const analytics = executeDeterministicAnalytics(
    intent,
    query,
    products,
    transactions,
    suppliers,
    orders,
    returns,
    businessProfile
  );

  // 4. Hybrid Semantic + Keyword Vector Retrieval
  const retriever = new HybridRetriever(vectorStore);
  const { results: retrievedResults, citations } = await retriever.retrieve(businessId, query, {
    topK: options.topK || 8,
    minScore: options.threshold || 0.05,
  });

  // 5. Build Compact, Verified Prompt Context
  const builtContext = buildRAGPromptContext(
    query,
    intent,
    retrievedResults,
    analytics,
    citations,
    businessProfile
  );

  let finalAnswer = '';
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';

  // 6. Call OpenAI GPT-4o-mini / GPT-4o (if configured)
  if (isOpenAIConfigured()) {
    try {
      const messagesPayload: any[] = [
        { role: 'system', content: builtContext.systemPrompt },
        ...chatHistory.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: builtContext.userPrompt },
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messagesPayload,
        temperature: 0.15,
        max_tokens: 1200,
      });

      finalAnswer = response.choices[0]?.message?.content || '';
    } catch (llmErr) {
      console.warn('[RAG Orchestrator] OpenAI LLM call failed, falling back to structured synthesis:', llmErr);
    }
  }

  // 7. Structured Executive Fallback (guarantees clean, user-friendly output in all conditions)
  if (!finalAnswer) {
    if (analytics) {
      finalAnswer =
        `### 🎯 Executive Summary\n\n` +
        `${analytics.summarySentence}\n\n` +
        `### 📊 Key Insights & Metrics\n` +
        `• **Primary Finding**: **${analytics.formattedValue}** (${analytics.metricName})\n` +
        (analytics.breakdown && analytics.breakdown.length > 0
          ? analytics.breakdown.slice(0, 5).map((b) => `• **${b.label}**: ${b.formatted}`).join('\n') + '\n\n'
          : '\n') +
        `### 💡 Recommended Action Plan\n` +
        `1. **Immediate Execution**: Prioritize critical stock replenishment and clearance tasks highlighted above.\n` +
        `2. **Working Capital Protection**: Maintain minimum safety stock thresholds to avoid tying up excess cash.\n` +
        `3. **Supplier Coordination**: Confirm lead times and fulfillment schedules with primary vendors.`;
    } else if (retrievedResults.length > 0) {
      finalAnswer =
        `### 🎯 Executive Summary\n\n` +
        `Retrieved **${retrievedResults.length} relevant business records** matching your query.\n\n` +
        `### 📊 Key Insights & Observations\n` +
        retrievedResults
          .slice(0, 4)
          .map((r, i) => {
            const meta = r.document.metadata || {};
            const title = (meta.name as string) || (meta.sku as string) || (meta.orderNumber as string) || `Record #${i + 1}`;
            const firstSentence = r.document.text.split('.')[0] + '.';
            return `• **${title}** (${r.document.sourceType.toUpperCase()}): ${firstSentence}`;
          })
          .join('\n') +
        `\n\n### 💡 Recommended Action Plan\n` +
        `1. **Review Cited Records**: Check the verified source items below for detailed SKU/Order data.\n` +
        `2. **Drill Down**: Use the specific SKU or order IDs above to adjust inventory or fulfillment settings.`;
    } else {
      finalAnswer =
        `### 🎯 Executive Summary\n\n` +
        `No direct matching records found for "${query}" in your active workspace dataset.\n\n` +
        `### 💡 Next Steps\n` +
        `• Try asking about specific product names, SKUs (e.g. "SKU-HEAD-101"), or categories.\n` +
        `• You can also ask high-level questions like *"What is our gross profit?"* or *"Which products are dead stock?"*.`;
      confidence = 'LOW';
    }
  }

  const executionTimeMs = Date.now() - startTime;

  return {
    answer: finalAnswer,
    intent,
    citations: builtContext.citations,
    analytics: analytics || undefined,
    confidence,
    executionTimeMs,
    knowledgeBaseStats: {
      totalVectors: (await vectorStore.getStats(businessId)).totalVectors,
      relevantVectors: retrievedResults.length,
    },
  };
}
