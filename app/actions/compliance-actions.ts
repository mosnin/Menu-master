'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as transactionService from '@/lib/services/transaction-service';
import * as complianceService from '@/lib/services/compliance-service';

async function getTransactionOrgId(transactionId: string): Promise<string> {
  const transaction = await transactionService.getTransactionWithDetails(transactionId);
  if (!transaction) throw new Error('Transaction not found');
  return transaction.organization_id;
}

export async function scanComplianceAction(
  transactionId: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const result = await complianceService.scanCompliance(transactionId, profile.id);

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath(`/transactions/${transactionId}/compliance`);
    revalidatePath('/compliance');

    return { success: true, data: result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to scan compliance' };
  }
}

export async function getComplianceIssuesAction(
  transactionId: string,
): Promise<{ data?: any; error?: string }> {
  try {
    await requireAuth();

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const issues = await complianceService.getComplianceIssues(transactionId);
    return { data: issues };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get compliance issues' };
  }
}

export async function getComplianceQueueAction(
  filters?: Record<string, unknown>,
): Promise<{ data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = profile.memberships?.[0]?.organization_id;
    if (!orgId) return { error: 'No organization found' };

    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const queue = await complianceService.getComplianceQueue(orgId, filters);
    return { data: queue };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get compliance queue' };
  }
}

export async function assignComplianceIssueAction(
  issueId: string,
  assigneeId: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const issue = await complianceService.getComplianceIssue(issueId);
    if (!issue) return { error: 'Compliance issue not found' };

    const orgId = await getTransactionOrgId(issue.transaction_id);
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const updated = await complianceService.assignComplianceIssue(issueId, assigneeId, profile.id);

    revalidatePath('/compliance');
    revalidatePath(`/transactions/${issue.transaction_id}/compliance`);

    return { success: true, data: updated };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to assign compliance issue' };
  }
}

export async function resolveComplianceIssueAction(
  issueId: string,
  notes: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const issue = await complianceService.getComplianceIssue(issueId);
    if (!issue) return { error: 'Compliance issue not found' };

    const orgId = await getTransactionOrgId(issue.transaction_id);
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const resolved = await complianceService.resolveComplianceIssue(issueId, notes, profile.id);

    revalidatePath('/compliance');
    revalidatePath(`/transactions/${issue.transaction_id}/compliance`);

    return { success: true, data: resolved };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to resolve compliance issue' };
  }
}

export async function overrideComplianceIssueAction(
  issueId: string,
  reason: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const issue = await complianceService.getComplianceIssue(issueId);
    if (!issue) return { error: 'Compliance issue not found' };

    const orgId = await getTransactionOrgId(issue.transaction_id);
    await requireRole(orgId, ['broker_admin']);

    const overridden = await complianceService.overrideComplianceIssue(issueId, reason, profile.id);

    revalidatePath('/compliance');
    revalidatePath(`/transactions/${issue.transaction_id}/compliance`);

    return { success: true, data: overridden };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to override compliance issue' };
  }
}

export async function addComplianceCommentAction(
  issueId: string,
  body: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const issue = await complianceService.getComplianceIssue(issueId);
    if (!issue) return { error: 'Compliance issue not found' };

    const orgId = await getTransactionOrgId(issue.transaction_id);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const comment = await complianceService.addComplianceComment(issueId, body, profile.id);

    revalidatePath(`/transactions/${issue.transaction_id}/compliance`);

    return { success: true, data: comment };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to add compliance comment' };
  }
}

export async function getComplianceStatsAction(): Promise<{ data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = profile.memberships?.[0]?.organization_id;
    if (!orgId) return { error: 'No organization found' };

    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const stats = await complianceService.getComplianceStats(orgId);
    return { data: stats };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get compliance stats' };
  }
}
