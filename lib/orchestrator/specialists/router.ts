import type { WorldStateSnapshot } from '@/types';
import type { SpecialistRole } from './types';

const MAX_SPECIALISTS_PER_CYCLE = 3;

/**
 * Determines which specialists to invoke for a given orchestrator cycle.
 *
 * Rules:
 * - Exception specialist: when unresolved_exceptions > 0 or compliance_flags present
 * - Communications specialist: when open_obligations > 0 or overdue_obligations > 0
 * - Compliance specialist: when compliance_flags present or stage transition proposed
 * - Closing specialist: when transaction stage is 'under_contract' or 'closing'
 * - Listing specialist: when entity_type is 'listing'
 * - Handoff specialist: when entity_type is 'listing' and an offer has been accepted
 * - Max 3 specialists per cycle to prevent fan-out
 * - Learning-based priority adjustments are applied when provided (bounded -3 to +3)
 */
export function routeToSpecialists(
  entityType: 'transaction' | 'listing',
  worldState: WorldStateSnapshot,
  trigger: string,
  learningAdjustments?: Map<string, number>,
): SpecialistRole[] {
  const candidates: { role: SpecialistRole; priority: number }[] = [];

  const hasComplianceFlags = worldState.compliance_flags.length > 0;
  const hasUnresolvedException = worldState.unresolved_exceptions > 0;
  const hasOpenObligations = worldState.open_obligations > 0;
  const hasOverdueObligations = worldState.overdue_obligations > 0;
  const isStageTransition =
    trigger.includes('stage_transition') ||
    trigger.includes('suggest_stage_transition');

  const offerAcceptedStages = [
    'offer_accepted',
    'pending_handoff',
    'accepted',
    'under_contract',
  ];
  const hasAcceptedOffer =
    entityType === 'listing' &&
    offerAcceptedStages.includes(worldState.stage);

  // Exception specialist: highest priority when exceptions or compliance flags exist
  if (hasUnresolvedException || hasComplianceFlags) {
    candidates.push({
      role: 'exception',
      priority: hasUnresolvedException && hasComplianceFlags ? 10 : 8,
    });
  }

  // Compliance specialist: compliance flags or stage transition proposed
  if (hasComplianceFlags || isStageTransition) {
    candidates.push({
      role: 'compliance',
      priority: isStageTransition && hasComplianceFlags ? 9 : 7,
    });
  }

  // Communications specialist: open or overdue obligations
  if (hasOpenObligations || hasOverdueObligations) {
    candidates.push({
      role: 'communications',
      priority: hasOverdueObligations ? 8 : 5,
    });
  }

  // Closing specialist: transaction in under_contract or closing stage
  if (
    entityType === 'transaction' &&
    (worldState.stage === 'under_contract' || worldState.stage === 'closing')
  ) {
    candidates.push({
      role: 'closing',
      priority: worldState.stage === 'closing' ? 9 : 6,
    });
  }

  // Listing specialist: when entity is a listing
  if (entityType === 'listing') {
    candidates.push({
      role: 'listing',
      priority: 5,
    });
  }

  // Handoff specialist: listing with accepted offer
  if (hasAcceptedOffer) {
    candidates.push({
      role: 'handoff',
      priority: 9,
    });
  }

  // Apply learning-based priority adjustments (bounded -3 to +3)
  if (learningAdjustments) {
    for (const candidate of candidates) {
      const adjustment = learningAdjustments.get(candidate.role) ?? 0;
      const bounded = Math.max(-3, Math.min(3, adjustment));
      candidate.priority += bounded;
    }
  }

  // Sort by priority descending, then cap at max
  candidates.sort((a, b) => b.priority - a.priority);

  return candidates.slice(0, MAX_SPECIALISTS_PER_CYCLE).map((c) => c.role);
}
