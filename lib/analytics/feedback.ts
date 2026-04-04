import { supabase } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { trackEvent } from './events';

interface SubmitFeedbackParams {
  orgId: string;
  userId: string;
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'text' | 'issue_report';
  featureArea: string;
  entityType?: string;
  entityId?: string;
  rating?: number;
  body?: string;
  context?: Record<string, unknown>;
}

export async function submitFeedback(params: SubmitFeedbackParams) {
  const { error, data } = await supabase.from('product_feedback').insert({
    organization_id: params.orgId,
    user_id: params.userId,
    feedback_type: params.feedbackType,
    feature_area: params.featureArea,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    rating: params.rating ?? null,
    body: params.body ?? null,
    context: params.context ?? {},
  }).select().single();

  if (error) {
    logger.error('Failed to submit feedback', { error });
    throw new Error('Failed to submit feedback');
  }

  await trackEvent({
    orgId: params.orgId,
    userId: params.userId,
    event: params.feedbackType === 'issue_report' ? 'issue_reported' : 'feedback_submitted',
    category: 'feedback',
    properties: {
      feedback_type: params.feedbackType,
      feature_area: params.featureArea,
      rating: params.rating,
    },
  });

  return data;
}

export async function getFeedbackSummary(orgId: string) {
  const { data, error } = await supabase
    .from('product_feedback')
    .select('feature_area, feedback_type, rating')
    .eq('organization_id', orgId);
  if (error) {
    logger.error('Failed to fetch feedback summary', { error });
    return {};
  }
  // Group by feature_area
  const grouped: Record<string, { thumbs_up: number; thumbs_down: number; total: number }> = {};
  for (const item of data ?? []) {
    if (!grouped[item.feature_area]) {
      grouped[item.feature_area] = { thumbs_up: 0, thumbs_down: 0, total: 0 };
    }
    grouped[item.feature_area].total++;
    if (item.feedback_type === 'thumbs_up') grouped[item.feature_area].thumbs_up++;
    if (item.feedback_type === 'thumbs_down') grouped[item.feature_area].thumbs_down++;
  }
  return grouped;
}

export async function getRecentFeedback(orgId: string, limit = 50) {
  const { data, error } = await supabase
    .from('product_feedback')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    logger.error('Failed to fetch recent feedback', { error });
    return [];
  }
  return data ?? [];
}
