import type { LearningContext } from '@/types';
import * as ActionScoreRepo from '@/lib/repositories/orchestrator-action-scores';
import * as FeedbackRepo from '@/lib/repositories/orchestrator-recommendation-feedback';
import * as CorrectionRepo from '@/lib/repositories/orchestrator-correction-patterns';
import * as CounterpartyProfileRepo from '@/lib/repositories/orchestrator-counterparty-profiles';
import * as SpecialistScoreRepo from '@/lib/repositories/orchestrator-specialist-scores';
import * as OrgProfileRepo from '@/lib/repositories/orchestrator-org-profiles';
import * as MemorySummaryRepo from '@/lib/repositories/orchestrator-memory-summaries';

export async function buildLearningContext(
  orgId: string,
  orchestratorId: string,
): Promise<LearningContext> {
  // Fetch all learning signals in parallel
  const [
    actionScores,
    ignoredPatterns,
    correctionPatterns,
    counterpartyProfiles,
    specialistScores,
    orgProfile,
    memorySummaries,
  ] = await Promise.all([
    ActionScoreRepo.findByOrg(orgId, 50),
    FeedbackRepo.findIgnoredPatterns(orgId, 3),
    CorrectionRepo.findByOrg(orgId, true),
    CounterpartyProfileRepo.findByOrg(orgId),
    SpecialistScoreRepo.findByOrg(orgId),
    OrgProfileRepo.findByOrg(orgId),
    MemorySummaryRepo.findByOrchestrator(orchestratorId, true, 10),
  ]);

  const learningInfluences: string[] = [];

  // Build influence explanations
  const highEffective = actionScores.filter(
    s => s.effectiveness_score > 0.7 && s.total_executions >= 3,
  );
  if (highEffective.length > 0) {
    learningInfluences.push(
      `Prioritizing ${highEffective.map(s => s.tool_name).join(', ')} based on historical effectiveness`,
    );
  }

  const ignoredTools = ignoredPatterns.filter(p => p.ignore_count >= 5);
  if (ignoredTools.length > 0) {
    learningInfluences.push(
      `Deprioritizing ${ignoredTools.map(p => p.tool_name).join(', ')} due to repeated human ignoring`,
    );
  }

  const activeCorrectionCount = correctionPatterns.filter(p => p.occurrence_count >= 3).length;
  if (activeCorrectionCount > 0) {
    learningInfluences.push(
      `${activeCorrectionCount} correction pattern(s) influencing confidence and review gating`,
    );
  }

  const slowCounterparties = counterpartyProfiles.filter(
    p => (p.avg_response_hours ?? 0) > 72,
  );
  if (slowCounterparties.length > 0) {
    learningInfluences.push(
      `Escalating sooner for ${slowCounterparties.map(p => p.counterparty_type).join(', ')} based on response history`,
    );
  }

  // Resolve last_ignored for each ignored tool by querying feedback
  const ignoredActionsWithDates = await Promise.all(
    ignoredPatterns.map(async (p) => {
      const feedback = await FeedbackRepo.findByToolName(orgId, p.tool_name, 1);
      return {
        tool_name: p.tool_name,
        ignore_count: p.ignore_count,
        last_ignored: feedback.length > 0 ? feedback[0].created_at : new Date().toISOString(),
      };
    }),
  );

  return {
    actionScores: actionScores.map(s => ({
      tool_name: s.tool_name,
      effectiveness_score: s.effectiveness_score,
      total_executions: s.total_executions,
    })),
    ignoredActions: ignoredActionsWithDates,
    correctionPatterns: correctionPatterns
      .filter(p => p.occurrence_count >= 2)
      .map(p => ({
        category: p.correction_category,
        detail: p.correction_detail,
        suggested_action: p.suggested_action,
        occurrence_count: p.occurrence_count,
      })),
    counterpartyProfiles: counterpartyProfiles.map(p => ({
      counterparty_type: p.counterparty_type,
      avg_response_hours: p.avg_response_hours,
      missed_deadline_rate: p.missed_deadline_rate,
    })),
    specialistScores: specialistScores.map(s => ({
      role: s.specialist_role,
      usefulness_score: s.usefulness_score,
      priority_adjustment: s.priority_adjustment,
    })),
    orgProfile: orgProfile ?? null,
    memorySummaries: memorySummaries.map(s => ({
      type: s.summary_type,
      summary: s.summary,
      relevance_score: s.relevance_score,
    })),
    learningInfluences,
  };
}
