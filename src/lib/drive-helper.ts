import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function getValidAccessToken(userId: string, firestore: any): Promise<string | null> {
  const connectionRef = doc(firestore, 'users', userId, 'integrations', 'google-drive');
  const snap = await getDoc(connectionRef);
  
  if (!snap.exists()) return null;
  
  const data = snap.data();
  const { accessToken, refreshToken, tokenExpiry } = data;
  
  // If token is still valid (with a 2-minute buffer) and present, return it
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry - 120000) {
    return accessToken;
  }
  
  if (!refreshToken) {
    console.warn('Refresh token missing for user:', userId);
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
      connectionStatus: 'Connected',
      updatedAt: new Date().toISOString(),
    });
    
    return newAccessToken;
  } catch (err) {
    console.error('Error refreshing token:', err);
    return null;
  }
}

/**
 * Client-side helper to get a valid Google Drive access token.
 * Refreshes the token via /api/drive/refresh if expired and updates Firestore directly from the authenticated client.
 */
export async function getClientDriveToken(driveConnection: any, user: any, firestore: any): Promise<string | null> {
  if (!driveConnection) return null;
  const { accessToken, refreshToken, tokenExpiry } = driveConnection;

  // If token is still valid (with a 2-minute buffer) and present, return it
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry - 120000) {
    return accessToken;
  }

  if (!refreshToken) {
    console.warn('Refresh token missing for Google Drive connection');
    return null;
  }

  try {
    const res = await fetch('/api/drive/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      console.error('Failed to refresh Google token via API route');
      return null;
    }

    const tokenData = await res.json();
    const newAccessToken = tokenData.accessToken;
    const expiresIn = tokenData.expiresIn || 3600;

    if (user && firestore) {
      const connectionRef = doc(firestore, 'users', user.uid, 'integrations', 'google-drive');
      await updateDoc(connectionRef, {
        accessToken: newAccessToken,
        tokenExpiry: Date.now() + expiresIn * 1000,
        connectionStatus: 'Connected',
        updatedAt: new Date().toISOString(),
      });
    }

    return newAccessToken;
  } catch (err) {
    console.error('Error refreshing client drive token:', err);
    return null;
  }
}

/**
 * Format 24-hr time string (e.g. "09:00", "18:30") to 12-hr format (e.g. "9:00 AM", "6:30 PM")
 */
export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '9:00 AM';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const min = parts[1].padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${min} ${ampm}`;
}

/**
 * Summarize user's Google Drive auto-sync schedule
 */
export function formatScheduleSummary(connection: any): string {
  if (!connection || connection.autoSyncEnabled === false) {
    return 'Paused';
  }

  const freq = connection.autoSyncFrequency || 'daily';
  const time = formatTime12h(connection.autoSyncTime || '09:00');
  const day = connection.autoSyncDay ? connection.autoSyncDay.charAt(0).toUpperCase() + connection.autoSyncDay.slice(1) : 'Monday';

  switch (freq) {
    case '1_hour':
      return 'Every 1 Hour';
    case '6_hours':
      return 'Every 6 Hours';
    case '12_hours':
      return 'Every 12 Hours';
    case 'weekly':
      return `Weekly (${day} ${time})`;
    case 'daily':
    default:
      return `Daily at ${time}`;
  }
}

/**
 * Calculate human-friendly next sync schedule run time
 */
export function getNextSyncTimeDisplay(connection: any): string {
  if (!connection || connection.autoSyncEnabled === false) {
    return 'Auto-sync is currently paused';
  }

  const freq = connection.autoSyncFrequency || 'daily';
  const timeStr = connection.autoSyncTime || '09:00';
  const [targetH, targetM] = timeStr.split(':').map((n: string) => parseInt(n, 10) || 0);

  const now = new Date();

  if (freq === '1_hour') {
    return 'Within the next hour';
  }
  if (freq === '6_hours') {
    return 'Every 6 hours';
  }
  if (freq === '12_hours') {
    return 'Every 12 hours';
  }

  if (freq === 'daily') {
    const next = new Date();
    next.setHours(targetH, targetM, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
      return `Tomorrow at ${formatTime12h(timeStr)}`;
    }
    return `Today at ${formatTime12h(timeStr)}`;
  }

  if (freq === 'weekly') {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDayIdx = dayNames.indexOf((connection.autoSyncDay || 'monday').toLowerCase());
    const dayDisplay = connection.autoSyncDay ? connection.autoSyncDay.charAt(0).toUpperCase() + connection.autoSyncDay.slice(1) : 'Monday';
    
    return `Every ${dayDisplay} at ${formatTime12h(timeStr)}`;
  }

  return `Daily at ${formatTime12h(timeStr)}`;
}

/**
 * Checks if auto-sync is due based on lastSyncAt and schedule configuration
 */
export function isAutoSyncDue(connection: any): boolean {
  if (!connection || connection.autoSyncEnabled === false || !connection.selectedFolderId) {
    return false;
  }

  const lastSync = connection.lastSyncAt ? new Date(connection.lastSyncAt).getTime() : 0;
  const now = Date.now();
  const elapsedMs = now - lastSync;
  const freq = connection.autoSyncFrequency || 'daily';

  // Minimum 5-minute cooldown to prevent rapid spamming
  if (elapsedMs < 5 * 60 * 1000) {
    return false;
  }

  if (freq === '1_hour') {
    return elapsedMs >= 60 * 60 * 1000;
  }
  if (freq === '6_hours') {
    return elapsedMs >= 6 * 60 * 60 * 1000;
  }
  if (freq === '12_hours') {
    return elapsedMs >= 12 * 60 * 60 * 1000;
  }

  if (freq === 'daily' || freq === 'weekly') {
    // If it's been more than 24h since last sync
    if (elapsedMs >= 24 * 60 * 60 * 1000) {
      return true;
    }
  }

  return false;
}
