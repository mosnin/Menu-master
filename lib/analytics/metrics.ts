import { supabase } from '@/lib/db/client';
import { logger } from '@/lib/logger';

export async function getOrgMetrics(orgId: string) {
  try {
    const [transactions, documents, approvals, exceptions, recommendations, corrections, completeness, feedback] = await Promise.all([
      // Transaction counts by status
      supabase.from('transactions').select('status').eq('organization_id', orgId),
      // Document counts by processing_status
      supabase.from('documents').select('processing_status').eq('organization_id', orgId),
      // Approval counts by status
      supabase.from('approvals').select('status, created_at, decided_at').eq('organization_id', orgId),
      // Exception counts by severity and resolution
      supabase.from('transaction_exceptions')
        .select('severity, resolution_status, exception_type')
        .in('transaction_id', supabase.from('transactions').select('id').eq('organization_id', orgId) as unknown as string[]),
      // Recommendation stats
      supabase.from('transaction_recommendations')
        .select('status, action_type')
        .in('transaction_id', supabase.from('transactions').select('id').eq('organization_id', orgId) as unknown as string[]),
      // Correction stats
      supabase.from('field_corrections')
        .select('id, created_at, field_value_id')
        .limit(1000),
      // Completeness
      supabase.from('transaction_completeness')
        .select('completeness_score, readiness_state')
        .in('transaction_id', supabase.from('transactions').select('id').eq('organization_id', orgId) as unknown as string[]),
      // Feedback summary
      supabase.from('product_feedback')
        .select('feedback_type, feature_area, rating')
        .eq('organization_id', orgId),
    ]);

    const txData = transactions.data ?? [];
    const docData = documents.data ?? [];
    const approvalData = approvals.data ?? [];
    const exceptionData = exceptions.data ?? [];
    const recData = recommendations.data ?? [];
    const completenessData = completeness.data ?? [];
    const feedbackData = feedback.data ?? [];

    return {
      transactions: {
        total: txData.length,
        byStatus: countBy(txData, 'status'),
      },
      documents: {
        total: docData.length,
        byStatus: countBy(docData, 'processing_status'),
      },
      approvals: {
        total: approvalData.length,
        byStatus: countBy(approvalData, 'status'),
        avgTurnaroundMs: computeAvgTurnaround(approvalData),
      },
      exceptions: {
        total: exceptionData.length,
        bySeverity: countBy(exceptionData, 'severity'),
        byResolution: countBy(exceptionData, 'resolution_status'),
        byType: countBy(exceptionData, 'exception_type'),
      },
      recommendations: {
        total: recData.length,
        byStatus: countBy(recData, 'status'),
        executionRate: recData.length > 0
          ? recData.filter((r: Record<string, unknown>) => r.status === 'executed').length / recData.length
          : 0,
        dismissRate: recData.length > 0
          ? recData.filter((r: Record<string, unknown>) => r.status === 'dismissed').length / recData.length
          : 0,
      },
      completeness: {
        avgScore: completenessData.length > 0
          ? completenessData.reduce((sum: number, c: Record<string, unknown>) => sum + Number(c.completeness_score), 0) / completenessData.length
          : 0,
        byReadiness: countBy(completenessData, 'readiness_state'),
      },
      corrections: {
        total: (corrections.data ?? []).length,
      },
      feedback: {
        total: feedbackData.length,
        thumbsUp: feedbackData.filter((f: Record<string, unknown>) => f.feedback_type === 'thumbs_up').length,
        thumbsDown: feedbackData.filter((f: Record<string, unknown>) => f.feedback_type === 'thumbs_down').length,
        byFeature: countBy(feedbackData, 'feature_area'),
      },
    };
  } catch (err) {
    logger.error('Failed to compute org metrics', { error: err });
    throw new Error('Failed to compute metrics');
  }
}

function countBy<T extends Record<string, unknown>>(arr: T[], key: keyof T): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const val = String(item[key] ?? 'unknown');
    result[val] = (result[val] ?? 0) + 1;
  }
  return result;
}

function computeAvgTurnaround(approvals: Array<{ created_at: string; decided_at: string | null }>): number | null {
  const decided = approvals.filter(a => a.decided_at);
  if (decided.length === 0) return null;
  const totalMs = decided.reduce((sum, a) => {
    return sum + (new Date(a.decided_at!).getTime() - new Date(a.created_at).getTime());
  }, 0);
  return totalMs / decided.length;
}

// Correction hotspots — which fields get corrected most
export async function getCorrectionHotspots(orgId: string) {
  const { data, error } = await supabase
    .from('field_corrections')
    .select('field_value_id, extracted_field_values!field_value_id(field_name, document_id)')
    .limit(500);

  if (error || !data) {
    logger.error('Failed to fetch correction hotspots', { error, orgId });
    return [];
  }

  // Group by field_name
  const byField: Record<string, number> = {};
  for (const correction of data) {
    const fieldValue = correction.extracted_field_values as unknown as { field_name: string } | null;
    const fieldName = fieldValue?.field_name ?? 'unknown';
    byField[fieldName] = (byField[fieldName] ?? 0) + 1;
  }

  return Object.entries(byField)
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count);
}

// Queue aging — average time items sit in queues
export async function getQueueAging(orgId: string) {
  const now = new Date();

  // Overdue checklist items
  const { data: overdueItems } = await supabase
    .from('checklist_items')
    .select('due_date, status, created_at')
    .in('transaction_id', supabase.from('transactions').select('id').eq('organization_id', orgId) as unknown as string[])
    .in('status', ['pending', 'in_progress', 'needs_review'])
    .not('due_date', 'is', null);

  const overdue = (overdueItems ?? []).filter((item: Record<string, unknown>) => new Date(item.due_date as string) < now);
  const avgOverdueDays = overdue.length > 0
    ? overdue.reduce((sum: number, item: Record<string, unknown>) => {
        const days = (now.getTime() - new Date(item.due_date as string).getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / overdue.length
    : 0;

  // Pending approvals
  const { data: pendingApprovals } = await supabase
    .from('approvals')
    .select('created_at')
    .eq('organization_id', orgId)
    .eq('status', 'pending');

  const pendingList = pendingApprovals ?? [];
  const avgPendingApprovalHours = pendingList.length > 0
    ? pendingList.reduce((sum: number, a: Record<string, unknown>) => {
        const hours = (now.getTime() - new Date(a.created_at as string).getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0) / pendingList.length
    : 0;

  return {
    overdueItems: overdue.length,
    avgOverdueDays: Math.round(avgOverdueDays * 10) / 10,
    pendingApprovals: pendingList.length,
    avgPendingApprovalHours: Math.round(avgPendingApprovalHours * 10) / 10,
  };
}

// Event volume over time
export async function getEventVolume(orgId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('product_events')
    .select('event_category, created_at')
    .eq('organization_id', orgId)
    .gte('created_at', since.toISOString());

  if (error || !data) return {};

  // Group by date and category
  const byDate: Record<string, Record<string, number>> = {};
  for (const event of data) {
    const date = (event.created_at as string).substring(0, 10);
    if (!byDate[date]) byDate[date] = {};
    byDate[date][event.event_category as string] = (byDate[date][event.event_category as string] ?? 0) + 1;
  }
  return byDate;
}
