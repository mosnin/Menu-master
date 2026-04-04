import type { WorldStateSnapshot } from '@/types';
import type {
  SpecialistRole,
  SpecialistInput,
  SpecialistOutput,
  SpecialistContract,
} from './types';

// ---------------------------------------------------------------------------
// Specialist contracts — define when each specialist should be invoked
// ---------------------------------------------------------------------------

const SPECIALIST_CONTRACTS: SpecialistContract[] = [
  {
    role: 'compliance',
    description: 'Reviews deal state for regulatory, policy, and compliance risks',
    allowed_entity_types: ['transaction', 'listing'],
    trigger_conditions: ['compliance_flags_present', 'stage_transition', 'always'],
    max_findings: 10,
    timeout_ms: 15_000,
  },
  {
    role: 'exception',
    description: 'Analyzes unresolved exceptions and proposes remediation',
    allowed_entity_types: ['transaction', 'listing'],
    trigger_conditions: ['unresolved_exceptions_present'],
    max_findings: 10,
    timeout_ms: 10_000,
  },
  {
    role: 'communications',
    description: 'Manages outbound communication drafts and follow-ups',
    allowed_entity_types: ['transaction', 'listing'],
    trigger_conditions: ['overdue_obligations_present', 'response_latency_high'],
    max_findings: 5,
    timeout_ms: 10_000,
  },
  {
    role: 'closing',
    description: 'Monitors closing readiness and deadline alignment',
    allowed_entity_types: ['transaction'],
    trigger_conditions: ['closing_stage', 'urgent_deadlines_present'],
    max_findings: 8,
    timeout_ms: 10_000,
  },
  {
    role: 'listing',
    description: 'Handles listing-specific lifecycle concerns',
    allowed_entity_types: ['listing'],
    trigger_conditions: ['listing_entity'],
    max_findings: 8,
    timeout_ms: 10_000,
  },
  {
    role: 'planning',
    description: 'Provides strategic guidance on deal progression',
    allowed_entity_types: ['transaction', 'listing'],
    trigger_conditions: ['low_completeness', 'missing_docs_present'],
    max_findings: 5,
    timeout_ms: 10_000,
  },
  {
    role: 'handoff',
    description: 'Manages handoff readiness between listing and transaction phases',
    allowed_entity_types: ['listing'],
    trigger_conditions: ['handoff_stage'],
    max_findings: 5,
    timeout_ms: 10_000,
  },
];

// ---------------------------------------------------------------------------
// Condition evaluators
// ---------------------------------------------------------------------------

function evaluateCondition(
  condition: string,
  worldState: WorldStateSnapshot,
  entityType: string,
): boolean {
  switch (condition) {
    case 'always':
      return true;
    case 'compliance_flags_present':
      return worldState.compliance_flags.length > 0;
    case 'stage_transition':
      // We always route to compliance on every cycle; real stage-transition
      // detection would compare previous snapshot, but compliance is cheap
      return true;
    case 'unresolved_exceptions_present':
      return worldState.unresolved_exceptions > 0;
    case 'overdue_obligations_present':
      return worldState.overdue_obligations > 0;
    case 'response_latency_high':
      return worldState.response_latency_signals.some(s => s.days_waiting >= 3);
    case 'closing_stage':
      return ['closing', 'under_contract', 'pending'].includes(worldState.stage);
    case 'urgent_deadlines_present':
      return worldState.urgent_deadlines.length > 0;
    case 'listing_entity':
      return entityType === 'listing';
    case 'low_completeness':
      return worldState.completeness_score < 50;
    case 'missing_docs_present':
      return worldState.missing_docs.length > 0;
    case 'handoff_stage':
      return worldState.stage === 'handoff' || worldState.stage === 'accepted';
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export interface RouteResult {
  role: SpecialistRole;
  contract: SpecialistContract;
  input: SpecialistInput;
}

/**
 * Determine which specialists should be invoked for this world state.
 * Returns the list of specialists to invoke together with their prepared input.
 */
export function routeToSpecialists(
  worldState: WorldStateSnapshot,
  entityType: 'transaction' | 'listing',
  entityId: string,
  organizationId: string,
  memory: Record<string, unknown>[],
  recentActions: string[],
): RouteResult[] {
  const results: RouteResult[] = [];

  for (const contract of SPECIALIST_CONTRACTS) {
    // Skip if entity type not allowed
    if (!contract.allowed_entity_types.includes(entityType)) continue;

    // Check if any trigger condition is met
    const triggered = contract.trigger_conditions.some(cond =>
      evaluateCondition(cond, worldState, entityType),
    );

    if (!triggered) continue;

    results.push({
      role: contract.role,
      contract,
      input: {
        role: contract.role,
        entityType,
        entityId,
        organizationId,
        worldState: worldState as unknown as Record<string, unknown>,
        memory,
        recentActions,
      },
    });
  }

  return results;
}

/**
 * Execute a single specialist. In this initial implementation specialists are
 * stub/pass-through — individual specialist implementations will be added in
 * follow-up work. This function handles timeouts.
 */
export async function executeSpecialist(route: RouteResult): Promise<SpecialistOutput> {
  const start = Date.now();
  const timeoutMs = route.contract.timeout_ms;

  try {
    const result = await Promise.race([
      runSpecialistLogic(route),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Specialist ${route.role} timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    return {
      role: route.role,
      invoked_at: new Date(start).toISOString(),
      duration_ms: duration,
      findings: [
        {
          severity: 'warning',
          confidence: 1,
          summary: `Specialist ${route.role} failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          details: '',
          recommended_actions: [],
          blocked_reasons: [],
          needed_approvals: [],
          dependencies: [],
        },
      ],
      operator_summary: `Specialist ${route.role} encountered an error and returned no actionable findings.`,
    };
  }
}

/**
 * Stub specialist logic. Each role will eventually have its own module.
 * For now, return an empty output so the pipeline can integrate end-to-end.
 */
async function runSpecialistLogic(route: RouteResult): Promise<SpecialistOutput> {
  const start = Date.now();

  // Placeholder: real specialist implementations will be added per-role
  return {
    role: route.role,
    invoked_at: new Date(start).toISOString(),
    duration_ms: Date.now() - start,
    findings: [],
    operator_summary: `${route.role} specialist: no findings.`,
  };
}
