'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile, requireAuth, requireOrgMembership, requireRole } from '@/lib/auth/session';
import * as governanceRepo from '@/lib/repositories/workflow-governance';
import {
  assignDelegatedOwnership,
  buildGovernanceOverview,
  createDefaultApprovalChain,
  detectGovernanceGaps,
  ensureRootAndLocalScopes,
} from '@/lib/services/workflow-governance-service';

export async function getGovernanceOverviewAction(orgId: string) {
  try {
    await requireAuth();
    await requireOrgMembership(orgId);
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const overview = await buildGovernanceOverview(orgId, profile.id);
    return { overview };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load governance overview' };
  }
}

export async function bootstrapGovernanceScopesAction(orgId: string) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };
    await requireRole(orgId, ['broker_admin']);

    const result = await ensureRootAndLocalScopes({ orgId, userId: profile.id });
    revalidatePath('/ops/automation-governance');
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to bootstrap governance scopes' };
  }
}

export async function assignDelegatedOwnershipAction(input: {
  orgId: string;
  scopeType: 'organization' | 'office' | 'team' | 'workflow_family' | 'automation_category' | 'template_segment' | 'playbook_segment';
  scopeRef: string;
  assignmentType: 'automation_owner' | 'compliance_reviewer' | 'release_reviewer' | 'office_delegate' | 'team_delegate' | 'enterprise_admin_delegate';
  assetType: 'workflow' | 'template' | 'playbook';
  assetRef: string;
  assignedUserId: string;
  assignedRole: string;
  note?: string;
}) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };
    await requireRole(input.orgId, ['broker_admin']);

    const assignment = await assignDelegatedOwnership({
      ...input,
      actorUserId: profile.id,
    });
    revalidatePath('/ops/automation-governance');
    return { assignment };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to assign delegated ownership' };
  }
}

export async function createApprovalChainAction(input: {
  orgId: string;
  scopeType: 'organization' | 'office' | 'team' | 'workflow_family' | 'automation_category' | 'template_segment' | 'playbook_segment';
  scopeRef: string;
  assetType: 'workflow' | 'template' | 'playbook';
  riskLevel: 'safe' | 'medium_risk' | 'high_risk';
  chainName: string;
}) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };
    await requireRole(input.orgId, ['broker_admin']);

    const chain = await createDefaultApprovalChain({ ...input, actorUserId: profile.id });
    revalidatePath('/ops/automation-governance');
    return chain;
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create approval chain' };
  }
}

export async function createReviewerRouteAction(input: {
  orgId: string;
  scopeId: string;
  routeType: 'approval' | 'attestation' | 'governance_issue';
  riskLevel: 'safe' | 'medium_risk' | 'high_risk';
  targetAssignmentType: string;
  fallbackRole: string;
}) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };
    await requireRole(input.orgId, ['broker_admin']);

    const route = await governanceRepo.createRoute({
      organization_id: input.orgId,
      scope_id: input.scopeId,
      route_type: input.routeType,
      risk_level: input.riskLevel,
      target_assignment_type: input.targetAssignmentType,
      fallback_role: input.fallbackRole,
      created_by_user_id: profile.id,
    });

    revalidatePath('/ops/automation-governance');
    return { route };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create reviewer route' };
  }
}

export async function runGovernanceGapScanAction(orgId: string) {
  try {
    await requireAuth();
    await requireRole(orgId, ['broker_admin']);

    const conflicts = await detectGovernanceGaps(orgId);
    revalidatePath('/ops/automation-governance');
    return { conflicts };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to run governance gap scan' };
  }
}
