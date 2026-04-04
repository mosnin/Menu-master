import * as CorrectionRepo from '@/lib/repositories/orchestrator-correction-patterns';
import * as LearningEventRepo from '@/lib/repositories/orchestrator-learning-events';
import type {
  CorrectionCategory,
  CorrectionSuggestedAction,
  OrchestratorCorrectionPattern,
} from '@/types';

/**
 * Record a manual correction. Upserts the correction pattern
 * (incrementing occurrence_count if it already exists) and logs a learning event.
 */
export async function recordCorrection(
  orgId: string,
  category: CorrectionCategory,
  detail: string,
  context: {
    entityType?: string;
    stage?: string;
    documentType?: string;
  } = {},
): Promise<OrchestratorCorrectionPattern> {
  const suggestedAction = inferSuggestedAction(category);
  const confidenceAdjustment = inferConfidenceAdjustment(category);

  const pattern = await CorrectionRepo.upsertPattern({
    organization_id: orgId,
    correction_category: category,
    correction_detail: detail,
    occurrence_count: 1,
    entity_type: context.entityType ?? null,
    stage: context.stage ?? null,
    document_type: context.documentType ?? null,
    suggested_action: suggestedAction,
    confidence_adjustment: confidenceAdjustment,
    is_active: true,
    last_occurrence_at: new Date().toISOString(),
  });

  await LearningEventRepo.create({
    organization_id: orgId,
    orchestrator_id: null,
    event_type: 'correction_learned',
    detail: {
      correction_category: category,
      correction_detail: detail,
      occurrence_count: pattern.occurrence_count,
      entity_type: context.entityType,
      stage: context.stage,
    },
    influenced_entity: null,
    influenced_entity_id: null,
  });

  return pattern;
}

/** Returns all active correction patterns for the org. */
export async function getActivePatterns(
  orgId: string,
): Promise<OrchestratorCorrectionPattern[]> {
  return CorrectionRepo.findByOrg(orgId, true);
}

/**
 * Returns applicable correction patterns that should influence the current cycle.
 * Only returns patterns with occurrence_count >= 2 to avoid overgeneralizing
 * from a single correction.
 */
export async function getCorrectionInfluence(
  orgId: string,
  context: {
    entityType?: string;
    stage?: string;
    documentType?: string;
  } = {},
): Promise<OrchestratorCorrectionPattern[]> {
  const patterns = await CorrectionRepo.findByOrg(orgId, true);

  return patterns.filter(p => {
    // Must have occurred at least twice
    if (p.occurrence_count < 2) return false;

    // Match context if the pattern specifies it
    if (p.entity_type && context.entityType && p.entity_type !== context.entityType) return false;
    if (p.stage && context.stage && p.stage !== context.stage) return false;
    if (p.document_type && context.documentType && p.document_type !== context.documentType)
      return false;

    return true;
  });
}

/**
 * Returns a numeric adjustment (-0.5 to 0) based on correction patterns
 * matching the context. Used to lower confidence for actions in areas
 * where corrections have been frequent.
 */
export async function getConfidenceAdjustment(
  orgId: string,
  toolName: string,
  context: {
    entityType?: string;
    stage?: string;
    documentType?: string;
  } = {},
): Promise<number> {
  const patterns = await getCorrectionInfluence(orgId, context);

  if (patterns.length === 0) return 0;

  // Map tool names to correction categories that would affect them
  const relevantPatterns = patterns.filter(p => isPatternRelevantToTool(p, toolName));

  if (relevantPatterns.length === 0) return 0;

  // Aggregate confidence adjustments, capped at -0.5
  const totalAdjustment = relevantPatterns.reduce((sum, p) => sum + p.confidence_adjustment, 0);
  return Math.max(-0.5, Math.min(0, totalAdjustment));
}

// --- Helpers ---

function inferSuggestedAction(category: CorrectionCategory): CorrectionSuggestedAction {
  const mapping: Record<CorrectionCategory, CorrectionSuggestedAction> = {
    extraction_field: 'lower_confidence',
    checklist_item: 'request_manual_review',
    timeline_date: 'flag_for_attention',
    document_type: 'lower_confidence',
    contact_info: 'lower_confidence',
    compliance_flag: 'add_specialist_review',
    approval_routing: 'adjust_gating',
    risk_classification: 'add_specialist_review',
    urgency_assessment: 'flag_for_attention',
    specialist_routing: 'adjust_gating',
    other: 'none',
  };
  return mapping[category];
}

function inferConfidenceAdjustment(category: CorrectionCategory): number {
  const adjustments: Record<CorrectionCategory, number> = {
    extraction_field: -0.15,
    checklist_item: -0.1,
    timeline_date: -0.2,
    document_type: -0.1,
    contact_info: -0.05,
    compliance_flag: -0.25,
    approval_routing: -0.15,
    risk_classification: -0.2,
    urgency_assessment: -0.15,
    specialist_routing: -0.1,
    other: -0.05,
  };
  return adjustments[category];
}

function isPatternRelevantToTool(
  pattern: OrchestratorCorrectionPattern,
  toolName: string,
): boolean {
  // Map correction categories to tool name patterns they affect
  const categoryToolMapping: Record<string, string[]> = {
    extraction_field: ['extract', 'parse', 'document'],
    checklist_item: ['checklist', 'compliance', 'review'],
    timeline_date: ['timeline', 'deadline', 'schedule', 'calendar'],
    document_type: ['document', 'classify', 'extract'],
    contact_info: ['contact', 'party', 'counterparty'],
    compliance_flag: ['compliance', 'review', 'flag'],
    approval_routing: ['approval', 'route', 'escalat'],
    risk_classification: ['risk', 'classify', 'assess'],
    urgency_assessment: ['urgency', 'priorit', 'triage'],
    specialist_routing: ['specialist', 'route', 'assign'],
  };

  const toolNameLower = toolName.toLowerCase();
  const relevantKeywords = categoryToolMapping[pattern.correction_category] ?? [];

  return relevantKeywords.some(keyword => toolNameLower.includes(keyword));
}
