'use server';

import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as diagnosticsService from '@/lib/services/diagnostics-service';
import * as membershipRepo from '@/lib/repositories/memberships';
import type { DiagnosticCheckType } from '@/types';

export async function runDiagnosticsAction() {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };
    const orgId = memberships[0].organization_id;
    await requireRole(orgId, ['broker_admin']);

    const diagnostics = await diagnosticsService.runDiagnostics(orgId);
    return { data: diagnostics };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Diagnostics failed' };
  }
}

export async function getLatestDiagnosticsAction() {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const diagnostics = await diagnosticsService.getLatestDiagnostics(memberships[0].organization_id);
    return { data: diagnostics };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get diagnostics' };
  }
}

export async function getDiagnosticHistoryAction(checkType: DiagnosticCheckType) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const history = await diagnosticsService.getDiagnosticHistory(
      memberships[0].organization_id,
      checkType,
    );
    return { data: history };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get history' };
  }
}
