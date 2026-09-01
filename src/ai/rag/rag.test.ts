import { describe, it, expect, beforeEach } from 'vitest';
import {
  chunkProducts,
  chunkTransactions,
  chunkSuppliers,
  chunkPurchaseOrders,
  chunkReturns,
  chunkFinancialAggregates,
  generateContentHash,
} from './chunker';
import {
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
  generateLocalFallbackEmbedding,
  clearEmbeddingCache,
} from './embeddings';
import { MemoryVectorStore } from './vector-store';
import { classifyQueryIntent } from './query-classifier';
import { executeDeterministicAnalytics } from './analytics-engine';
import { HybridRetriever } from './retriever';
import { buildRAGPromptContext } from './context-builder';
import { buildBusinessKnowledgeBase, executeRAGQuery } from './rag-orchestrator';

describe('RAG Module - Comprehensive Suite', () => {
  const businessA = 'user_business_alpha';
  const businessB = 'user_business_beta';

  const mockProducts = [
    {
      id: 'prod_101',
      name: 'Wireless Noise Canceling Headphones',
      sku: 'SKU-HEAD-101',
      category: 'Electronics',
      price: 2999,
      costPrice: 1500,
      stock: 35,
      reorderPoint: 10,
      supplier: 'Sonic Audio Labs',
      supplierId: 'sup_sonic',
      leadTimeDays: 5,
    },
    {
      id: 'prod_202',
      name: 'Ergonomic Office Chair',
      sku: 'SKU-CHAIR-202',
      category: 'Furniture',
      price: 8999,
      costPrice: 5000,
      stock: 4,
      reorderPoint: 8,
      supplier: 'Comfort Craft',
      supplierId: 'sup_comfort',
      leadTimeDays: 14,
    },
    {
      id: 'prod_303',
      name: 'Vintage Leather Wallet',
      sku: 'SKU-WAL-303',
      category: 'Accessories',
      price: 1299,
      costPrice: 600,
      stock: 20,
      reorderPoint: 5,
      supplier: 'Artisan Goods',
      supplierId: 'sup_artisan',
      leadTimeDays: 7,
    },
  ];

  const mockTransactions = [
    {
      id: 'tx_501',
      orderNumber: 'ORD-501',
      productId: 'prod_101',
      productName: 'Wireless Noise Canceling Headphones',
      sku: 'SKU-HEAD-101',
      quantity: 5,
      price: 2999,
      totalRevenue: 14995,
      totalCost: 7500,
      type: 'Sale',
      category: 'Electronics',
      transactionDate: '2026-08-15',
      customerName: 'Aarav Sharma',
    },
    {
      id: 'tx_502',
      orderNumber: 'ORD-502',
      productId: 'prod_202',
      productName: 'Ergonomic Office Chair',
      sku: 'SKU-CHAIR-202',
      quantity: 2,
      price: 8999,
      totalRevenue: 17998,
      totalCost: 10000,
      type: 'Sale',
      category: 'Furniture',
      transactionDate: '2026-08-18',
      customerName: 'Priya Patel',
    },
  ];

  const mockSuppliers = [
    {
      id: 'sup_sonic',
      name: 'Sonic Audio Labs',
      contactName: 'Rahul Verma',
      email: 'rahul@sonicaudio.com',
      leadTimeDays: 5,
      reliabilityScore: 98,
    },
    {
      id: 'sup_comfort',
      name: 'Comfort Craft',
      contactName: 'Sneha Rao',
      email: 'sneha@comfortcraft.com',
      leadTimeDays: 14,
      reliabilityScore: 90,
    },
  ];

  const mockOrders = [
    {
      id: 'po_901',
      supplierId: 'sup_sonic',
      supplierName: 'Sonic Audio Labs',
      totalCost: 45000,
      status: 'Pending',
      orderDate: '2026-08-20',
      expectedDeliveryDate: '2026-08-25',
    },
  ];

  const mockReturns = [
    {
      id: 'ret_701',
      productId: 'prod_101',
      productName: 'Wireless Noise Canceling Headphones',
      sku: 'SKU-HEAD-101',
      quantity: 1,
      refundAmount: 2999,
      reason: 'Defective sound in left ear',
      date: '2026-08-19',
      status: 'Processed',
    },
  ];

  beforeEach(() => {
    clearEmbeddingCache();
  });

  // 1. CHUNKING
  describe('1. Semantic Chunker', () => {
    it('creates entity-level product chunks with SKU, stock, and margins', () => {
      const docs = chunkProducts(mockProducts as any, businessA, mockTransactions as any);
      expect(docs.length).toBe(3);

      const headDoc = docs.find((d) => d.metadata.sku === 'SKU-HEAD-101');
      expect(headDoc).toBeDefined();
      expect(headDoc?.sourceRecordId).toBe('prod_101');
      expect(headDoc?.sourceType).toBe('product');
      expect(headDoc?.text).toContain('SKU: SKU-HEAD-101');
      expect(headDoc?.text).toContain('Selling price is ₹2,999');
      expect(headDoc?.text).toContain('Current inventory stock level is 35 units');
      expect(headDoc?.contentHash).toBeDefined();
    });

    it('identifies dead stock and low stock flags correctly during product chunking', () => {
      const docs = chunkProducts(mockProducts as any, businessA, mockTransactions as any);
      const deadStockDoc = docs.find((d) => d.metadata.sku === 'SKU-WAL-303');
      const lowStockDoc = docs.find((d) => d.metadata.sku === 'SKU-CHAIR-202');

      expect(deadStockDoc?.metadata.isDeadStock).toBe(true);
      expect(lowStockDoc?.metadata.isLowStock).toBe(true);
    });

    it('chunks transactions, suppliers, purchase orders, returns, and financial aggregates', () => {
      const txDocs = chunkTransactions(mockTransactions as any, businessA);
      const supDocs = chunkSuppliers(mockSuppliers as any, businessA, mockProducts as any, mockOrders as any);
      const poDocs = chunkPurchaseOrders(mockOrders as any, businessA);
      const retDocs = chunkReturns(mockReturns as any, businessA);
      const finDocs = chunkFinancialAggregates(mockProducts as any, mockTransactions as any, businessA);

      expect(txDocs.length).toBe(2);
      expect(txDocs[0].sourceType).toBe('transaction');
      expect(txDocs[0].text).toContain('ORD-501');

      expect(supDocs.length).toBe(2);
      expect(supDocs[0].sourceType).toBe('supplier');
      expect(supDocs[0].text).toContain('Sonic Audio Labs');

      expect(poDocs.length).toBe(1);
      expect(poDocs[0].sourceType).toBe('order');

      expect(retDocs.length).toBe(1);
      expect(retDocs[0].sourceType).toBe('return');

      expect(finDocs.length).toBeGreaterThanOrEqual(3);
    });

    it('produces deterministic content hashes for identical text', () => {
      const hash1 = generateContentHash('Product SKU-101 stock 35');
      const hash2 = generateContentHash('Product SKU-101 stock 35');
      const hash3 = generateContentHash('Product SKU-101 stock 36');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  // 2. EMBEDDINGS & SIMILARITY
  describe('2. Embedding Engine & Cosine Similarity', () => {
    it('calculates exact cosine similarity correctly', () => {
      const vecA = [1, 0, 0];
      const vecB = [1, 0, 0];
      const vecC = [0, 1, 0];
      const vecD = [0.7071, 0.7071, 0];

      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 4);
      expect(cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0, 4);
      expect(cosineSimilarity(vecA, vecD)).toBeCloseTo(0.7071, 3);
    });

    it('generates consistent local fallback embeddings and caches results', async () => {
      const text = 'Wireless Bluetooth Headphones with Noise Canceling';
      const vec1 = await generateEmbedding(text, 'hash_test_1');
      const vec2 = await generateEmbedding(text, 'hash_test_1');

      expect(vec1.length).toBeGreaterThan(0);
      expect(vec1).toEqual(vec2);
    });

    it('generates batch embeddings efficiently', async () => {
      const items = [
        { text: 'First product item description', contentHash: 'h1' },
        { text: 'Second product item description', contentHash: 'h2' },
      ];
      const batchVectors = await generateBatchEmbeddings(items);

      expect(batchVectors.length).toBe(2);
      expect(batchVectors[0].length).toBeGreaterThan(0);
      expect(batchVectors[1].length).toBeGreaterThan(0);
    });
  });

  // 3. VECTOR STORE & MULTI-TENANT ISOLATION
  describe('3. Vector Store & Multi-Tenant Security', () => {
    it('isolates data strictly so Business A cannot search Business B records', async () => {
      const store = new MemoryVectorStore();

      const docA: any = {
        id: 'doc_a_1',
        businessId: businessA,
        sourceRecordId: 'sku_alpha',
        sourceType: 'product',
        text: 'Confidential product pricing for Business Alpha',
        contentHash: 'hash_a',
        metadata: { sku: 'SKU-ALPHA' },
        embedding: generateLocalFallbackEmbedding('Confidential product pricing for Business Alpha'),
      };

      const docB: any = {
        id: 'doc_b_1',
        businessId: businessB,
        sourceRecordId: 'sku_beta',
        sourceType: 'product',
        text: 'Secret supplier contracts for Business Beta',
        contentHash: 'hash_b',
        metadata: { sku: 'SKU-BETA' },
        embedding: generateLocalFallbackEmbedding('Secret supplier contracts for Business Beta'),
      };

      await store.upsert(businessA, [docA]);
      await store.upsert(businessB, [docB]);

      const queryVec = generateLocalFallbackEmbedding('Confidential pricing contracts');

      const resultsA = await store.search(businessA, queryVec);
      const resultsB = await store.search(businessB, queryVec);

      expect(resultsA.every((r) => r.document.businessId === businessA)).toBe(true);
      expect(resultsA.some((r) => r.document.businessId === businessB)).toBe(false);

      expect(resultsB.every((r) => r.document.businessId === businessB)).toBe(true);
      expect(resultsB.some((r) => r.document.businessId === businessA)).toBe(false);
    });

    it('supports deletion by sourceRecordId and full business deletion', async () => {
      const store = new MemoryVectorStore();
      const docs = chunkProducts(mockProducts as any, businessA);
      docs.forEach((d) => {
        d.embedding = generateLocalFallbackEmbedding(d.text);
      });

      await store.upsert(businessA, docs);
      expect((await store.getStats(businessA)).totalVectors).toBe(3);

      // Delete 1 by sourceRecordId
      await store.deleteBySourceRecordId(businessA, 'prod_101');
      expect((await store.getStats(businessA)).totalVectors).toBe(2);

      // Purge entire business workspace
      await store.deleteByBusinessId(businessA);
      expect((await store.getStats(businessA)).totalVectors).toBe(0);
    });
  });

  // 4. DETERMINISTIC ANALYTICS
  describe('4. Deterministic Business Analytics Engine', () => {
    it('calculates dead stock capital with 100% mathematical accuracy', () => {
      const result = executeDeterministicAnalytics(
        'INVENTORY',
        'Which products are dead stock and how much capital is tied up in them?',
        mockProducts as any,
        mockTransactions as any
      );

      expect(result).toBeDefined();
      expect(result?.metricName).toBe('Dead Stock Capital');
      // SKU-WAL-303: 20 units * 600 cost = 12000
      expect(result?.value).toBe(12000);
      expect(result?.formattedValue).toContain('₹12,000');
    });

    it('calculates total sales revenue and gross profit accurately', () => {
      const salesResult = executeDeterministicAnalytics(
        'SALES_ANALYTICS',
        'What was total revenue?',
        mockProducts as any,
        mockTransactions as any
      );

      expect(salesResult).toBeDefined();
      // 14995 + 17998 = 32993
      expect(salesResult?.value).toBe(32993);
      expect(salesResult?.formattedValue).toContain('₹32,993');

      const profitResult = executeDeterministicAnalytics(
        'FINANCIAL_ANALYTICS',
        'What is our gross profit and margin?',
        mockProducts as any,
        mockTransactions as any
      );

      expect(profitResult).toBeDefined();
      // COGS = 7500 + 10000 = 17500. Profit = 32993 - 17500 = 15493
      expect(profitResult?.value).toBe(15493);
      expect(profitResult?.formattedValue).toContain('₹15,493');
    });

    it('evaluates supplier rankings correctly', () => {
      const result = executeDeterministicAnalytics(
        'SUPPLIER_ANALYSIS',
        'Which supplier is best?',
        mockProducts as any,
        mockTransactions as any,
        mockSuppliers as any
      );

      expect(result).toBeDefined();
      expect(result?.metricName).toBe('Supplier Ranking & Evaluation');
      expect(result?.summarySentence).toContain('Sonic Audio Labs');
    });
  });

  // 5. QUERY CLASSIFICATION
  describe('5. Query Intent Classifier', () => {
    it('classifies diverse business questions accurately', () => {
      expect(classifyQueryIntent('What is SKU-HEAD-101 stock and margin?')).toBe('PRODUCT_LOOKUP');
      expect(classifyQueryIntent('Where is order ORD-501?')).toBe('ORDER_LOOKUP');
      expect(classifyQueryIntent('Which products are dead stock?')).toBe('INVENTORY');
      expect(classifyQueryIntent('Which products should be reordered?')).toBe('INVENTORY');
      expect(classifyQueryIntent('What was total revenue last month?')).toBe('SALES_ANALYTICS');
      expect(classifyQueryIntent('What is our gross profit margin?')).toBe('FINANCIAL_ANALYTICS');
      expect(classifyQueryIntent('Which supplier is best for lead time?')).toBe('SUPPLIER_ANALYSIS');
      expect(classifyQueryIntent('What is our average order value?')).toBe('CUSTOMER_ANALYSIS');
      expect(classifyQueryIntent('What should I focus on today?')).toBe('OPERATIONAL_FOCUS');
      expect(classifyQueryIntent('Give me the next 5 day plan for sales')).toBe('OPERATIONAL_FOCUS');
      expect(classifyQueryIntent('What problems are customers commonly reporting about our products?')).toBe(
        'QUALITATIVE_SEARCH'
      );
    });
  });

  // 6. HYBRID RETRIEVAL & CITATIONS
  describe('6. Hybrid Retriever & Citations', () => {
    it('retrieves relevant records and attaches verified source citations', async () => {
      const store = new MemoryVectorStore();
      await buildBusinessKnowledgeBase(
        businessA,
        mockProducts as any,
        mockTransactions as any,
        mockSuppliers as any,
        mockOrders as any,
        mockReturns as any,
        null,
        store
      );

      const retriever = new HybridRetriever(store);
      const { results, citations } = await retriever.retrieve(businessA, 'SKU-HEAD-101 headphones stock');

      expect(results.length).toBeGreaterThan(0);
      expect(citations.length).toBeGreaterThan(0);

      const topCitation = citations[0];
      expect(topCitation.sourceRecordId).toBeDefined();
      expect(topCitation.sourceType).toBeDefined();
      expect(topCitation.label).toContain('Product Catalog');
    });
  });

  // 7. FULL RAG ORCHESTRATION
  describe('7. Full RAG Orchestrator Flow', () => {
    it('executes end-to-end RAG query and returns structured answer with citations', async () => {
      const store = new MemoryVectorStore();

      const response = await executeRAGQuery(
        {
          businessId: businessA,
          query: 'Which products are dead stock and how much capital is tied up in them?',
          products: mockProducts as any,
          transactions: mockTransactions as any,
          suppliers: mockSuppliers as any,
          orders: mockOrders as any,
          returns: mockReturns as any,
        },
        store
      );

      expect(response).toBeDefined();
      expect(response.intent).toBe('INVENTORY');
      expect(response.answer.toLowerCase()).toContain('dead stock');
      expect(response.answer).toContain('₹12,000');
      expect(response.citations.length).toBeGreaterThan(0);
      expect(response.analytics).toBeDefined();
      expect(response.confidence).toBe('HIGH');
    });
  });
});
