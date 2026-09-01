import type { VectorDocument, SearchResult, SourceType } from './types';
import { cosineSimilarity } from './embeddings';

export interface IVectorStore {
  upsert(businessId: string, docs: VectorDocument[]): Promise<{ upserted: number; unchanged: number }>;
  delete(businessId: string, docIds: string[]): Promise<number>;
  deleteBySourceRecordId(businessId: string, sourceRecordId: string): Promise<number>;
  deleteByBusinessId(businessId: string): Promise<void>;
  search(
    businessId: string,
    queryVector: number[],
    options?: {
      topK?: number;
      filter?: (doc: VectorDocument) => boolean;
      minScore?: number;
      sourceTypes?: SourceType[];
    }
  ): Promise<SearchResult[]>;
  getBySourceRecordId(businessId: string, sourceRecordId: string): Promise<VectorDocument | null>;
  getStats(businessId: string): Promise<{ totalVectors: number; lastIndexedAt?: string }>;
  getAllDocuments(businessId: string): Promise<VectorDocument[]>;
}

/**
 * Production In-Memory + Multi-Tenant Scoped Vector Store implementation.
 * Designed to isolate data per business/user ID, preventing cross-tenant leakage.
 */
export class MemoryVectorStore implements IVectorStore {
  // Map<businessId, Map<docId, VectorDocument>>
  private stores: Map<string, Map<string, VectorDocument>> = new Map();
  private lastIndexed: Map<string, string> = new Map();

  private getBusinessStore(businessId: string): Map<string, VectorDocument> {
    if (!this.stores.has(businessId)) {
      this.stores.set(businessId, new Map());
    }
    return this.stores.get(businessId)!;
  }

  async upsert(
    businessId: string,
    docs: VectorDocument[]
  ): Promise<{ upserted: number; unchanged: number }> {
    if (!businessId) throw new Error('[VectorStore] businessId is required for multi-tenant isolation');

    const store = this.getBusinessStore(businessId);
    let upserted = 0;
    let unchanged = 0;

    docs.forEach((doc) => {
      // Strictly enforce businessId matching
      if (doc.businessId !== businessId) {
        doc.businessId = businessId;
      }

      const existing = store.get(doc.id);
      if (existing && existing.contentHash === doc.contentHash && existing.embedding) {
        unchanged++;
      } else {
        store.set(doc.id, {
          ...doc,
          updatedAt: new Date().toISOString(),
        });
        upserted++;
      }
    });

    this.lastIndexed.set(businessId, new Date().toISOString());
    return { upserted, unchanged };
  }

  async delete(businessId: string, docIds: string[]): Promise<number> {
    const store = this.getBusinessStore(businessId);
    let count = 0;
    docIds.forEach((id) => {
      if (store.delete(id)) count++;
    });
    return count;
  }

  async deleteBySourceRecordId(businessId: string, sourceRecordId: string): Promise<number> {
    const store = this.getBusinessStore(businessId);
    let count = 0;
    for (const [id, doc] of store.entries()) {
      if (doc.sourceRecordId === sourceRecordId) {
        store.delete(id);
        count++;
      }
    }
    return count;
  }

  async deleteByBusinessId(businessId: string): Promise<void> {
    this.stores.delete(businessId);
    this.lastIndexed.delete(businessId);
  }

  async search(
    businessId: string,
    queryVector: number[],
    options: {
      topK?: number;
      filter?: (doc: VectorDocument) => boolean;
      minScore?: number;
      sourceTypes?: SourceType[];
    } = {}
  ): Promise<SearchResult[]> {
    const store = this.getBusinessStore(businessId);
    const topK = options.topK || 10;
    const minScore = options.minScore !== undefined ? options.minScore : 0.05;

    const scoredResults: SearchResult[] = [];

    for (const doc of store.values()) {
      // 1. SourceType Filter
      if (options.sourceTypes && options.sourceTypes.length > 0) {
        if (!options.sourceTypes.includes(doc.sourceType)) continue;
      }

      // 2. Custom Filter
      if (options.filter && !options.filter(doc)) {
        continue;
      }

      // 3. Vector Similarity
      if (!doc.embedding || doc.embedding.length === 0) continue;

      const score = cosineSimilarity(queryVector, doc.embedding);
      if (score >= minScore) {
        scoredResults.push({
          document: doc,
          similarity: score,
          matchType: score >= 0.85 ? 'exact' : 'semantic',
        });
      }
    }

    // Sort descending by similarity score
    scoredResults.sort((a, b) => b.similarity - a.similarity);
    return scoredResults.slice(0, topK);
  }

  async getBySourceRecordId(businessId: string, sourceRecordId: string): Promise<VectorDocument | null> {
    const store = this.getBusinessStore(businessId);
    for (const doc of store.values()) {
      if (doc.sourceRecordId === sourceRecordId) {
        return doc;
      }
    }
    return null;
  }

  async getStats(businessId: string): Promise<{ totalVectors: number; lastIndexedAt?: string }> {
    const store = this.getBusinessStore(businessId);
    return {
      totalVectors: store.size,
      lastIndexedAt: this.lastIndexed.get(businessId),
    };
  }

  async getAllDocuments(businessId: string): Promise<VectorDocument[]> {
    const store = this.getBusinessStore(businessId);
    return Array.from(store.values());
  }
}

// Global Singleton Vector Store instance
export const globalVectorStore = new MemoryVectorStore();
