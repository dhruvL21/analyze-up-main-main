import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { getValidAccessToken } from '@/lib/drive-helper';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  let token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-drive-token');
  const userId = req.headers.get('x-user-uid');

  const body = await req.json().catch(() => ({}));
  const { fileId, fileName } = body;

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId parameter' }, { status: 400 });
  }

  if (!token && userId) {
    const { firestore } = initializeFirebase();
    if (firestore) {
      token = await getValidAccessToken(userId, firestore);
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Disconnected: Google Drive not connected or expired.' }, { status: 401 });
  }

  try {
    let csvContent = '';
    const lowerName = (fileName || '').toLowerCase();

    // 1. First try regular download with alt=media
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (driveRes.ok) {
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const buffer = await driveRes.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        csvContent = XLSX.utils.sheet_to_csv(worksheet);
      } else {
        csvContent = await driveRes.text();
      }
    } else {
      // If alt=media fails with 400/403, it may be a native Google Sheet (which requires export)
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv&supportsAllDrives=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (exportRes.ok) {
        csvContent = await exportRes.text();
      } else {
        const errData = await driveRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: 'Failed to download or export file from Google Drive', details: errData },
          { status: driveRes.status }
        );
      }
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
