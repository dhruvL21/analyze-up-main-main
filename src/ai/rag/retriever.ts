import type { IVectorStore } from './vector-store';
import type { SearchResult, SourceType, Citation } from './types';
import { generateEmbedding } from './embeddings';

export interface RetrievalOptions {
  topK?: number;
  minScore?: number;
  sourceTypes?: SourceType[];
  filter?: (doc: any) => boolean;
}

/**
 * Hybrid Semantic + Keyword + Metadata Vector Retriever.
 */
export class HybridRetriever {
  constructor(private vectorStore: IVectorStore) {}

  async retrieve(
    businessId: string,
    query: string,
    options: RetrievalOptions = {}
  ): Promise<{ results: SearchResult[]; citations: Citation[] }> {
    if (!businessId) throw new Error('[Retriever] businessId is required for tenant isolation');

    const topK = options.topK || 8;
    const queryVector = await generateEmbedding(query);

    // 1. Semantic Vector Search
    const semanticResults = await this.vectorStore.search(businessId, queryVector, {
      topK: topK * 2, // Over-fetch for hybrid re-ranking
      minScore: options.minScore || 0.05,
      sourceTypes: options.sourceTypes,
      filter: options.filter,
    });

    // 2. Keyword & Exact Term Bonus Re-ranking
    const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const skuMatches = query.match(/\b([A-Z0-9_\-]{4,20})\b/gi) || [];
    const normalizedSkuMatches = skuMatches.map((s) => s.toLowerCase());

    const reranked = semanticResults.map((res) => {
      let boostedScore = res.similarity;
      const textLower = res.document.text.toLowerCase();
      const meta = res.document.metadata || {};

      // A. Exact SKU match bonus (+0.35)
      if (meta.sku && normalizedSkuMatches.includes(String(meta.sku).toLowerCase())) {
        boostedScore += 0.35;
      }

      // B. Exact Name / Order Number match bonus (+0.25)
      if (meta.orderNumber && query.toLowerCase().includes(String(meta.orderNumber).toLowerCase())) {
        boostedScore += 0.25;
      }
      if (meta.name && query.toLowerCase().includes(String(meta.name).toLowerCase())) {
        boostedScore += 0.2;
      }

      // C. Keyword overlap bonus (+0.05 per keyword)
      let keywordHits = 0;
      queryTokens.forEach((token) => {
        if (textLower.includes(token)) keywordHits++;
      });
      boostedScore += Math.min(0.2, keywordHits * 0.05);

      return {
        ...res,
        similarity: Math.min(1.0, boostedScore),
        matchType: boostedScore > res.similarity ? ('hybrid' as const) : res.matchType,
      };
    });

    reranked.sort((a, b) => b.similarity - a.similarity);
    const finalResults = reranked.slice(0, topK);

    // 3. Assemble Source Citations
    const citations: Citation[] = finalResults.map((r) => {
      const doc = r.document;
      const meta = doc.metadata || {};
      let label = `${doc.sourceRecordId} · ${doc.sourceType.toUpperCase()}`;

      if (doc.sourceType === 'product') {
        label = `${meta.sku || doc.sourceRecordId} · Product Catalog`;
      } else if (doc.sourceType === 'transaction') {
        label = `${meta.orderNumber || doc.sourceRecordId} · Sales Order`;
      } else if (doc.sourceType === 'supplier') {
        label = `${meta.name || doc.sourceRecordId} · Supplier Profile`;
      } else if (doc.sourceType === 'financial') {
        label = `Executive Financial Audit`;
      } else if (doc.sourceType === 'inventory') {
        label = `Inventory Dead Stock Ledger`;
      }

      return {
        sourceRecordId: doc.sourceRecordId,
        sourceType: doc.sourceType,
        label,
        snippet: doc.text.slice(0, 160) + '...',
        metadata: doc.metadata,
      };
    });

    return { results: finalResults, citations };
  }
}
