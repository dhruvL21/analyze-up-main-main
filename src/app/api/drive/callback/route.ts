import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state'); // state holds our userId

  if (!code || !userId) {
    return NextResponse.json({ error: 'Missing code or state parameters' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: 'OAuth credentials missing on server.' }, { status: 500 });
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.json().catch(() => ({}));
      console.error('Google token exchange error:', errorData);
      return NextResponse.json({ error: 'Token exchange failed', details: errorData }, { status: tokenRes.status });
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // 2. Fetch Google profile info
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    let googleEmail = '';
    let googleAccountId = '';

    if (profileRes.ok) {
      const profile = await profileRes.json();
      googleEmail = profile.email || '';
      googleAccountId = profile.id || '';
    }

    // 3. Save connection parameters in Firestore
    const { firestore } = initializeFirebase();
    if (!firestore) {
      return NextResponse.json({ error: 'Firebase Firestore initialization failed' }, { status: 500 });
    }

    const connectionRef = doc(firestore, 'users', userId, 'integrations', 'google-drive');
    const connectionSnap = await getDoc(connectionRef);
    const existingData = connectionSnap.exists() ? connectionSnap.data() : null;

    // Keep the old refresh token if Google didn't return a new one
    const finalRefreshToken = refresh_token || (existingData ? existingData.refreshToken : '');

    await setDoc(connectionRef, {
      userId,
      provider: 'google-drive',
      googleEmail,
      googleAccountId,
      accessToken: access_token,
      refreshToken: finalRefreshToken,
      tokenExpiry: Date.now() + (expires_in || 3600) * 1000,
      connectionStatus: 'Connected',
      createdAt: existingData ? existingData.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    const origin = new URL(req.url).origin;
    return NextResponse.redirect(`${origin}/dashboard/integrations?status=success`);
  } catch (err: any) {
    console.error('OAuth Callback Error:', err);
    return NextResponse.json({ error: 'OAuth Callback Failed', details: err?.message || err }, { status: 500 });
  }
}
