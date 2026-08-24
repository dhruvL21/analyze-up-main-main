import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Missing refreshToken parameter' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Missing Google OAuth credentials on server' }, { status: 500 });
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      console.error('Google token refresh error:', errData);
      return NextResponse.json({ error: 'Token refresh failed', details: errData }, { status: tokenRes.status });
    }

    const data = await tokenRes.json();
    return NextResponse.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
    });
  } catch (err: any) {
    console.error('Token refresh route error:', err);
    return NextResponse.json({ error: err?.message || err }, { status: 500 });
  }
}
