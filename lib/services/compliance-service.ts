import { supabase } from '@/lib/db/client';
import * as issueRepo from '@/lib/repositories/compliance-issues';
import * as commentRepo from '@/lib/repositories/compliance-issue-comments';
import * as policyRuleRepo from '@/lib/repositories/policy-rules';
import { logAction } from '@/lib/audit/logger';
import type {
  ComplianceIssue,
  ComplianceIssueCategory,
  ComplianceIssueComment,
  ComplianceIssueStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// scanCompliance — deterministic scan that creates compliance issues
// ---------------------------------------------------------------------------

export async function scanCompliance(
  transactionId: string,
  userId: string,
): Promise<ComplianceIssue[]> {
  const detected: ComplianceIssue[] = [];

  // Fetch transaction
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, organization_id, status, updated_at')
    .eq('id', transactionId)
    .single();

  if (!transaction) return [];

  const orgId = transaction.organization_id;

  // Fetch existing open issues for dedup
  const existingIssues = await issueRepo.findByTransactionId(transactionId);
  const openIssueKeys = new Set(
    existingIssues
      .filter((i) => i.status !== 'resolved' && i.status !== 'overridden')
      .map((i) => `${i.category}:${i.transaction_id}`),
  );

  function hasOpenIssue(category: ComplianceIssueCategory): boolean {
    return openIssueKeys.has(`${category}:${transactionId}`);
  }

  // 1. Missing required documents (based on policy_rules with category='required_document')
  const docRules = await policyRuleRepo.findActiveByOrg(orgId);
  const requiredDocRules = docRules.filter((r) => r.category === 'required_document');

  for (const rule of requiredDocRules) {
    const requiredType = (rule.rule_config as Record<string, unknown>).document_type as string | undefined;
    if (!requiredType) continue;

    const { data: docs } = await supabase
      .from('documents')
      .select('id')
      .eq('transaction_id', transactionId)
      .eq('document_type', requiredType)
      .limit(1);

    if (!docs?.length && !hasOpenIssue('missing_document')) {
      const issue = await issueRepo.create({
        organization_id: orgId,
        transaction_id: transactionId,
        category: 'missing_document',
        severity: 'critical',
        title: `Missing required document: ${requiredType}`,
        description: `Policy "${rule.name}" requires document type "${requiredType}" but none was found.`,
        status: 'open',
        assigned_to_user_id: null,
        resolved_by_user_id: null,
        resolved_at: null,
        resolution_notes: null,
        policy_rule_id: rule.id,
        metadata: { document_type: requiredType, rule_id: rule.id },
      });
      detected.push(issue);
      openIssueKeys.add(`missing_document:${transactionId}`);
    }
  }

  // 2. Missing approvals (pending approvals past SLA)
  const { data: pendingApprovals } = await supabase
    .from('approvals')
    .select('id, approval_type, created_at')
    .eq('transaction_id', transactionId)
    .eq('status', 'pending');

  const SLA_HOURS = 48;
  for (const approval of pendingApprovals ?? []) {
    const hoursSinceCreated =
      (Date.now() - new Date(approval.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreated > SLA_HOURS && !hasOpenIssue('missing_approval')) {
      const issue = await issueRepo.create({
        organization_id: orgId,
        transaction_id: transactionId,
        category: 'missing_approval',
        severity: 'warning',
        title: `Pending approval past SLA: ${approval.approval_type}`,
        description: `Approval ${approval.id} has been pending for ${Math.floor(hoursSinceCreated)} hours (SLA: ${SLA_HOURS}h).`,
        status: 'open',
        assigned_to_user_id: null,
        resolved_by_user_id: null,
        resolved_at: null,
        resolution_notes: null,
        policy_rule_id: null,
        metadata: { approval_id: approval.id, hours_pending: Math.floor(hoursSinceCreated) },
      });
      detected.push(issue);
      openIssueKeys.add(`missing_approval:${transactionId}`);
    }
  }

  // 3. Unresolved critical exceptions
  const { data: criticalExceptions } = await supabase
    .from('transaction_exceptions')
    .select('id, title')
    .eq('transaction_id', transactionId)
    .eq('severity', 'critical')
    .eq('resolution_status', 'open');

  if ((criticalExceptions?.length ?? 0) > 0 && !hasOpenIssue('unresolved_exception')) {
    const issue = await issueRepo.create({
      organization_id: orgId,
      transaction_id: transactionId,
      category: 'unresolved_exception',
      severity: 'critical',
      title: `${criticalExceptions!.length} unresolved critical exception(s)`,
      description: 'Transaction has critical exceptions that need resolution before proceeding.',
      status: 'open',
      assigned_to_user_id: null,
      resolved_by_user_id: null,
      resolved_at: null,
      resolution_notes: null,
      policy_rule_id: null,
      metadata: { exception_ids: criticalExceptions!.map((e) => e.id) },
    });
    detected.push(issue);
    openIssueKeys.add(`unresolved_exception:${transactionId}`);
  }

  // 4. Missing economics data
  const activeStatuses = ['active', 'pending_closing', 'closed'];
  if (activeStatuses.includes(transaction.status)) {
    const { data: economics } = await supabase
      .from('transaction_economics')
      .select('id, gross_commission')
      .eq('transaction_id', transactionId)
      .limit(1);

    const missingEconomics = !economics?.length;
    const missingGross = economics?.length === 1 && economics[0].gross_commission == null;

    if ((missingEconomics || missingGross) && !hasOpenIssue('missing_economics')) {
      const issue = await issueRepo.create({
        organization_id: orgId,
        transaction_id: transactionId,
        category: 'missing_economics',
        severity: 'warning',
        title: missingEconomics
          ? 'No economics data for active transaction'
          : 'Missing gross commission amount',
        description: missingEconomics
          ? 'Transaction is in an active state but has no economics record.'
          : 'Transaction economics exists but gross commission has not been set.',
        status: 'open',
        assigned_to_user_id: null,
        resolved_by_user_id: null,
        resolved_at: null,
        resolution_notes: null,
        policy_rule_id: null,
        metadata: { transaction_status: transaction.status },
      });
      detected.push(issue);
      openIssueKeys.add(`missing_economics:${transactionId}`);
    }
  }

  // 5. Readiness inconsistencies (closing soon but readiness < 65)
  const { data: readiness } = await supabase
    .from('closing_readiness')
    .select('overall_score, days_until_closing')
    .eq('transaction_id', transactionId)
    .order('computed_at', { ascending: false })
    .limit(1);

  if (readiness?.length) {
    const r = readiness[0];
    const closingSoon = r.days_until_closing != null && r.days_until_closing <= 14;
    if (closingSoon && r.overall_score < 65 && !hasOpenIssue('readiness_inconsistency')) {
      const issue = await issueRepo.create({
        organization_id: orgId,
        transaction_id: transactionId,
        category: 'readiness_inconsistency',
        severity: 'critical',
        title: 'Low readiness score with approaching close date',
        description: `Closing in ${r.days_until_closing} days but readiness score is only ${r.overall_score}%.`,
        status: 'open',
        assigned_to_user_id: null,
        resolved_by_user_id: null,
        resolved_at: null,
        resolution_notes: null,
        policy_rule_id: null,
        metadata: {
          overall_score: r.overall_score,
          days_until_closing: r.days_until_closing,
        },
      });
      detected.push(issue);
      openIssueKeys.add(`readiness_inconsistency:${transactionId}`);
    }
  }

  // Audit log
  if (detected.length > 0) {
    await logAction({
      organizationId: orgId,
      transactionId,
      actorType: 'user',
      actorUserId: userId,
      action: 'compliance_issue.created',
      targetType: 'transaction',
      targetId: transactionId,
      metadata: {
        count: detected.length,
        categories: detected.map((i) => i.category),
      },
    });
  }

  return detected;
}

// ---------------------------------------------------------------------------
// getComplianceIssues — returns issues with comments for a transaction
// ---------------------------------------------------------------------------

export async function getComplianceIssues(
  transactionId: string,
): Promise<(ComplianceIssue & { comments: ComplianceIssueComment[] })[]> {
  const issues = await issueRepo.findByTransactionId(transactionId);
  const result: (ComplianceIssue & { comments: ComplianceIssueComment[] })[] = [];

  for (const issue of issues) {
    const comments = await commentRepo.findByIssueId(issue.id);
    result.push({ ...issue, comments });
  }

  return result;
}

// ---------------------------------------------------------------------------
// getComplianceIssue — single issue by id
// ---------------------------------------------------------------------------

export async function getComplianceIssue(
  issueId: string,
): Promise<ComplianceIssue | null> {
  return issueRepo.findById(issueId);
}

// ---------------------------------------------------------------------------
// getComplianceQueue — filtered queue for an org
// ---------------------------------------------------------------------------

export async function getComplianceQueue(
  orgId: string,
  filters?: Record<string, unknown>,
): Promise<ComplianceIssue[]> {
  let query = supabase
    .from('compliance_issues')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status as ComplianceIssueStatus);
  }
  if (filters?.severity) {
    query = query.eq('severity', filters.severity as string);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category as ComplianceIssueCategory);
  }
  if (filters?.assigneeId) {
    query = query.eq('assigned_to_user_id', filters.assigneeId as string);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ComplianceIssue[];
}

// ---------------------------------------------------------------------------
// assignComplianceIssue
// ---------------------------------------------------------------------------

export async function assignComplianceIssue(
  issueId: string,
  assigneeId: string,
  assignedByUserId: string,
): Promise<ComplianceIssue> {
  const issue = await issueRepo.update(issueId, {
    assigned_to_user_id: assigneeId,
    status: 'under_review',
  });

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', issue.transaction_id)
    .single();

  await logAction({
    organizationId: transaction?.organization_id,
    transactionId: issue.transaction_id,
    actorType: 'user',
    actorUserId: assignedByUserId,
    action: 'compliance_issue.assigned',
    targetType: 'compliance_issue',
    targetId: issueId,
    metadata: { assignee_id: assigneeId },
  });

  return issue;
}

// ---------------------------------------------------------------------------
// resolveComplianceIssue
// ---------------------------------------------------------------------------

export async function resolveComplianceIssue(
  issueId: string,
  notes: string,
  userId: string,
): Promise<ComplianceIssue> {
  const issue = await issueRepo.update(issueId, {
    status: 'resolved',
    resolved_by_user_id: userId,
    resolved_at: new Date().toISOString(),
    resolution_notes: notes,
  });

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', issue.transaction_id)
    .single();

  await logAction({
    organizationId: transaction?.organization_id,
    transactionId: issue.transaction_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'compliance_issue.resolved',
    targetType: 'compliance_issue',
    targetId: issueId,
    metadata: { resolution_notes: notes },
  });

  return issue;
}

// ---------------------------------------------------------------------------
// overrideComplianceIssue
// ---------------------------------------------------------------------------

export async function overrideComplianceIssue(
  issueId: string,
  reason: string,
  userId: string,
): Promise<ComplianceIssue> {
  const issue = await issueRepo.update(issueId, {
    status: 'overridden',
    resolved_by_user_id: userId,
    resolved_at: new Date().toISOString(),
    resolution_notes: reason,
  });

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', issue.transaction_id)
    .single();

  await logAction({
    organizationId: transaction?.organization_id,
    transactionId: issue.transaction_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'compliance_issue.overridden',
    targetType: 'compliance_issue',
    targetId: issueId,
    metadata: { reason },
  });

  return issue;
}

// ---------------------------------------------------------------------------
// addComplianceComment
// ---------------------------------------------------------------------------

export async function addComplianceComment(
  issueId: string,
  body: string,
  userId: string,
): Promise<ComplianceIssueComment> {
  const comment = await commentRepo.create({
    issue_id: issueId,
    author_user_id: userId,
    body,
  });

  const issue = await issueRepo.findById(issueId);

  if (issue) {
    const { data: transaction } = await supabase
      .from('transactions')
      .select('organization_id')
      .eq('id', issue.transaction_id)
      .single();

    await logAction({
      organizationId: transaction?.organization_id,
      transactionId: issue.transaction_id,
      actorType: 'user',
      actorUserId: userId,
      action: 'compliance_issue.commented',
      targetType: 'compliance_issue',
      targetId: issueId,
      metadata: { comment_id: comment.id },
    });
  }

  return comment;
}

// ---------------------------------------------------------------------------
// getComplianceStats
// ---------------------------------------------------------------------------

interface ComplianceStats {
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
}

export async function getComplianceStats(orgId: string): Promise<ComplianceStats> {
  const issues = await issueRepo.findByOrgId(orgId);

  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const issue of issues) {
    byStatus[issue.status] = (byStatus[issue.status] ?? 0) + 1;
    bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
    byCategory[issue.category] = (byCategory[issue.category] ?? 0) + 1;
  }

  return { byStatus, bySeverity, byCategory };
}
