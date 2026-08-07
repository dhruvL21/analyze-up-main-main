import { BusinessFileType, FieldMapping } from '@/ai/flows/import-mapper-constants';

export interface ImportProfile {
  id: string;
  profileName: string;
  fileType: BusinessFileType;
  headersSignature: string;
  headers: string[];
  mapping: FieldMapping;
  createdAt: string;
  useCount: number;
}

const STORAGE_KEY = 'analyzeup_import_profiles_v1';

export function getImportProfiles(): ImportProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading import profiles:', e);
    return [];
  }
}

export function saveImportProfile(
  fileType: BusinessFileType,
  headers: string[],
  mapping: FieldMapping,
  customName?: string
): ImportProfile {
  const profiles = getImportProfiles();
  const headersSignature = headers.slice().sort().join('|').toLowerCase();

  const profileName = customName || `Saved ${fileType.replace('_', ' ')} Format (${headers.length} Cols)`;

  const newProfile: ImportProfile = {
    id: `profile-${Date.now()}`,
    profileName,
    fileType,
    headersSignature,
    headers,
    mapping,
    createdAt: new Date().toISOString(),
    useCount: 1,
  };

  // Filter out any older duplicate signature profile
  const updated = [newProfile, ...profiles.filter(p => p.headersSignature !== headersSignature)];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return newProfile;
}

export function findMatchingImportProfile(headers: string[]): ImportProfile | null {
  const profiles = getImportProfiles();
  if (profiles.length === 0) return null;

  const currentSignature = headers.slice().sort().join('|').toLowerCase();
  
  // 1. Check exact signature match
  const exact = profiles.find(p => p.headersSignature === currentSignature);
  if (exact) {
    return exact;
  }

  // 2. Check subset/high overlap match (>85% matching headers)
  const currentSet = new Set(headers.map(h => h.toLowerCase()));
  for (const p of profiles) {
    const matchCount = p.headers.filter(h => currentSet.has(h.toLowerCase())).length;
    const ratio = matchCount / Math.max(headers.length, p.headers.length);
    if (ratio >= 0.85) {
      return p;
    }
  }

  return null;
}
