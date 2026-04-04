import { supabase } from '@/lib/db/client';
import * as ruleRepo from '@/lib/repositories/policy-rules';
import * as overrideRepo from '@/lib/repositories/policy-overrides';
import { logAction } from '@/lib/audit/logger';
import type {
  PolicyRule,
  PolicyOverride,
  EnforcementMode,
} from '@/types';

// ---------------------------------------------------------------------------
// createPolicyRule
// ---------------------------------------------------------------------------

export async function createPolicyRule(
  orgId: string,
  data: Record<string, unknown>,
  userId: string,
): Promise<PolicyRule> {
  const rule = await ruleRepo.create({
    organization_id: orgId,
    office_id: (data.officeId as string) ?? null,
    name: data.name as string,
    description: (data.description as string) ?? null,
    category: data.category as PolicyRule['category'],
    enforcement_mode: data.enforcementMode as PolicyRule['enforcement_mode'],
    rule_config: (data.ruleConfig as Record<string, unknown>) ?? {},
    applies_to_transaction_types: (data.appliesTo as string[]) ?? [],
    is_active: true,
    created_by_user_id: userId,
  });

  await logAction({
    organizationId: orgId,
    actorType: 'user',
    actorUserId: userId,
    action: 'policy_rule.created',
    targetType: 'policy_rule',
    targetId: rule.id,
    metadata: { name: rule.name, category: rule.category },
  });

  return rule;
}

// ---------------------------------------------------------------------------
// updatePolicyRule
// ---------------------------------------------------------------------------

export async function updatePolicyRule(
  ruleId: string,
  data: Record<string, unknown>,
  userId: string,
): Promise<PolicyRule> {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.category !== undefined) updates.category = data.category;
  if (data.enforcementMode !== undefined) updates.enforcement_mode = data.enforcementMode;
  if (data.ruleConfig !== undefined) updates.rule_config = data.ruleConfig;
  if (data.appliesTo !== undefined) updates.applies_to_transaction_types = data.appliesTo;
  if (data.officeId !== undefined) updates.office_id = data.officeId;

  const rule = await ruleRepo.update(ruleId, updates);

  await logAction({
    organizationId: rule.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'policy_rule.updated',
    targetType: 'policy_rule',
    targetId: ruleId,
    metadata: { updated_fields: Object.keys(data) },
  });

  return rule;
}

// ---------------------------------------------------------------------------
// togglePolicyRule
// ---------------------------------------------------------------------------

export async function togglePolicyRule(
  ruleId: string,
  isActive: boolean,
  userId: string,
): Promise<PolicyRule> {
  const rule = await ruleRepo.update(ruleId, { is_active: isActive });

  await logAction({
    organizationId: rule.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'policy_rule.toggled',
    targetType: 'policy_rule',
    targetId: ruleId,
    metadata: { is_active: isActive },
  });

  return rule;
}

// ---------------------------------------------------------------------------
// getPolicyRules
// ---------------------------------------------------------------------------

export async function getPolicyRules(
  orgId: string,
  officeId?: string,
): Promise<PolicyRule[]> {
  return ruleRepo.findActiveByOrg(orgId, officeId);
}

// ---------------------------------------------------------------------------
// evaluatePolicies — evaluates all active rules against transaction state
// ---------------------------------------------------------------------------

interface RuleEvaluationResult {
  rule: PolicyRule;
  status: 'pass' | 'warn' | 'block' | 'override_required';
  details: string;
}

export async function evaluatePolicies(
  transactionId: string,
  userId: string,
): Promise<RuleEvaluationResult[]> {
  // Fetch transaction data for evaluation
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, organization_id, status, office_id')
    .eq('id', transactionId)
    .single();

  if (!transaction) return [];

  const orgId = transaction.organization_id;
  const rules = await ruleRepo.findActiveByOrg(orgId);
  const overrides = await overrideRepo.findByTransactionId(transactionId);
  const results: RuleEvaluationResult[] = [];

  for (const rule of rules) {
    // Check if rule applies to this transaction's office
    if (rule.office_id && rule.office_id !== transaction.office_id) {
      continue;
    }

    // Check for approved override
    const approvedOverride = overrides.find(
      (o) => o.policy_rule_id === rule.id && o.status === 'approved',
    );

    if (approvedOverride) {
      // Check if override has expired
      if (approvedOverride.expires_at && new Date(approvedOverride.expires_at) < new Date()) {
        // Override expired — evaluate normally
      } else {
        results.push({ rule, status: 'pass', details: 'Approved override exists' });
        continue;
      }
    }

    // Evaluate the rule against transaction state
    const violated = await evaluateSingleRule(rule, transactionId);

    if (!violated) {
      results.push({ rule, status: 'pass', details: 'Rule satisfied' });
    } else {
      const statusMap: Record<EnforcementMode, RuleEvaluationResult['status']> = {
        warn: 'warn',
        block: 'block',
        require_override: 'override_required',
      };
      results.push({
        rule,
        status: statusMap[rule.enforcement_mode],
        details: violated,
      });
    }
  }

  return results;
}

/**
 * Evaluates a single rule against a transaction. Returns null if the rule
 * passes, or a string describing the violation if it fails.
 */
async function evaluateSingleRule(
  rule: PolicyRule,
  transactionId: string,
): Promise<string | null> {
  const config = rule.rule_config as Record<string, unknown>;

  switch (rule.category) {
    case 'required_document': {
      const docType = config.document_type as string | undefined;
      if (!docType) return null;

      const { data: docs } = await supabase
        .from('documents')
        .select('id')
        .eq('transaction_id', transactionId)
        .eq('document_type', docType)
        .limit(1);

      return docs?.length ? null : `Missing required document: ${docType}`;
    }

    case 'required_approval': {
      const approvalType = config.approval_type as string | undefined;
      if (!approvalType) return null;

      const { data: approvals } = await supabase
        .from('approvals')
        .select('id, status')
        .eq('transaction_id', transactionId)
        .eq('approval_type', approvalType);

      const hasApproved = approvals?.some((a) => a.status === 'approved');
      return hasApproved ? null : `Missing approved ${approvalType} approval`;
    }

    case 'required_economics': {
      const { data: economics } = await supabase
        .from('transaction_economics')
        .select('id, gross_commission, is_finalized')
        .eq('transaction_id', transactionId)
        .limit(1);

      if (!economics?.length) return 'No economics record found';

      const requireFinalized = config.require_finalized as boolean | undefined;
      if (requireFinalized && !economics[0].is_finalized) {
        return 'Economics record has not been finalized';
      }

      const requireGross = config.require_gross_commission as boolean | undefined;
      if (requireGross && economics[0].gross_commission == null) {
        return 'Gross commission amount is missing';
      }

      return null;
    }

    case 'stage_gate': {
      const { data: txn } = await supabase
        .from('transactions')
        .select('status')
        .eq('id', transactionId)
        .single();

      const blockedFrom = config.blocked_from_status as string | undefined;
      if (blockedFrom && txn?.status === blockedFrom) {
        return `Transaction cannot proceed from ${blockedFrom} without meeting stage gate requirements`;
      }

      return null;
    }

    case 'compliance_signoff': {
      const { data: issues } = await supabase
        .from('compliance_issues')
        .select('id')
        .eq('transaction_id', transactionId)
        .in('status', ['open', 'under_review', 'blocked'])
        .limit(1);

      return issues?.length ? 'Open compliance issues must be resolved' : null;
    }

    case 'correction_review': {
      const { data: txnDocs } = await supabase
        .from('documents')
        .select('id')
        .eq('transaction_id', transactionId);

      const docIds = (txnDocs ?? []).map((d) => d.id);
      if (!docIds.length) return null;

      const { data: unreviewed } = await supabase
        .from('document_extractions')
        .select('id')
        .in('document_id', docIds)
        .lt('confidence_score', 0.7)
        .limit(1);

      return unreviewed?.length ? 'Low-confidence extractions require manual review' : null;
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// requestOverride
// ---------------------------------------------------------------------------

export async function requestOverride(
  ruleId: string,
  transactionId: string,
  reason: string,
  userId: string,
): Promise<PolicyOverride> {
  // Fetch org from transaction
  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .single();

  const orgId = transaction?.organization_id ?? '';

  const override = await overrideRepo.create({
    policy_rule_id: ruleId,
    transaction_id: transactionId,
    organization_id: orgId,
    override_reason: reason,
    overridden_by_user_id: userId,
    approved_by_user_id: null,
    status: 'pending',
    expires_at: null,
  });

  await logAction({
    organizationId: orgId,
    transactionId,
    actorType: 'user',
    actorUserId: userId,
    action: 'policy_override.requested',
    targetType: 'policy_override',
    targetId: override.id,
    metadata: { rule_id: ruleId, reason },
  });

  return override;
}

// ---------------------------------------------------------------------------
// approveOverride
// ---------------------------------------------------------------------------

export async function approveOverride(
  overrideId: string,
  approverUserId: string,
): Promise<PolicyOverride> {
  await requireBrokerAdmin(approverUserId);

  const override = await overrideRepo.update(overrideId, {
    status: 'approved',
    approved_by_user_id: approverUserId,
  });

  await logAction({
    organizationId: override.organization_id,
    transactionId: override.transaction_id,
    actorType: 'user',
    actorUserId: approverUserId,
    action: 'policy_override.approved',
    targetType: 'policy_override',
    targetId: overrideId,
    metadata: { rule_id: override.policy_rule_id },
  });

  return override;
}

// ---------------------------------------------------------------------------
// rejectOverride
// ---------------------------------------------------------------------------

export async function rejectOverride(
  overrideId: string,
  reason: string | undefined,
  approverUserId: string,
): Promise<PolicyOverride> {
  await requireBrokerAdmin(approverUserId);

  const override = await overrideRepo.update(overrideId, {
    status: 'rejected',
    approved_by_user_id: approverUserId,
  });

  await logAction({
    organizationId: override.organization_id,
    transactionId: override.transaction_id,
    actorType: 'user',
    actorUserId: approverUserId,
    action: 'policy_override.rejected',
    targetType: 'policy_override',
    targetId: overrideId,
    metadata: { rule_id: override.policy_rule_id, reason: reason ?? null },
  });

  return override;
}

// ---------------------------------------------------------------------------
// getOverrides
// ---------------------------------------------------------------------------

export async function getOverrides(
  transactionId: string,
): Promise<PolicyOverride[]> {
  return overrideRepo.findByTransactionId(transactionId);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireBrokerAdmin(userId: string): Promise<void> {
  const { data: memberships } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_profile_id', userId)
    .eq('role', 'broker_admin')
    .limit(1);

  if (!memberships?.length) {
    throw new Error('Only broker_admin users can approve or reject overrides');
  }
}
