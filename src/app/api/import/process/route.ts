import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import {
  getImportJob,
  updateImportJobBatchProgress,
  logImportJobErrors,
  generateProductDocId,
  generateTransactionDocId,
  executeWithRetry,
  type ImportErrorRecord,
} from '@/lib/import-job-service';
import { normalizeToProducts, normalizeToSales } from '@/lib/ingestion/data-validator';
import { recalculateAndSaveAnalyticsSummary } from '@/lib/analytics-aggregator';
import { serializePlainData } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const userIdFromHeader = req.headers.get('x-user-uid');
  const body = await req.json().catch(() => ({}));

  const {
    jobId,
    userId: userIdFromBody,
    batchNumber,
    rawRows,
    fieldMapping,
    fileType,
    startRowIndex = 0,
  } = body;

  const userId = userIdFromHeader || userIdFromBody;
  if (!userId || !jobId) {
    return NextResponse.json({ error: 'Missing userId or jobId' }, { status: 400 });
  }

  if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
    return NextResponse.json({ error: 'No data rows provided for batch' }, { status: 400 });
  }

  const { firestore } = initializeFirebase();
  if (!firestore) {
    return NextResponse.json({ error: 'Firestore unavailable' }, { status: 500 });
  }

  try {
    const job = await getImportJob(firestore, userId, jobId);
    if (!job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 });
    }

    if (job.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Import job was cancelled by user', cancelled: true }, { status: 400 });
    }

    // Set job status to IMPORTING if it was QUEUED
    if (job.status === 'QUEUED' || job.status === 'VALIDATING') {
      await updateImportJobBatchProgress(firestore, userId, jobId, {
        status: 'IMPORTING',
        startedAt: job.startedAt || new Date().toISOString(),
      });
    }

    const currentBatchNum = Number(batchNumber) || 1;
    const errorsToLog: Omit<ImportErrorRecord, 'createdAt' | 'jobId'>[] = [];
    let successfulInThisBatch = 0;
    let failedInThisBatch = 0;

    const isSalesReport = fileType === 'SALES_REPORT';

    if (isSalesReport) {
      // 1. Process Sales Report Batch
      const normResult = normalizeToSales(rawRows, fieldMapping || {});

      // Record validation errors
      normResult.errorRecords.forEach(err => {
        failedInThisBatch++;
        errorsToLog.push({
          batchNumber: currentBatchNum,
          rowNumber: startRowIndex + err.rowNumber,
          recordIdentifier: (err.rawRow as any)?.order_number || (err.rawRow as any)?.product_name || `Row ${startRowIndex + err.rowNumber}`,
          error: err.errors.join(', '),
          errorType: 'VALIDATION',
          retryable: false,
          rawData: serializePlainData(err.rawRow),
        });
      });

      // Write valid sales records & companion products via idempotent upsert
      if (normResult.validRecords.length > 0) {
        await executeWithRetry(async () => {
          const batch = writeBatch(firestore);

          normResult.validRecords.forEach((sale, idx) => {
            const rowIdx = startRowIndex + idx + 1;
            const txDocId = generateTransactionDocId(sale.order_number, sale.sku, sale.sale_date, rowIdx);
            const txRef = doc(firestore, 'users', userId, 'transactions', txDocId);

            batch.set(
              txRef,
              serializePlainData({
                ...sale,
                id: txDocId,
                type: 'Sale',
                userId,
                tenantId: userId,
                createdAt: sale.created_at || serverTimestamp(),
                updatedAt: serverTimestamp(),
              }),
              { merge: true }
            );

            // Auto-upsert product catalog entry
            const prodDocId = generateProductDocId(sale.sku, sale.product_name);
            const prodRef = doc(firestore, 'users', userId, 'products', prodDocId);
            batch.set(
              prodRef,
              serializePlainData({
                id: prodDocId,
                name: sale.product_name,
                sku: sale.sku,
                category: sale.category || 'General',
                price: sale.selling_price,
                costPrice: sale.cost_per_unit,
                supplier: sale.supplier_name || '',
                userId,
                tenantId: userId,
                status: 'Active',
                updatedAt: serverTimestamp(),
              }),
              { merge: true }
            );

            successfulInThisBatch++;
          });

          await batch.commit();
        });
      }
    } else {
      // 2. Process Inventory / Master Catalog Batch
      const normResult = normalizeToProducts(rawRows, fieldMapping || {});

      // Record validation errors
      normResult.errorRecords.forEach(err => {
        failedInThisBatch++;
        errorsToLog.push({
          batchNumber: currentBatchNum,
          rowNumber: startRowIndex + err.rowNumber,
          recordIdentifier: (err.rawRow as any)?.sku || (err.rawRow as any)?.name || `Row ${startRowIndex + err.rowNumber}`,
          error: err.errors.join(', '),
          errorType: 'VALIDATION',
          retryable: false,
          rawData: serializePlainData(err.rawRow),
        });
      });

      // Write valid products via idempotent upsert
      if (normResult.validRecords.length > 0) {
        await executeWithRetry(async () => {
          const batch = writeBatch(firestore);

          normResult.validRecords.forEach(prod => {
            const prodDocId = generateProductDocId(prod.sku, prod.product_name);
            const prodRef = doc(firestore, 'users', userId, 'products', prodDocId);

            batch.set(
              prodRef,
              serializePlainData({
                id: prodDocId,
                name: prod.product_name,
                sku: prod.sku,
                category: prod.category || 'General',
                stock: prod.inventory_quantity,
                minStock: prod.min_stock,
                maxStock: prod.max_stock,
                price: prod.price,
                costPrice: prod.cost_price,
                supplier: prod.supplier_name,
                supplierId: prod.supplier_id,
                leadTimeDays: prod.lead_time_days,
                unit: prod.unit,
                brand: prod.brand,
                barcode: prod.barcode,
                description: prod.description,
                userId,
                tenantId: userId,
                status: 'Active',
                createdAt: prod.created_at || serverTimestamp(),
                updatedAt: serverTimestamp(),
              }),
              { merge: true }
            );

            successfulInThisBatch++;
          });

          await batch.commit();
        });
      }
    }

    // Log any errors to error subcollection
    if (errorsToLog.length > 0) {
      await logImportJobErrors(firestore, userId, jobId, errorsToLog);
    }

    // Update job metrics and checkpoint progress
    const updatedProcessed = (job.processedRecords || 0) + rawRows.length;
    const updatedSuccessful = (job.successfulRecords || 0) + successfulInThisBatch;
    const updatedFailed = (job.failedRecords || 0) + failedInThisBatch;
    const totalBatches = job.totalBatches || Math.max(1, Math.ceil(job.totalRecords / (job.batchSize || 100)));
    const isFinished = currentBatchNum >= totalBatches || updatedProcessed >= job.totalRecords;
    const progress = Math.min(100, Math.round((updatedProcessed / job.totalRecords) * 100));

    const patch: any = {
      processedRecords: updatedProcessed,
      successfulRecords: updatedSuccessful,
      failedRecords: updatedFailed,
      currentBatch: currentBatchNum,
      progress,
    };

    if (isFinished) {
      patch.status = updatedFailed > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
      patch.progress = 100;
      patch.completedAt = new Date().toISOString();
    }

    await updateImportJobBatchProgress(firestore, userId, jobId, patch);

    // If completed, trigger background analytics aggregation
    if (isFinished) {
      // Run analytics aggregation
      recalculateAndSaveAnalyticsSummary(firestore, userId).catch(err => {
        console.warn('Analytics recalculation after import finished:', err);
      });
    }

    return NextResponse.json({
      success: true,
      jobId,
      batchNumber: currentBatchNum,
      processed: rawRows.length,
      successful: successfulInThisBatch,
      failed: failedInThisBatch,
      isFinished,
      nextBatch: isFinished ? null : currentBatchNum + 1,
      progress,
    });
  } catch (err: any) {
    console.error(`Error processing import batch ${batchNumber}:`, err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process batch', batchNumber },
      { status: 500 }
    );
  }
}
