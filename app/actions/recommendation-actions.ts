'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { dismissRecommendation, completeRecommendation } from '@/lib/services/recommendation-service';
import { supabase } from '@/lib/db/client';

export async function dismissRecommendationAction(recommendationId: string) {
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

  return result;
}

export async function completeRecommendationAction(recommendationId: string) {
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

  return result;
}
