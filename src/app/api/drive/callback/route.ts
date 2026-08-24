import { NextRequest, NextResponse } from 'next/server';


export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const { searchParams } = new URL(req.url);
  const errorParam = searchParams.get('error');
  const code = searchParams.get('code');
  const userId = searchParams.get('state'); // state holds our userId

  if (errorParam) {
    console.warn('Google OAuth error from provider:', errorParam);
    return NextResponse.redirect(`${origin}/dashboard/integrations?error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !userId) {
    return NextResponse.redirect(`${origin}/dashboard/integrations?error=${encodeURIComponent('Missing authorization code or user session state.')}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(`${origin}/dashboard/integrations?error=${encodeURIComponent('OAuth credentials missing on server.')}`);
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
      const errMsg = errorData.error_description || errorData.error || 'Token exchange failed';
      return NextResponse.redirect(`${origin}/dashboard/integrations?error=${encodeURIComponent(errMsg)}`);
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // 2. Fetch Google profile info
    let googleEmail = '';
    let googleAccountId = '';
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (profileRes.ok) {
        const profile = await profileRes.json();
        googleEmail = profile.email || '';
        googleAccountId = profile.id || '';
      }
    } catch (e) {
      console.warn('Could not fetch user profile info:', e);
    }

    // 3. Prepare payload for client-side persistence
    const oauthPayload = {
      userId,
      provider: 'google-drive',
      googleEmail,
      googleAccountId,
      accessToken: access_token,
      refreshToken: refresh_token || '',
      expiresIn: expires_in || 3600,
    };

    const encoded = Buffer.from(JSON.stringify(oauthPayload)).toString('base64');
    return NextResponse.redirect(`${origin}/dashboard/integrations?oauth_data=${encodeURIComponent(encoded)}`);
  } catch (err: any) {
    console.error('OAuth Callback Error:', err);
    return NextResponse.redirect(`${origin}/dashboard/integrations?error=${encodeURIComponent(err?.message || 'OAuth Callback Failed')}`);
  }
}
