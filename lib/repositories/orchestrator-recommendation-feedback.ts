import { supabase } from '@/lib/db/client';
import type { OrchestratorRecommendationFeedback, RecommendationFeedbackType } from '@/types';

const TABLE = 'orchestrator_recommendation_feedback';

export async function create(
  input: {
    organization_id: string;
    orchestrator_id: string;
    proposal_id?: string | null;
    next_action_id?: string | null;
    tool_name: string;
    recommendation_type: string;
    feedback_type: RecommendationFeedbackType;
    edit_summary?: string | null;
    entity_type?: string | null;
    stage?: string | null;
    time_to_response_hours?: number | null;
  },
): Promise<OrchestratorRecommendationFeedback> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findByOrchestrator(
  orchestratorId: string,
  limit = 50,
): Promise<OrchestratorRecommendationFeedback[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findByToolName(
  orgId: string,
  toolName: string,
  limit = 50,
): Promise<OrchestratorRecommendationFeedback[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('tool_name', toolName)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function countByFeedbackType(
  orgId: string,
  toolName: string,
): Promise<Record<RecommendationFeedbackType, number>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('feedback_type')
    .eq('organization_id', orgId)
    .eq('tool_name', toolName);

  if (error) throw error;

  const counts: Record<string, number> = {
    accepted: 0,
    ignored: 0,
    dismissed: 0,
    superseded: 0,
    edited: 0,
  };

  for (const row of data ?? []) {
    const ft = row.feedback_type as RecommendationFeedbackType;
    counts[ft] = (counts[ft] ?? 0) + 1;
  }

  return counts as Record<RecommendationFeedbackType, number>;
}

export async function findIgnoredPatterns(
  orgId: string,
  minCount = 3,
): Promise<{ tool_name: string; ignore_count: number }[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('tool_name')
    .eq('organization_id', orgId)
    .eq('feedback_type', 'ignored');

  if (error) throw error;

  const countsByTool: Record<string, number> = {};
  for (const row of data ?? []) {
    countsByTool[row.tool_name] = (countsByTool[row.tool_name] ?? 0) + 1;
  }

  return Object.entries(countsByTool)
    .filter(([, count]) => count >= minCount)
    .map(([tool_name, ignore_count]) => ({ tool_name, ignore_count }))
    .sort((a, b) => b.ignore_count - a.ignore_count);
}
