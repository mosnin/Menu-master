'use server';

import { requireAuth, requireOrgMembership, requireRole } from '@/lib/auth/session';
import { getAutomationEnvReadiness } from '@/lib/config/automation-env';

export async function getAutomationEnvironmentReadinessAction(orgId: string) {
  await requireAuth();
  await requireOrgMembership(orgId);

  try {
    const readiness = getAutomationEnvReadiness();
    return { readiness };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to inspect automation environment' };
  }
}

export async function requireAutomationEnvironmentAction(orgId: string) {
  await requireAuth();
  await requireRole(orgId, ['broker_admin']);

  const readiness = getAutomationEnvReadiness();
  if (!readiness.ready) {
    return {
      error: `Missing required variables: ${readiness.missingRequired.join(', ')}`,
      readiness,
    };
  }

  return { readiness };
}
