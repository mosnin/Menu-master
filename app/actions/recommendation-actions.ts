'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { dismissRecommendation, completeRecommendation } from '@/lib/services/recommendation-service';
import { supabase } from '@/lib/db/client';
import { UuidSchema } from '@/lib/validation/schemas';
import { trackEvent } from '@/lib/analytics/events';
import { recordMilestone } from '@/lib/analytics/milestones';

export async function dismissRecommendationAction(recommendationId: string) {
  UuidSchema.parse(recommendationId);
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Look up the recommendation to find its transaction and org
  const { data: recommendation } = await supabase
    .from('recommendations')
    .select('transaction_id')
    .eq('id', recommendationId)
    .single();
  if (!recommendation) throw new Error('Recommendation not found');

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', recommendation.transaction_id)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const result = await dismissRecommendation(recommendationId, profile.id);

  revalidatePath(`/transactions/${recommendation.transaction_id}`);

  trackEvent({ orgId: transaction.organization_id, userId: profile.id, event: 'recommendation_dismissed' as any, category: 'recommendation', properties: { recommendationId } });

  return result;
}

export async function getRecommendationsAction(transactionId: string) {
  UuidSchema.parse(transactionId);
  await requireAuth();

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const { getActiveRecommendations } = await import('@/lib/services/recommendation-service');
  const recommendations = await getActiveRecommendations(transactionId);

  return recommendations;
}

export async function completeRecommendationAction(recommendationId: string) {
  UuidSchema.parse(recommendationId);
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Look up the recommendation to find its transaction and org
  const { data: recommendation } = await supabase
    .from('recommendations')
    .select('transaction_id')
    .eq('id', recommendationId)
    .single();
  if (!recommendation) throw new Error('Recommendation not found');

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', recommendation.transaction_id)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const result = await completeRecommendation(recommendationId, profile.id);

  revalidatePath(`/transactions/${recommendation.transaction_id}`);

  trackEvent({ orgId: transaction.organization_id, userId: profile.id, event: 'recommendation_executed' as any, category: 'recommendation', properties: { recommendationId } });
  recordMilestone(transaction.organization_id, profile.id, 'first_recommendation_executed');

  return result;
}
