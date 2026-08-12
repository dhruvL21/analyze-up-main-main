import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { getValidAccessToken } from '@/lib/drive-helper';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-uid');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized: Missing User UID' }, { status: 401 });
  }

  const { firestore } = initializeFirebase();
  if (!firestore) {
    return NextResponse.json({ error: 'Firebase initialization failed' }, { status: 500 });
  }

  const connectionRef = doc(firestore, 'users', userId, 'integrations', 'google-drive');
  const connectionSnap = await getDoc(connectionRef);

  if (!connectionSnap.exists()) {
    return NextResponse.json({ error: 'Google Drive connection not found' }, { status: 404 });
  }

  const connData = connectionSnap.data();
  const { selectedFolderId, selectedFolderName } = connData;

  if (!selectedFolderId) {
    return NextResponse.json({ error: 'No sync folder selected', folderNotSelected: true });
  }

  const token = await getValidAccessToken(userId, firestore);
  if (!token) {
    return NextResponse.json({ error: 'Disconnected: Google Drive token refresh failed' }, { status: 400 });
  }

  try {
    // 1. Fetch files in selected folder
    const qStr = `'${selectedFolderId}' in parents and trashed = false`;
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qStr)}&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=name`,
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

    // Filter only supported spreadsheet/CSV files
    const supportedFiles = rawFiles.filter((f: any) => {
      const name = (f.name || '').toLowerCase();
      return name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls');
    });

    // 2. Fetch previously tracked files from Firestore
    const filesCollectionRef = collection(firestore, 'users', userId, 'google_drive_files');
    const filesSnap = await getDocs(filesCollectionRef);
    const trackedFilesMap = new Map<string, any>();
    filesSnap.forEach(d => {
      trackedFilesMap.set(d.id, d.data());
    });

    // 3. Compute status for each file
    const filesList = supportedFiles.map((f: any) => {
      const tracked = trackedFilesMap.get(f.id);
      const sizeBytes = parseInt(f.size) || 0;
      const modifiedTime = f.modifiedTime;

      let status = 'New'; // 'New' | 'Synced' | 'Modified' | 'Needs Mapping' | 'Needs Review'
      let lastSyncAt = null;
      let errorStatus = null;
      let recordCount = 0;

      if (tracked) {
        lastSyncAt = tracked.lastProcessedAt || tracked.updatedAt || null;
        recordCount = tracked.validRows || 0;
        errorStatus = tracked.errorStatus || null;

        if (tracked.status === 'Needs Review') {
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
