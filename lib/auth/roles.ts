import { UserRole } from '@/types';

const ROLE_HIERARCHY: Record<string, number> = {
  agent: 1,
  coordinator: 2,
  broker_admin: 3,
};

export function hasMinimumRole(userRole: string, requiredRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 999);
}

export function canManageDocuments(role: string): boolean {
  return hasMinimumRole(role, 'coordinator');
}

export function canManageApprovals(role: string): boolean {
  return hasMinimumRole(role, 'coordinator');
}

export function canManageOrg(role: string): boolean {
  return role === 'broker_admin';
}

export function canCreateTransaction(role: string): boolean {
  return hasMinimumRole(role, 'agent');
}

export function canViewTransaction(role: string): boolean {
  return hasMinimumRole(role, 'agent');
}

export function canInviteMembers(role: string): boolean {
  return hasMinimumRole(role, 'coordinator');
}

export function canRemoveMembers(role: string): boolean {
  return role === 'broker_admin';
}

export function canSuspendMembers(role: string): boolean {
  return role === 'broker_admin';
}

export function canManageWorkflows(role: string): boolean {
  return hasMinimumRole(role, 'coordinator');
}

export function canViewAuditLog(role: string): boolean {
  return hasMinimumRole(role, 'coordinator');
}
