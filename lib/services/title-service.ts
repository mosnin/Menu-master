import { supabase } from '@/lib/db/client';
import * as titleRepo from '@/lib/repositories/title-status-updates';
import * as timelineRepo from '@/lib/repositories/timeline-events';
import { logAction } from '@/lib/audit/logger';
import type { TitleStatusUpdate, TitleMilestone } from '@/types';

// Ordered list of title/escrow milestones for progress tracking
const TITLE_MILESTONES: TitleMilestone[] = [
  'title_search_started',
  'title_search_completed',
  'title_commitment_issued',
  'title_issues_found',
  'title_issues_cleared',
  'escrow_opened',
  'earnest_money_received',
  'closing_disclosure_sent',
  'closing_scheduled',
  'closing_completed',
  'recording_completed',
  'disbursement_completed',
];

interface SubmitStatusUpdateParams {
  transactionId: string;
  orgId?: string;
  milestone: TitleMilestone | string;
  status: string;
  notes?: string;
  submittedByUserId?: string;
  submittedByEmail?: string;
  evidenceDocumentId?: string;
}

export async function submitStatusUpdate(
  params: SubmitStatusUpdateParams,
): Promise<TitleStatusUpdate> {
  // Resolve orgId from transaction if not provided
  let orgId = params.orgId;
  if (!orgId) {
    const { data: txn } = await supabase
      .from('transactions')
      .select('organization_id')
      .eq('id', params.transactionId)
      .single();
    orgId = txn?.organization_id;
  }

  const update = await titleRepo.create({
    transaction_id: params.transactionId,
    organization_id: orgId!,
    milestone: params.milestone as TitleMilestone,
    status: params.status,
    notes: params.notes ?? null,
    submitted_by_user_id: params.submittedByUserId ?? null,
    submitted_by_email: params.submittedByEmail ?? null,
    evidence_document_id: params.evidenceDocumentId ?? null,
  });

  await timelineRepo.create({
    transaction_id: params.transactionId,
    event_type: 'title_milestone',
    title: `Title: ${formatMilestone(params.milestone)}`,
    description: params.notes ?? null,
    event_date: new Date().toISOString(),
    status: 'completed',
    source: 'system',
  });

  await logAction({
    organizationId: orgId,
    transactionId: params.transactionId,
    actorType: params.submittedByUserId ? 'user' : 'system',
    actorUserId: params.submittedByUserId,
    action: 'title_status.updated',
    targetType: 'title_status_update',
    targetId: update.id,
    metadata: { milestone: params.milestone, status: params.status },
  });

  return update;
}

export async function getStatusUpdates(
  transactionId: string,
): Promise<TitleStatusUpdate[]> {
  return titleRepo.findByTransactionId(transactionId);
}

export async function getLatestMilestone(
  transactionId: string,
): Promise<TitleStatusUpdate | null> {
  return titleRepo.findLatestByTransaction(transactionId);
}

export async function getTitleProgress(
  transactionId: string,
): Promise<{ milestone: TitleMilestone; completed: boolean; update: TitleStatusUpdate | null }[]> {
  const updates = await titleRepo.findByTransactionId(transactionId);
  const completedMilestones = new Set(updates.map((u) => u.milestone));

  return TITLE_MILESTONES.map((milestone) => ({
    milestone,
    completed: completedMilestones.has(milestone),
    update: updates.find((u) => u.milestone === milestone) ?? null,
  }));
}

/** Alias used by action layer */
export const submitTitleUpdate = submitStatusUpdate;

/** Alias used by action layer */
export const getTitleUpdates = getStatusUpdates;

function formatMilestone(milestone: string): string {
  return milestone
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
