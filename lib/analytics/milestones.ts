import { supabase } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { trackEvent } from './events';

export const MILESTONES = [
  'first_login',
  'setup_completed',
  'first_transaction',
  'first_document_upload',
  'first_extraction_success',
  'first_correction',
  'first_approval_completed',
  'first_reminder_sent',
  'first_email_connected',
  'first_recommendation_executed',
  'first_live_transaction', // transaction moved to 'active'
] as const;

type Milestone = typeof MILESTONES[number];

export async function recordMilestone(
  orgId: string,
  userId: string | null,
  milestone: Milestone,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await supabase.from('activation_milestones').upsert(
      {
        organization_id: orgId,
        user_id: userId,
        milestone,
        metadata: metadata ?? {},
      },
      { onConflict: 'organization_id,user_id,milestone', ignoreDuplicates: true }
    );
    if (error) {
      logger.error('Failed to record milestone', { error, milestone });
      return false;
    }
    // Also emit as a product event
    await trackEvent({
      orgId,
      userId: userId ?? undefined,
      event: 'getting_started_step_completed',
      category: 'activation',
      properties: { milestone, ...metadata },
    });
    return true;
  } catch (err) {
    logger.error('Milestone recording error', { error: err, milestone });
    return false;
  }
}

export async function getMilestones(orgId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('activation_milestones')
    .select('milestone, achieved_at')
    .eq('organization_id', orgId);
  if (error) {
    logger.error('Failed to fetch milestones', { error });
    return {};
  }
  return Object.fromEntries((data ?? []).map((m: { milestone: string; achieved_at: string }) => [m.milestone, m.achieved_at]));
}

export async function getActivationFunnel(orgId: string) {
  const milestones = await getMilestones(orgId);
  return MILESTONES.map(m => ({
    milestone: m,
    achieved: !!milestones[m],
    achievedAt: milestones[m] ?? null,
  }));
}
