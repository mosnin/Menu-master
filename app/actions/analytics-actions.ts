'use server';

import { requireAuth, getCurrentUserProfile } from '@/lib/auth/session';
import { supabase } from '@/lib/db/client';
import { getActivationFunnel } from '@/lib/analytics/milestones';
import { submitFeedback, getFeedbackSummary, getRecentFeedback } from '@/lib/analytics/feedback';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAdminOrgId(): Promise<string> {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  const membership = (profile as any).memberships?.[0];
  if (!membership || membership.role !== 'broker_admin') {
    throw new Error('Insufficient permissions');
  }
  return membership.organization_id as string;
}

// ---------------------------------------------------------------------------
// Submit Feedback (user-facing)
// ---------------------------------------------------------------------------

interface SubmitFeedbackInput {
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'text' | 'issue_report';
  featureArea: string;
  entityType?: string;
  entityId?: string;
  rating?: number;
  body?: string;
  context?: Record<string, unknown>;
}

export async function submitFeedbackAction(input: SubmitFeedbackInput) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  const orgId = (profile as any).memberships?.[0]?.organization_id;
  if (!orgId) throw new Error('No organization found');

  return submitFeedback({
    orgId,
    userId: profile.id,
    feedbackType: input.feedbackType,
    featureArea: input.featureArea,
    entityType: input.entityType,
    entityId: input.entityId,
    rating: input.rating,
    body: input.body,
    context: input.context,
  });
}

// ---------------------------------------------------------------------------
// Activation Funnel
// ---------------------------------------------------------------------------

export async function getActivationFunnelAction() {
  try {
    const orgId = await getAdminOrgId();
    const funnel = await getActivationFunnel(orgId);
    return { data: funnel, error: null };
  } catch (err: any) {
    logger.error('getActivationFunnelAction failed', { error: err });
    return { data: null, error: err.message ?? 'Failed to load activation funnel' };
  }
}

// ---------------------------------------------------------------------------
// Org Metrics (transactions, documents, approvals, exceptions, recommendations, completeness)
// ---------------------------------------------------------------------------

export async function getOrgMetricsAction() {
  try {
    const orgId = await getAdminOrgId();

    // Run queries in parallel
    const [
      transactionsRes,
      documentsRes,
      approvalsRes,
      exceptionsRes,
      recommendationsRes,
      completenessRes,
    ] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, status')
        .eq('organization_id', orgId),
      supabase
        .from('documents')
        .select('id, processing_status')
        .eq('organization_id', orgId),
      supabase
        .from('approvals')
        .select('id, status, created_at, decided_at')
        .eq('organization_id', orgId),
      supabase
        .from('exceptions')
        .select('id, severity, resolution_status')
        .eq('organization_id', orgId),
      supabase
        .from('recommendations')
        .select('id, status, action_type')
        .eq('organization_id', orgId),
      supabase
        .from('completeness_scores')
        .select('score, readiness_state, transaction_id')
        .eq('organization_id', orgId),
    ]);

    // Transaction breakdown
    const transactions = transactionsRes.data ?? [];
    const txByStatus: Record<string, number> = {};
    for (const t of transactions) {
      txByStatus[t.status] = (txByStatus[t.status] ?? 0) + 1;
    }

    // Document breakdown
    const documents = documentsRes.data ?? [];
    const docByStatus: Record<string, number> = {};
    for (const d of documents) {
      docByStatus[d.processing_status] = (docByStatus[d.processing_status] ?? 0) + 1;
    }

    // Approval turnaround
    const approvals = approvalsRes.data ?? [];
    const pendingApprovals = approvals.filter(a => a.status === 'pending');
    const decidedApprovals = approvals.filter(a => a.decided_at);
    let avgTurnaroundMs = 0;
    if (decidedApprovals.length > 0) {
      const totalMs = decidedApprovals.reduce((sum, a) => {
        return sum + (new Date(a.decided_at).getTime() - new Date(a.created_at).getTime());
      }, 0);
      avgTurnaroundMs = totalMs / decidedApprovals.length;
    }

    // Exceptions by severity
    const exceptions = exceptionsRes.data ?? [];
    const exBySeverity: Record<string, number> = {};
    for (const e of exceptions) {
      exBySeverity[e.severity] = (exBySeverity[e.severity] ?? 0) + 1;
    }

    // Recommendations breakdown
    const recommendations = recommendationsRes.data ?? [];
    const recByStatus: Record<string, number> = {};
    const recByActionType: Record<string, { executed: number; dismissed: number; pending: number }> = {};
    for (const r of recommendations) {
      recByStatus[r.status] = (recByStatus[r.status] ?? 0) + 1;
      if (!recByActionType[r.action_type]) {
        recByActionType[r.action_type] = { executed: 0, dismissed: 0, pending: 0 };
      }
      recByActionType[r.action_type][r.status as 'executed' | 'dismissed' | 'pending']++;
    }

    // Completeness
    const completeness = completenessRes.data ?? [];
    const avgScore = completeness.length > 0
      ? completeness.reduce((s, c) => s + (c.score ?? 0), 0) / completeness.length
      : 0;
    const completenessbyState: Record<string, number> = {};
    for (const c of completeness) {
      completenessbyState[c.readiness_state] = (completenessbyState[c.readiness_state] ?? 0) + 1;
    }

    return {
      data: {
        transactions: { total: transactions.length, byStatus: txByStatus },
        documents: { total: documents.length, byStatus: docByStatus },
        approvals: {
          total: approvals.length,
          pending: pendingApprovals.length,
          avgTurnaroundMs,
        },
        exceptions: { total: exceptions.length, bySeverity: exBySeverity },
        recommendations: {
          total: recommendations.length,
          byStatus: recByStatus,
          byActionType: recByActionType,
        },
        completeness: {
          avgScore,
          byState: completenessbyState,
          total: completeness.length,
        },
      },
      error: null,
    };
  } catch (err: any) {
    logger.error('getOrgMetricsAction failed', { error: err });
    return { data: null, error: err.message ?? 'Failed to load org metrics' };
  }
}

// ---------------------------------------------------------------------------
// Correction Hotspots
// ---------------------------------------------------------------------------

export async function getCorrectionHotspotsAction() {
  try {
    const orgId = await getAdminOrgId();

    const { data, error } = await supabase
      .from('field_corrections')
      .select('field_name, id')
      .eq('organization_id', orgId);

    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.field_name] = (counts[row.field_name] ?? 0) + 1;
    }

    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([fieldName, count]) => ({ fieldName, count }));

    const totalCorrections = (data ?? []).length;

    return { data: { hotspots: sorted, totalCorrections }, error: null };
  } catch (err: any) {
    logger.error('getCorrectionHotspotsAction failed', { error: err });
    return { data: null, error: err.message ?? 'Failed to load correction hotspots' };
  }
}

// ---------------------------------------------------------------------------
// Queue Aging
// ---------------------------------------------------------------------------

export async function getQueueAgingAction() {
  try {
    const orgId = await getAdminOrgId();

    const now = new Date();

    // Overdue checklist items
    const { data: overdueItems } = await supabase
      .from('checklist_items')
      .select('id, due_date, status, transaction_id')
      .eq('organization_id', orgId)
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', now.toISOString());

    const overdue = overdueItems ?? [];
    let avgDaysOverdue = 0;
    if (overdue.length > 0) {
      const totalDays = overdue.reduce((sum, item) => {
        const dueDate = new Date(item.due_date);
        return sum + (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      avgDaysOverdue = totalDays / overdue.length;
    }

    // Pending approvals
    const { data: pendingApprovals } = await supabase
      .from('approvals')
      .select('id, created_at')
      .eq('organization_id', orgId)
      .eq('status', 'pending');

    const pending = pendingApprovals ?? [];
    let avgHoursPending = 0;
    if (pending.length > 0) {
      const totalHours = pending.reduce((sum, item) => {
        return sum + (now.getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60);
      }, 0);
      avgHoursPending = totalHours / pending.length;
    }

    return {
      data: {
        overdue: { count: overdue.length, avgDaysOverdue },
        pendingApprovals: { count: pending.length, avgHoursPending },
      },
      error: null,
    };
  } catch (err: any) {
    logger.error('getQueueAgingAction failed', { error: err });
    return { data: null, error: err.message ?? 'Failed to load queue aging' };
  }
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export async function getFeedbackSummaryAction() {
  try {
    const orgId = await getAdminOrgId();
    const summary = await getFeedbackSummary(orgId);
    return { data: summary, error: null };
  } catch (err: any) {
    logger.error('getFeedbackSummaryAction failed', { error: err });
    return { data: null, error: err.message ?? 'Failed to load feedback summary' };
  }
}

export async function getRecentFeedbackAction() {
  try {
    const orgId = await getAdminOrgId();
    const feedback = await getRecentFeedback(orgId, 50);
    return { data: feedback, error: null };
  } catch (err: any) {
    logger.error('getRecentFeedbackAction failed', { error: err });
    return { data: null, error: err.message ?? 'Failed to load recent feedback' };
  }
}
