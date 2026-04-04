import type {
  ActionRiskClass,
  UserRole,
  ActionDisposition,
  PolicyContext,
  PolicyDecision,
  OrgPolicyOverrides,
} from '@/types';

// ---------------------------------------------------------------------------
// Closed / terminal stage detection
// ---------------------------------------------------------------------------

const TERMINAL_STAGES = new Set(['closed', 'cancelled', 'withdrawn', 'expired']);

function isTerminalStage(stage: string): boolean {
  return TERMINAL_STAGES.has(stage.toLowerCase());
}

// ---------------------------------------------------------------------------
// Policy rules — evaluated in strict precedence order
// ---------------------------------------------------------------------------

/**
 * Evaluate the action policy for a single proposed action.
 *
 * Rules are checked in order of precedence (1 = highest). The first matching
 * rule produces the decision. This is fully deterministic — no AI involved.
 */
export function evaluatePolicy(context: PolicyContext): PolicyDecision {
  const {
    toolName,
    riskClass,
    confidence,
    actorRole,
    complianceFlags,
    orgPolicyOverrides,
    worldStage,
  } = context;

  // Rule 1: Closed / cancelled entities -> block (always)
  if (isTerminalStage(worldStage)) {
    return {
      disposition: 'block',
      reason: `Cannot execute actions on entities in "${worldStage}" stage`,
      policy_rule: 'terminal_stage_block',
      escalation_target: undefined,
      can_override: false,
    };
  }

  // Rule 2: Org-level demoted_to_blocked -> block
  if (orgPolicyOverrides?.demoted_to_blocked?.includes(toolName)) {
    return {
      disposition: 'block',
      reason: `Tool "${toolName}" is blocked by organization policy`,
      policy_rule: 'org_demoted_to_blocked',
      escalation_target: 'broker_admin',
      can_override: true,
    };
  }

  // Rule 3: High risk -> block with escalation to broker_admin
  if (riskClass === 'high_risk') {
    return {
      disposition: 'block',
      reason: 'High-risk actions require explicit human approval and cannot be auto-executed',
      policy_rule: 'high_risk_block',
      escalation_target: 'broker_admin',
      can_override: true,
    };
  }

  // Rule 4: Active compliance flags + non-safe -> create_approval (escalated)
  if (complianceFlags.length > 0 && riskClass !== 'safe') {
    return {
      disposition: 'create_approval',
      reason: `Active compliance flags present (${complianceFlags.join(', ')}); non-safe action requires approval`,
      policy_rule: 'compliance_flag_approval',
      escalation_target: 'broker_admin',
      can_override: true,
    };
  }

  // Rule 5: Org-level require_approval_for -> create_approval
  if (orgPolicyOverrides?.require_approval_for?.includes(toolName)) {
    return {
      disposition: 'create_approval',
      reason: `Tool "${toolName}" requires approval per organization policy`,
      policy_rule: 'org_require_approval',
      escalation_target: actorRole === 'broker_admin' ? 'broker_admin' : 'coordinator',
      can_override: true,
    };
  }

  // Rule 6: Medium risk + confidence < 0.7 -> create_approval
  if (riskClass === 'medium_risk' && confidence < 0.7) {
    return {
      disposition: 'create_approval',
      reason: `Medium-risk action with low confidence (${confidence}) requires human approval`,
      policy_rule: 'medium_risk_low_confidence',
      escalation_target: 'coordinator',
      can_override: true,
    };
  }

  // Rule 7: Medium risk + confidence >= 0.7 -> create_draft
  if (riskClass === 'medium_risk' && confidence >= 0.7) {
    // Check rule 8 first: org promoted_to_safe can override medium_risk to auto_execute
    if (orgPolicyOverrides?.promoted_to_safe?.includes(toolName)) {
      return {
        disposition: 'auto_execute',
        reason: `Tool "${toolName}" promoted to safe by organization policy`,
        policy_rule: 'org_promoted_to_safe',
        escalation_target: undefined,
        can_override: false,
      };
    }

    return {
      disposition: 'create_draft',
      reason: `Medium-risk action with sufficient confidence (${confidence}) created as draft for review`,
      policy_rule: 'medium_risk_draft',
      escalation_target: undefined,
      can_override: true,
    };
  }

  // Rule 8: Org-level promoted_to_safe (for medium_risk that didn't match above, never high)
  // This is already handled within rule 7 for medium_risk.
  // For safe actions that are also in promoted_to_safe, it's a no-op since they already auto_execute.

  // Rule 9: Safe -> auto_execute
  if (riskClass === 'safe') {
    return {
      disposition: 'auto_execute',
      reason: 'Safe action approved for automatic execution',
      policy_rule: 'safe_auto_execute',
      escalation_target: undefined,
      can_override: false,
    };
  }

  // Rule 10: Unknown tool / unrecognised risk class -> block
  return {
    disposition: 'block',
    reason: `Unknown risk class or unregistered tool: "${toolName}" (risk_class: ${riskClass})`,
    policy_rule: 'unknown_block',
    escalation_target: 'broker_admin',
    can_override: false,
  };
}

/**
 * Batch evaluation — evaluates policy for multiple proposed actions.
 */
export function evaluatePolicies(actions: PolicyContext[]): PolicyDecision[] {
  return actions.map(evaluatePolicy);
}
