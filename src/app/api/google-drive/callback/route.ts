import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams.toString();
  const proto = req.headers.get('x-forwarded-proto') || (url.protocol.startsWith('https') ? 'https' : 'http');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const targetUrl = `${proto}://${host}/api/drive/callback${searchParams ? `?${searchParams}` : ''}`;

  return NextResponse.redirect(targetUrl);
}
