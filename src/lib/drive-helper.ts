import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function getValidAccessToken(userId: string, firestore: any): Promise<string | null> {
  const connectionRef = doc(firestore, 'users', userId, 'integrations', 'google-drive');
  const snap = await getDoc(connectionRef);
  
  if (!snap.exists()) return null;
  
  const data = snap.data();
  const { accessToken, refreshToken, tokenExpiry } = data;
  
  // If token is still valid (with a 2-minute buffer), return it
  if (tokenExpiry && Date.now() < tokenExpiry - 120000) {
    return accessToken;
  }
  
  if (!refreshToken) {
    console.error('Refresh token missing for user:', userId);
    return null;
  }
  
  // Refresh token request to Google OAuth
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!res.ok) {
      console.error('Failed to refresh Google token:', await res.json().catch(() => ({})));
      return null;
    }
    
    const tokenData = await res.json();
    const newAccessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600;
    
    await updateDoc(connectionRef, {
      accessToken: newAccessToken,
      tokenExpiry: Date.now() + expiresIn * 1000,
      updatedAt: new Date().toISOString(),
    });
    
    return newAccessToken;
  } catch (err) {
    console.error('Error refreshing token:', err);
    return null;
  }
}
