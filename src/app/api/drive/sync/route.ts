import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { getValidAccessToken } from '@/lib/drive-helper';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-uid');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized: Missing User UID' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { fileId, fileName } = body;

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId parameter' }, { status: 400 });
  }

  const { firestore } = initializeFirebase();
  if (!firestore) {
    return NextResponse.json({ error: 'Firebase initialization failed' }, { status: 500 });
  }

  const token = await getValidAccessToken(userId, firestore);
  if (!token) {
    return NextResponse.json({ error: 'Disconnected: Google Drive not connected or expired.' }, { status: 400 });
  }

  try {
    // 1. Fetch file content from Google Drive
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!driveRes.ok) {
      return NextResponse.json({ error: 'Failed to download file from Google Drive' }, { status: driveRes.status });
    }

    const lowerName = (fileName || '').toLowerCase();
    let csvContent = '';

    if (lowerName.endsWith('.csv')) {
      csvContent = await driveRes.text();
    } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      const buffer = await driveRes.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      csvContent = XLSX.utils.sheet_to_csv(worksheet);
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      fileId,
      fileName,
      csvContent,
    });
  } catch (err: any) {
    console.error('File Sync Download Error:', err);
    return NextResponse.json({ error: err?.message || err }, { status: 500 });
  }
}
