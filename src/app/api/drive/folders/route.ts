import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
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

  const token = await getValidAccessToken(userId, firestore);
  if (!token) {
    return NextResponse.json({ error: 'Disconnected: Google Drive not connected or expired.' }, { status: 400 });
  }

  try {
    // Fetch all non-trashed folders
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.folder%27+and+trashed%3Dfalse&fields=files(id%2Cname)&orderBy=name`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to query folders from Drive' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || err }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-uid');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized: Missing User UID' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { folderId, folderName } = body;

  const { firestore } = initializeFirebase();
  if (!firestore) {
    return NextResponse.json({ error: 'Firebase initialization failed' }, { status: 500 });
  }

  const token = await getValidAccessToken(userId, firestore);
  if (!token) {
    return NextResponse.json({ error: 'Disconnected: Google Drive not connected or expired.' }, { status: 400 });
  }

  try {
    let finalFolderId = folderId;
    let finalFolderName = folderName;

    // If no folderId was provided, the user wants us to create "AnalyzeUp_Data_Sync"
    if (!folderId) {
      finalFolderName = 'AnalyzeUp_Data_Sync';
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
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

    // Save selected folder reference to Firestore connection doc
    const connectionRef = doc(firestore, 'users', userId, 'integrations', 'google-drive');
    await updateDoc(connectionRef, {
      selectedFolderId: finalFolderId,
      selectedFolderName: finalFolderName,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      folderId: finalFolderId,
      folderName: finalFolderName,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || err }, { status: 500 });
  }
}
