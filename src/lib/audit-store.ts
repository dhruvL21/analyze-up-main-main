export interface BusinessAuditLog {
  id: string;
  title: string;
  productName: string;
  actionType: 'discount' | 'price_up' | 'reorder' | 'import' | 'sale' | 'supplier' | 'audit';
  changeDetails: string;
  previousValue?: string;
  newValue?: string;
  impactValue?: string;
  timestamp: string;
  performedBy: string;
}

const AUDIT_STORAGE_KEY = 'analyzeup_business_audit_logs';

export function getAuditLogs(): BusinessAuditLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading audit logs:', err);
    return [];
  }
}

export function logBusinessAction(entry: Omit<BusinessAuditLog, 'id' | 'timestamp' | 'performedBy'>): BusinessAuditLog {
  const newLog: BusinessAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
    performedBy: 'Business Founder',
    ...entry,
  };

  if (typeof window !== 'undefined') {
    try {
      const logs = getAuditLogs();
      const updated = [newLog, ...logs].slice(0, 100); // keep last 100 entries
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('analyzeup_audit_logged', { detail: newLog }));
    } catch (err) {
      console.error('Error writing audit log:', err);
    }
  }

  return newLog;
}

export function clearAuditLogs(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUDIT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('analyzeup_audit_logged'));
  }
}
