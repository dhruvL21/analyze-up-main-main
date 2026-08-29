import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import {
  createImportJob,
  getImportJob,
  findActiveImportJob,
  updateImportJobBatchProgress,
  getImportJobErrors,
} from '@/lib/import-job-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = req.headers.get('x-user-uid') || searchParams.get('userId');
  const jobId = searchParams.get('jobId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId authorization' }, { status: 401 });
  }

  const { firestore } = initializeFirebase();
  if (!firestore) {
    return NextResponse.json({ error: 'Firestore unavailable' }, { status: 500 });
  }

  try {
    if (jobId) {
      const job = await getImportJob(firestore, userId, jobId);
      if (!job) {
        return NextResponse.json({ error: 'Import job not found' }, { status: 404 });
      }
      const errors = await getImportJobErrors(firestore, userId, jobId, 50);
      return NextResponse.json({ job, errors });
    }

    // Find active job if no specific ID requested
    const activeJob = await findActiveImportJob(firestore, userId);
    return NextResponse.json({ activeJob });
  } catch (err: any) {
    console.error('Import job GET error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch job' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-uid');
  const body = await req.json().catch(() => ({}));
  const { fileName, fileType, totalRecords, batchSize, driveFileId, resumeJobId } = body;

  const targetUserId = userId || body.userId;
  if (!targetUserId) {
    return NextResponse.json({ error: 'Missing user identification' }, { status: 401 });
  }

  const { firestore } = initializeFirebase();
  if (!firestore) {
    return NextResponse.json({ error: 'Firestore unavailable' }, { status: 500 });
  }

  try {
    // If resuming an existing job
    if (resumeJobId) {
      const existing = await getImportJob(firestore, targetUserId, resumeJobId);
      if (!existing) {
        return NextResponse.json({ error: 'Job to resume not found' }, { status: 404 });
      }
      return NextResponse.json({ job: existing, resumed: true });
    }

    if (!fileName || !totalRecords || totalRecords <= 0) {
      return NextResponse.json({ error: 'Invalid file parameters or empty dataset' }, { status: 400 });
    }

    const job = await createImportJob(firestore, targetUserId, {
      fileName,
      fileType: fileType || 'INVENTORY_MASTER',
      totalRecords: Number(totalRecords),
      batchSize: Number(batchSize) || 100,
      driveFileId,
    });

    return NextResponse.json({ job, success: true });
  } catch (err: any) {
    console.error('Import job creation error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create import job' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = req.headers.get('x-user-uid') || searchParams.get('userId');
  const jobId = searchParams.get('jobId');

  if (!userId || !jobId) {
    return NextResponse.json({ error: 'Missing userId or jobId' }, { status: 400 });
  }

  const { firestore } = initializeFirebase();
  if (!firestore) {
    return NextResponse.json({ error: 'Firestore unavailable' }, { status: 500 });
  }

  try {
    await updateImportJobBatchProgress(firestore, userId, jobId, {
      status: 'CANCELLED',
      errorMessage: 'Cancelled by user',
    });
    return NextResponse.json({ success: true, cancelled: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to cancel job' }, { status: 500 });
  }
}
