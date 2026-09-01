import { openai, isOpenAIConfigured } from '@/ai/openai';
import type { EmbeddingVector } from './types';

// In-memory embedding cache keyed by content hash to prevent redundant OpenAI API calls
const embeddingCache = new Map<string, EmbeddingVector>();

/**
 * Calculates Cosine Similarity between two numerical vectors.
 * Returns a value between -1.0 and 1.0 (or 0.0 to 1.0 for normalized embeddings).
 */
export function cosineSimilarity(vecA: EmbeddingVector, vecB: EmbeddingVector): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;

  // If vectors have different dimensions (e.g. fallback vs openai), compare on common prefix
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA <= 0 || normB <= 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Deterministic fast n-gram sparse-to-dense hybrid vector tokenizer fallback (256 dimensions).
 * Used when offline, in unit tests, or when OpenAI API key is unavailable.
 */
export function generateLocalFallbackEmbedding(text: string, dimensions = 256): EmbeddingVector {
  const vector = new Array<number>(dimensions).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);

  tokens.forEach((token) => {
    // 1. Word hash
    let wordHash = 0;
    for (let i = 0; i < token.length; i++) {
      wordHash = (wordHash * 31 + token.charCodeAt(i)) & 0xffffffff;
    }
    const idx = Math.abs(wordHash) % dimensions;
    vector[idx] += 1.0;

    // 2. Character 3-grams
    if (token.length >= 3) {
      for (let j = 0; j <= token.length - 3; j++) {
        const trigram = token.slice(j, j + 3);
        let triHash = 0;
        for (let k = 0; k < 3; k++) triHash = (triHash * 37 + trigram.charCodeAt(k)) & 0xffffffff;
        const triIdx = Math.abs(triHash) % dimensions;
        vector[triIdx] += 0.5;
      }
    }
  });

  // Normalize vector to unit length
  let norm = 0;
  for (let i = 0; i < dimensions; i++) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) vector[i] /= norm;
  }
  return vector;
}

/**
 * Generates an embedding for a single text string.
 */
export async function generateEmbedding(text: string, contentHash?: string): Promise<EmbeddingVector> {
  const cacheKey = contentHash || text;
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  if (isOpenAIConfigured()) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      });

      if (response.data && response.data[0]?.embedding) {
        const vec = response.data[0].embedding;
        embeddingCache.set(cacheKey, vec);
        return vec;
      }
    } catch (err) {
      console.warn('[RAG Embeddings] OpenAI embeddings API call failed, using deterministic fallback:', err);
    }
  }

  const fallbackVec = generateLocalFallbackEmbedding(text);
  embeddingCache.set(cacheKey, fallbackVec);
  return fallbackVec;
}

/**
 * Generates embeddings in batches with rate-limit and error protection.
 */
export async function generateBatchEmbeddings(
  items: { text: string; contentHash: string }[]
): Promise<EmbeddingVector[]> {
  const results: EmbeddingVector[] = new Array(items.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  items.forEach((item, idx) => {
    if (embeddingCache.has(item.contentHash)) {
      results[idx] = embeddingCache.get(item.contentHash)!;
    } else {
      uncachedIndices.push(idx);
      uncachedTexts.push(item.text.slice(0, 8000));
    }
  });

  if (uncachedIndices.length === 0) {
    return results;
  }

  if (isOpenAIConfigured()) {
    // Process in batches of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < uncachedTexts.length; i += BATCH_SIZE) {
      const textChunk = uncachedTexts.slice(i, i + BATCH_SIZE);
      const indexChunk = uncachedIndices.slice(i, i + BATCH_SIZE);

      try {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: textChunk,
        });

        if (response.data && response.data.length === textChunk.length) {
          response.data.forEach((entry, chunkIdx) => {
            const originalIdx = indexChunk[chunkIdx];
            const vec = entry.embedding;
            const hash = items[originalIdx].contentHash;
            embeddingCache.set(hash, vec);
            results[originalIdx] = vec;
          });
        }
      } catch (err) {
        console.warn('[RAG Embeddings] Batch OpenAI embedding failed, falling back for chunk:', err);
        // Fallback for this chunk
        indexChunk.forEach((origIdx) => {
          const item = items[origIdx];
          const fallbackVec = generateLocalFallbackEmbedding(item.text);
          embeddingCache.set(item.contentHash, fallbackVec);
          results[origIdx] = fallbackVec;
        });
      }
    }
  } else {
    // Local deterministic fallback
    uncachedIndices.forEach((origIdx) => {
      const item = items[origIdx];
      const fallbackVec = generateLocalFallbackEmbedding(item.text);
      embeddingCache.set(item.contentHash, fallbackVec);
      results[origIdx] = fallbackVec;
    });
  }

  return results;
}

/**
 * Clears the in-memory embedding cache.
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}
