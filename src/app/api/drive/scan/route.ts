import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { getValidAccessToken } from '@/lib/drive-helper';

export async function GET(req: NextRequest) {
  let token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-drive-token');
  const userId = req.headers.get('x-user-uid');
  const { searchParams } = new URL(req.url);
  let selectedFolderId = searchParams.get('folderId');
  let selectedFolderName = searchParams.get('folderName') || '';

  if (!token && userId) {
    const { firestore } = initializeFirebase();
    if (firestore) {
      token = await getValidAccessToken(userId, firestore);
      if (!selectedFolderId) {
        const connectionRef = doc(firestore, 'users', userId, 'integrations', 'google-drive');
        const connectionSnap = await getDoc(connectionRef).catch(() => null);
        if (connectionSnap && connectionSnap.exists()) {
          selectedFolderId = connectionSnap.data()?.selectedFolderId || null;
          selectedFolderName = connectionSnap.data()?.selectedFolderName || '';
        }
      }
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Disconnected: Google Drive token refresh failed' }, { status: 401 });
  }

  if (!selectedFolderId) {
    return NextResponse.json({ success: true, files: [], folderNotSelected: true, folderId: null, folderName: null });
  }

  try {
    // 1. Fetch files in selected folder
    const qStr = `'${selectedFolderId}' in parents and trashed = false`;
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qStr)}&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=name&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!driveRes.ok) {
      const errData = await driveRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to scan files in Drive', details: errData },
        { status: driveRes.status }
      );
    }

    const driveData = await driveRes.json();
    const rawFiles = driveData.files || [];

    // Filter supported data files (Google Sheets, Excel, CSV, TSV, text) - exclude subfolders and Google Docs/Slides
    const supportedFiles = rawFiles.filter((f: any) => {
      const name = (f.name || '').toLowerCase();
      const mime = (f.mimeType || '').toLowerCase();

      // Exclude sub-folders and Google Docs/Presentations/Drawings
      if (mime === 'application/vnd.google-apps.folder') return false;
      if (mime.includes('document') || mime.includes('presentation') || mime.includes('drawing') || mime.includes('form')) return false;

      const isGoogleSheet = mime === 'application/vnd.google-apps.spreadsheet';
      const isSpreadsheetMime = mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('ms-excel') || mime.includes('officedocument');
      const isTextOrCsv = mime.includes('csv') || mime.includes('comma-separated') || mime.includes('tab-separated') || mime.includes('text/plain') || mime.includes('octet-stream');
      const hasSpreadsheetExt = name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.tsv') || name.endsWith('.txt');

      return isGoogleSheet || isSpreadsheetMime || isTextOrCsv || hasSpreadsheetExt || !mime.startsWith('application/vnd.google-apps');
    });

    // 2. Fetch previously tracked files from Firestore if available
    const trackedFilesMap = new Map<string, any>();
    if (userId) {
      try {
        const { firestore } = initializeFirebase();
        if (firestore) {
          const filesCollectionRef = collection(firestore, 'users', userId, 'google_drive_files');
          const filesSnap = await getDocs(filesCollectionRef).catch(() => null);
          if (filesSnap) {
            filesSnap.forEach(d => {
              trackedFilesMap.set(d.id, d.data());
            });
          }
        }
      } catch (e) {
        // Handled silently
      }
    }

    // 3. Compute status for each file
    const filesList = supportedFiles.map((f: any) => {
      const tracked = trackedFilesMap.get(f.id);
      const sizeBytes = parseInt(f.size) || 0;
      const modifiedTime = f.modifiedTime;

      let status = 'New'; // 'New' | 'Synced' | 'Modified' | 'Deleted' | 'Needs Mapping' | 'Needs Review'
      let lastSyncAt = null;
      let errorStatus = null;
      let recordCount = 0;

      if (tracked) {
        lastSyncAt = tracked.lastProcessedAt || tracked.updatedAt || null;
        recordCount = tracked.validRows || 0;
        errorStatus = tracked.errorStatus || null;

        if (tracked.status === 'Deleted' || tracked.status === 'Tombstoned') {
          // If the file in Google Drive has not been updated since it was deleted, preserve Deleted tombstone
          const deletedTime = tracked.deletedAt ? new Date(tracked.deletedAt).getTime() : 0;
          const modTime = modifiedTime ? new Date(modifiedTime).getTime() : 0;
          if (modTime > 0 && deletedTime > 0 && modTime > deletedTime) {
            status = 'Modified';
          } else {
            status = 'Deleted';
          }
        } else if (tracked.status === 'Needs Review') {
          status = 'Needs Review';
        } else if (tracked.modifiedTime === modifiedTime && tracked.size === sizeBytes && tracked.status === 'Synced') {
          status = 'Synced';
        } else {
          status = 'Modified';
        }
      }

      return {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        sizeBytes,
        modifiedTime,
        status,
        lastSyncAt,
        recordCount,
        errorStatus,
      };
    });

    return NextResponse.json({
      success: true,
      folderId: selectedFolderId,
      folderName: selectedFolderName,
      files: filesList,
    });
  } catch (err: any) {
    console.error('Drive Scanner Error:', err);
    return NextResponse.json({ error: err?.message || err }, { status: 500 });
  }
}
