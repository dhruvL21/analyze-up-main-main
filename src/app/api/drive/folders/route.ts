import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getValidAccessToken } from '@/lib/drive-helper';

export async function GET(req: NextRequest) {
  let token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-drive-token');
  const userId = req.headers.get('x-user-uid');

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
    // Fetch all non-trashed folders (up to 100) with rich metadata
    const fields = 'files(id,name,mimeType,parents,shared,starred,modifiedTime,owners(displayName,emailAddress,me),driveId,webViewLink)';
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.folder%27+and+trashed%3Dfalse&fields=${encodeURIComponent(fields)}&orderBy=name&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: 'Failed to query folders from Drive', details: errData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || err }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-drive-token');
  const userId = req.headers.get('x-user-uid');

  if (!token && userId) {
    const { firestore } = initializeFirebase();
    if (firestore) {
      token = await getValidAccessToken(userId, firestore);
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Disconnected: Google Drive not connected or expired.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { folderId, folderName } = body;

  try {
    let finalFolderId = folderId;
    let finalFolderName = folderName;

    // If no folderId was provided, create "AnalyzeUp_Data_Sync"
    if (!folderId) {
      finalFolderName = 'AnalyzeUp_Data_Sync';
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: finalFolderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: 'Failed to create folder on Google Drive', details: errData },
          { status: createRes.status }
        );
      }

      const createdFolder = await createRes.json();
      finalFolderId = createdFolder.id;
    }

    // Try optional server write if userId & firestore available
    if (userId) {
      try {
        const { firestore } = initializeFirebase();
        if (firestore) {
          const connectionRef = doc(firestore, 'users', userId, 'integrations', 'google-drive');
          await updateDoc(connectionRef, {
            selectedFolderId: finalFolderId,
            selectedFolderName: finalFolderName,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }
      } catch (e) {
        // Handled on client
      }
    }

    return NextResponse.json({
      success: true,
      folderId: finalFolderId,
      folderName: finalFolderName,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || err }, { status: 500 });
  }
}
