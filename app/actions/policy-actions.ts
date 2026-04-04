'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as transactionService from '@/lib/services/transaction-service';
import * as policyService from '@/lib/services/policy-service';

async function getTransactionOrgId(transactionId: string): Promise<string> {
  const transaction = await transactionService.getTransactionWithDetails(transactionId);
  if (!transaction) throw new Error('Transaction not found');
  return transaction.organization_id;
}

async function getUserOrgId(): Promise<string> {
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');
  const orgId = profile.memberships?.[0]?.organization_id;
  if (!orgId) throw new Error('No organization found');
  return orgId;
}

export async function createPolicyRuleAction(
  data: Record<string, unknown>,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['broker_admin']);

    const rule = await policyService.createPolicyRule(orgId, data, profile.id);

    revalidatePath('/settings/policies');

    return { success: true, data: rule };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create policy rule' };
  }
}

export async function updatePolicyRuleAction(
  ruleId: string,
  data: Record<string, unknown>,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['broker_admin']);

    const rule = await policyService.updatePolicyRule(ruleId, data, profile.id);

    revalidatePath('/settings/policies');

    return { success: true, data: rule };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update policy rule' };
  }
}

export async function togglePolicyRuleAction(
  ruleId: string,
  isActive: boolean,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['broker_admin']);

    const rule = await policyService.togglePolicyRule(ruleId, isActive, profile.id);

    revalidatePath('/settings/policies');

    return { success: true, data: rule };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to toggle policy rule' };
  }
}

export async function getPolicyRulesAction(): Promise<{ data?: any; error?: string }> {
  try {
    await requireAuth();

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const rules = await policyService.getPolicyRules(orgId);
    return { data: rules };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get policy rules' };
  }
}

export async function evaluatePoliciesAction(
  transactionId: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const result = await policyService.evaluatePolicies(transactionId, profile.id);

    revalidatePath(`/transactions/${transactionId}`);

    return { success: true, data: result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to evaluate policies' };
  }
}

export async function requestOverrideAction(
  ruleId: string,
  transactionId: string,
  reason: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const override = await policyService.requestOverride(ruleId, transactionId, reason, profile.id);

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath('/settings/policies');

    return { success: true, data: override };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to request override' };
  }
}

export async function approveOverrideAction(
  overrideId: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['broker_admin']);

    const override = await policyService.approveOverride(overrideId, profile.id);

    revalidatePath('/settings/policies');

    return { success: true, data: override };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to approve override' };
  }
}

export async function rejectOverrideAction(
  overrideId: string,
  reason?: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['broker_admin']);

    const override = await policyService.rejectOverride(overrideId, reason, profile.id);

    revalidatePath('/settings/policies');

    return { success: true, data: override };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to reject override' };
  }
}
