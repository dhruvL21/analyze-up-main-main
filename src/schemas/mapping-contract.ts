/**
 * Model 1 Contract — Universal Data Mapping & Normalization
 */
import { z } from 'zod';

export const Model1MappingResultSchema = z.object({
  mapping: z.record(z.string()).describe('Source column to canonical field key mapping'),
  fieldConfidence: z.record(z.number().min(0).max(100)).describe('Confidence score percentage per field'),
  overallConfidence: z.number().min(0).max(100).describe('Overall dataset mapping confidence'),
  detectedFileType: z.enum([
    'INVENTORY_MASTER',
    'SALES_REPORT',
    'PURCHASE_ORDERS',
    'SUPPLIER_LIST',
    'RETURNS_REPORT',
    'WAREHOUSE_STOCK',
    'UNKNOWN'
  ]),
  warnings: z.array(z.string()).default([]),
  missingFields: z.array(z.string()).default([]),
  lowConfidenceFields: z.array(z.string()).default([]),
  normalizedSchema: z.literal('analyzeup_v1').default('analyzeup_v1'),
  requiresUserConfirmation: z.boolean().default(false),
  sourceHeaders: z.array(z.string()).default([]),
  sampleRows: z.array(z.record(z.any())).default([]),
});

export type Model1MappingResult = z.infer<typeof Model1MappingResultSchema>;

export interface NormalizationOutput<T = any> {
  success: boolean;
  validRecords: T[];
  errorRecords: Array<{
    rowNumber: number;
    rawRow: Record<string, any>;
    errors: string[];
  }>;
  skippedDuplicates: number;
  warnings: string[];
  normalizedSchema: 'analyzeup_v1';
}
