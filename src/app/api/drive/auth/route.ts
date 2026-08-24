import { NextRequest, NextResponse } from 'next/server';

function getOAuthRedirectUri(req: NextRequest): string {
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') || (url.protocol.startsWith('https') ? 'https' : 'http');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const currentOrigin = `${proto}://${host}`;

  // If explicit GOOGLE_REDIRECT_URI matches current environment host, prioritize it
  if (process.env.GOOGLE_REDIRECT_URI) {
    try {
      const configured = new URL(process.env.GOOGLE_REDIRECT_URI);
      if (configured.host === host) {
        return process.env.GOOGLE_REDIRECT_URI;
      }
    } catch (e) {}
  }

  return `${currentOrigin}/api/drive/callback`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getOAuthRedirectUri(req);

  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth configuration (GOOGLE_CLIENT_ID) is missing on the server.' },
      { status: 500 }
    );
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  const promptParam = searchParams.get('prompt') || 'select_account consent';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `access_type=offline&` +
    `prompt=${encodeURIComponent(promptParam)}&` +
    `state=${encodeURIComponent(userId)}`;

  return NextResponse.redirect(authUrl);
}
