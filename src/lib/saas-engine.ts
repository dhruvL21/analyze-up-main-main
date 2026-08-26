// 1. Types & Data Models
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER';

export type PlanType = 'FREE' | 'STARTER' | 'GROWTH' | 'PRO';

export type SubscriptionState = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export type FeatureKey =
  | 'AI_COPILOT'
  | 'FORECASTING'
  | 'PROACTIVE_MONITORING'
  | 'SHOPIFY_SYNC'
  | 'ADVANCED_REPORTS'
  | 'TEAM_INVITES'
  | 'AUDIT_LOGS'
  | 'EXPORT_DATA';

export type UsageKey = 'products' | 'aiQueries' | 'reports' | 'teamMembers' | 'shopifySyncs';

export interface WorkspacePermission {
  key: string;
  label: string;
  description: string;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  joinedAt: string;
  avatarUrl?: string;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  token: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
}

export interface Workspace {
  id: string;
  tenantId: string;
  name: string;
  ownerId: string;
  plan: PlanType;
  subscriptionState: SubscriptionState;
  currency: string;
  timezone: string;
  createdAt: string;
  currentPeriodEnd: string;
  members: WorkspaceMember[];
}

export interface PlanConfig {
  key: PlanType;
  name: string;
  priceMonthly: number; // In INR
  priceMonthlyUSD: number;
  productLimit: number;
  aiQueriesLimit: number;
  reportsLimit: number;
  teamMembersLimit: number;
  shopifySyncAllowed: boolean;
  forecastingAllowed: boolean;
  proactiveMonitoringAllowed: boolean;
  auditLogsAllowed: boolean;
  features: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: WorkspaceRole;
  action: string;
  details: string;
  category: 'INVITATION' | 'ROLE_CHANGE' | 'PRODUCT' | 'BILLING' | 'SETTINGS' | 'INTEGRATION';
}

// 2. Centralized Plan Definitions
export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  FREE: {
    key: 'FREE',
    name: 'Free Trial',
    priceMonthly: 0,
    priceMonthlyUSD: 0,
    productLimit: 50,
    aiQueriesLimit: 20,
    reportsLimit: 5,
    teamMembersLimit: 1,
    shopifySyncAllowed: false,
    forecastingAllowed: false,
    proactiveMonitoringAllowed: true,
    auditLogsAllowed: false,
    features: [
      'Up to 50 Products',
      '20 Monthly AI Queries',
      'Basic Inventory Intelligence',
      '5 Report Snapshots',
      'Single User Access',
    ],
  },
  STARTER: {
    key: 'STARTER',
    name: 'Starter Plan',
    priceMonthly: 1499,
    priceMonthlyUSD: 19,
    productLimit: 250,
    aiQueriesLimit: 100,
    reportsLimit: 25,
    teamMembersLimit: 3,
    shopifySyncAllowed: true,
    forecastingAllowed: true,
    proactiveMonitoringAllowed: true,
    auditLogsAllowed: true,
    features: [
      'Up to 250 Products',
      '100 Monthly AI Queries',
      'Supplier Intelligence',
      '30-Day Demand Forecasting',
      'Shopify Sync Integration',
      'Up to 3 Team Members',
    ],
  },
  GROWTH: {
    key: 'GROWTH',
    name: 'Growth Plan',
    priceMonthly: 3999,
    priceMonthlyUSD: 49,
    productLimit: 1000,
    aiQueriesLimit: 500,
    reportsLimit: 100,
    teamMembersLimit: 10,
    shopifySyncAllowed: true,
    forecastingAllowed: true,
    proactiveMonitoringAllowed: true,
    auditLogsAllowed: true,
    features: [
      'Up to 1,000 Products',
      '500 Monthly AI Queries',
      'Executive Intelligence Suite',
      '90-Day Demand Forecasting',
      'Full Proactive Automation',
      'Up to 10 Team Members',
      'Audit Logging',
    ],
  },
  PRO: {
    key: 'PRO',
    name: 'Enterprise Pro',
    priceMonthly: 8999,
    priceMonthlyUSD: 99,
    productLimit: 10000,
    aiQueriesLimit: 5000,
    reportsLimit: 1000,
    teamMembersLimit: 25,
    shopifySyncAllowed: true,
    forecastingAllowed: true,
    proactiveMonitoringAllowed: true,
    auditLogsAllowed: true,
    features: [
      'Up to 10,000 Products',
      '5,000 Monthly AI Queries',
      'Unlimited Executive Reports',
      'Scenario Simulator',
      'Priority AI Copilot Engine',
      'Up to 25 Team Members',
      'Dedicated Account Support',
    ],
  },
};

// 3. Central Feature Entitlement Check
export function canUseFeature(plan: PlanType = 'FREE', feature: FeatureKey): boolean {
  const config = PLAN_CONFIGS[plan] || PLAN_CONFIGS.FREE;

  switch (feature) {
    case 'AI_COPILOT':
      return true;
    case 'FORECASTING':
      return config.forecastingAllowed;
    case 'PROACTIVE_MONITORING':
      return config.proactiveMonitoringAllowed;
    case 'SHOPIFY_SYNC':
      return config.shopifySyncAllowed;
    case 'ADVANCED_REPORTS':
      return plan === 'GROWTH' || plan === 'PRO';
    case 'TEAM_INVITES':
      return config.teamMembersLimit > 1;
    case 'AUDIT_LOGS':
      return config.auditLogsAllowed;
    case 'EXPORT_DATA':
      return true;
    default:
      return true;
  }
}

// 4. Central Usage Limit Check
export function checkUsageLimit(
  plan: PlanType = 'FREE',
  usageKey: UsageKey,
  currentCount: number
): {
  allowed: boolean;
  limit: number;
  usagePercent: number;
  isWarning80: boolean;
  isBlocked100: boolean;
  message: string;
} {
  const config = PLAN_CONFIGS[plan] || PLAN_CONFIGS.FREE;

  let limit = 100;
  if (usageKey === 'products') limit = config.productLimit;
  if (usageKey === 'aiQueries') limit = config.aiQueriesLimit;
  if (usageKey === 'reports') limit = config.reportsLimit;
  if (usageKey === 'teamMembers') limit = config.teamMembersLimit;
  if (usageKey === 'shopifySyncs') limit = plan === 'FREE' ? 0 : 50;

  const usagePercent = Math.min(100, Math.round((currentCount / limit) * 100));
  const isWarning80 = usagePercent >= 80 && usagePercent < 100;
  const isBlocked100 = currentCount >= limit;
  const allowed = !isBlocked100;

  let message = `Using ${currentCount} of ${limit} allowed ${usageKey}.`;
  if (isWarning80) {
    message = `⚠️ Warning: You have reached ${usagePercent}% of your monthly ${usageKey} limit (${currentCount}/${limit}). Upgrade plan to avoid interruption.`;
  }
  if (isBlocked100) {
    message = `🚫 Monthly limit reached: You have used all ${limit} ${usageKey} on the ${config.name}. Please upgrade to continue.`;
  }

  return {
    allowed,
    limit,
    usagePercent,
    isWarning80,
    isBlocked100,
    message,
  };
}

// 5. Role-Based Permissions Matrix
export function hasPermission(role: WorkspaceRole = 'OWNER', permissionKey: string): boolean {
  if (role === 'OWNER') return true;

  const rolePermissions: Record<WorkspaceRole, string[]> = {
    OWNER: ['ALL'],
    ADMIN: [
      'view_dashboard',
      'manage_products',
      'manage_inventory',
      'manage_orders',
      'manage_suppliers',
      'manage_purchase_orders',
      'view_reports',
      'generate_reports',
      'use_ai_copilot',
      'manage_integrations',
      'manage_team',
      'manage_workspace',
    ],
    MANAGER: [
      'view_dashboard',
      'manage_products',
      'manage_inventory',
      'manage_orders',
      'manage_suppliers',
      'manage_purchase_orders',
      'view_reports',
      'generate_reports',
      'use_ai_copilot',
    ],
    STAFF: [
      'view_dashboard',
      'manage_products',
      'manage_inventory',
      'manage_orders',
      'view_reports',
      'use_ai_copilot',
    ],
    VIEWER: ['view_dashboard', 'view_reports'],
  };

  const allowedList = rolePermissions[role] || [];
  return allowedList.includes('ALL') || allowedList.includes(permissionKey);
}

// 6. Audit Logger System
const AUDIT_LOG_STORAGE_KEY = 'analyzeup_workspace_audit_log_v1';

export function logWorkspaceAction(
  userId: string,
  userName: string,
  userRole: WorkspaceRole,
  action: string,
  details: string,
  category: AuditLogEntry['category'] = 'SETTINGS'
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    userRole,
    action,
    details,
    category,
  };

  try {
    const existing = getStoredAuditLogs();
    const updated = [entry, ...existing.slice(0, 49)];
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.error('Failed to log workspace audit action:', err);
  }

  return entry;
}

export function getStoredAuditLogs(): AuditLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
