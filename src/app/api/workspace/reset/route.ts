import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, writeBatch, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { DEFAULT_ANALYTICS_SUMMARY } from '@/lib/analytics-aggregator';

export async function POST(req: NextRequest) {
  const userIdFromHeader = req.headers.get('x-user-uid');
  const body = await req.json().catch(() => ({}));
  const userId = userIdFromHeader || body.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const { firestore } = initializeFirebase();
  if (!firestore) {
    return NextResponse.json({ error: 'Firestore unavailable' }, { status: 500 });
  }

  const colNames = [
    'products',
    'orders',
    'suppliers',
    'transactions',
    'categories',
    'returns',
    'custom_attributes',
    'importJobs',
    'import_jobs',
    'google_drive_files',
    'sync_history',
    'mapping_profiles',
    'drive_sync_history',
    'drive_files',
    'drive_mappings',
    'audit_logs',
    'forecasts',
    'insights',
    'simulations',
    'events',
    'tasks',
  ];

  try {
    // 1. Fetch all collections in parallel on server
    const snaps = await Promise.all(
      colNames.map((name) =>
        getDocs(collection(firestore, 'users', userId, name)).catch(() => null)
      )
    );

    const docRefsToDelete: any[] = [];
    snaps.forEach((snap) => {
      if (snap && !snap.empty) {
        snap.docs.forEach((d) => docRefsToDelete.push(d.ref));
      }
    });

    // 2. Integration connection docs
    const integrations = ['google-drive', 'google_drive', 'shopify', 'zoho', 'tally', 'woocommerce'];
    integrations.forEach((name) => {
      docRefsToDelete.push(doc(firestore, 'users', userId, 'integrations', name));
    });

    // 3. Analytics docs
    docRefsToDelete.push(doc(firestore, 'users', userId, 'analytics', 'summary'));
    docRefsToDelete.push(doc(firestore, 'users', userId, 'analytics', 'ai_brief'));

    // 4. Batch commit deletions in chunks of 450
    const CHUNK_SIZE = 450;
    const batchPromises: Promise<void>[] = [];
    for (let i = 0; i < docRefsToDelete.length; i += CHUNK_SIZE) {
      const chunk = docRefsToDelete.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(firestore);
      chunk.forEach((ref) => batch.delete(ref));
      batchPromises.push(batch.commit().catch(() => {}));
    }

    await Promise.all(batchPromises);

    // 5. Reset analytics summary document to default empty state
    await setDoc(
      doc(firestore, 'users', userId, 'analytics', 'summary'),
      DEFAULT_ANALYTICS_SUMMARY
    ).catch(() => {});

    // 6. Reset business profile integration flags
    const profileRef = doc(firestore, 'users', userId, 'settings', 'business_profile');
    await setDoc(
      profileRef,
      {
        inventorySetupMethod: 'manual',
        csvImportedAt: null,
        shopifyConnected: false,
        shopifyStoreUrl: '',
        shopifyStoreName: '',
        shopifyStatus: 'Disconnected',
        isOnboardingCompleted: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      deletedDocsCount: docRefsToDelete.length,
    });
  } catch (error: any) {
    console.error('Server workspace wipe error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to wipe workspace' },
      { status: 500 }
    );
  }
}
