import { supabase } from '@/lib/db/client';
import * as closingReadinessRepo from '@/lib/repositories/closing-readiness';
import * as lenderRepo from '@/lib/repositories/lender-status-updates';
import * as titleRepo from '@/lib/repositories/title-status-updates';
import { logAction } from '@/lib/audit/logger';
import type {
  ClosingReadiness,
  ClosingReadinessState,
  LenderMilestone,
  TitleMilestone,
} from '@/types';

const REQUIRED_CLOSING_DOCS = [
  'purchase_agreement',
  'disclosure',
  'title_commitment',
  'closing_disclosure',
  'proof_of_insurance',
] as const;

const FINANCING_SCORE_MAP: Record<string, number> = {
  underwriting_started: 50,
  conditional_approval: 75,
  clear_to_close: 100,
  funding_confirmed: 100,
};

const TITLE_SCORE_MAP: Record<string, number> = {
  title_search_completed: 25,
  title_commitment_issued: 50,
  title_issues_cleared: 65,
  closing_disclosure_sent: 80,
  closing_scheduled: 90,
  closing_completed: 100,
};

function deriveReadinessState(score: number): ClosingReadinessState {
  if (score >= 85) return 'ready_for_closing';
  if (score >= 65) return 'nearly_ready';
  if (score >= 40) return 'at_risk';
  return 'not_ready';
}

export async function computeClosingReadiness(
  transactionId: string,
): Promise<ClosingReadiness> {
  const [
    documentScore,
    missingDocs,
    financingScore,
    titleScore,
    checklistScore,
    pendingItems,
    approvalScore,
    unresolvedBlockers,
    closingInfo,
  ] = await Promise.all([
    computeDocumentScore(transactionId),
    computeMissingDocs(transactionId),
    computeFinancingScore(transactionId),
    computeTitleScore(transactionId),
    computeChecklistScore(transactionId),
    computePendingItems(transactionId),
    computeApprovalScore(transactionId),
    computeUnresolvedBlockers(transactionId),
    computeClosingInfo(transactionId),
  ]);

  const overallScore = Math.round(
    documentScore * 0.25 +
    financingScore * 0.25 +
    titleScore * 0.20 +
    checklistScore * 0.15 +
    approvalScore * 0.15,
  );

  const readinessState = deriveReadinessState(overallScore);

  // Look up org context
  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .single();

  const record = await closingReadinessRepo.upsert({
    transaction_id: transactionId,
    readiness_state: readinessState,
    overall_score: overallScore,
    document_score: documentScore,
    financing_score: financingScore,
    title_score: titleScore,
    checklist_score: checklistScore,
    approval_score: approvalScore,
    unresolved_blockers: unresolvedBlockers,
    missing_documents: missingDocs,
    pending_items: pendingItems,
    target_closing_date: closingInfo.targetClosingDate,
    days_until_closing: closingInfo.daysUntilClosing,
    computed_at: new Date().toISOString(),
  });

  await logAction({
    organizationId: transaction?.organization_id,
    transactionId,
    actorType: 'system',
    action: 'closing_readiness.computed',
    targetType: 'closing_readiness',
    targetId: record.id,
    metadata: {
      overall_score: overallScore,
      readiness_state: readinessState,
      document_score: documentScore,
      financing_score: financingScore,
      title_score: titleScore,
      checklist_score: checklistScore,
      approval_score: approvalScore,
    },
  });

  return record;
}

export async function getClosingReadiness(
  transactionId: string,
): Promise<ClosingReadiness | null> {
  return closingReadinessRepo.findByTransactionId(transactionId);
}

// ---------------------------------------------------------------------------
// Internal scoring helpers
// ---------------------------------------------------------------------------

async function computeDocumentScore(transactionId: string): Promise<number> {
  const { data: documents } = await supabase
    .from('documents')
    .select('document_type')
    .eq('transaction_id', transactionId);

  const docTypes = new Set(
    (documents ?? [])
      .map((d: { document_type: string | null }) => d.document_type)
      .filter(Boolean),
  );

  let present = 0;
  for (const required of REQUIRED_CLOSING_DOCS) {
    if (docTypes.has(required)) present++;
  }

  return Math.round((present / REQUIRED_CLOSING_DOCS.length) * 100);
}

async function computeMissingDocs(
  transactionId: string,
): Promise<Record<string, unknown>[]> {
  const { data: documents } = await supabase
    .from('documents')
    .select('document_type')
    .eq('transaction_id', transactionId);

  const docTypes = new Set(
    (documents ?? [])
      .map((d: { document_type: string | null }) => d.document_type)
      .filter(Boolean),
  );

  return REQUIRED_CLOSING_DOCS
    .filter((t) => !docTypes.has(t))
    .map((t) => ({ document_type: t }));
}

async function computeFinancingScore(transactionId: string): Promise<number> {
  const updates = await lenderRepo.findByTransactionId(transactionId);
  if (updates.length === 0) return 0;

  const milestones = new Set(updates.map((u) => u.milestone));

  let best = 0;
  for (const [milestone, score] of Object.entries(FINANCING_SCORE_MAP)) {
    if (milestones.has(milestone as LenderMilestone) && score > best) {
      best = score;
    }
  }

  return best;
}

async function computeTitleScore(transactionId: string): Promise<number> {
  const updates = await titleRepo.findByTransactionId(transactionId);
  if (updates.length === 0) return 0;

  const milestones = new Set(updates.map((u) => u.milestone));

  let best = 0;
  for (const [milestone, score] of Object.entries(TITLE_SCORE_MAP)) {
    if (milestones.has(milestone as TitleMilestone) && score > best) {
      best = score;
    }
  }

  return best;
}

async function computeChecklistScore(transactionId: string): Promise<number> {
  const { data: items } = await supabase
    .from('checklist_items')
    .select('status')
    .eq('transaction_id', transactionId);

  const allItems = items ?? [];
  const nonSkipped = allItems.filter((i: { status: string }) => i.status !== 'skipped');

  if (nonSkipped.length === 0) return 0;

  const completed = nonSkipped.filter((i: { status: string }) => i.status === 'completed').length;
  return Math.round((completed / nonSkipped.length) * 100);
}

async function computePendingItems(
  transactionId: string,
): Promise<Record<string, unknown>[]> {
  const { data: items } = await supabase
    .from('checklist_items')
    .select('id, title, status, due_date')
    .eq('transaction_id', transactionId)
    .not('status', 'in', '("completed","skipped")');

  return (items ?? []).map((i: { id: string; title: string; status: string; due_date: string | null }) => ({
    checklist_item_id: i.id,
    title: i.title,
    status: i.status,
    due_date: i.due_date,
  }));
}

async function computeApprovalScore(transactionId: string): Promise<number> {
  const { data: approvals } = await supabase
    .from('approvals')
    .select('status')
    .eq('transaction_id', transactionId);

  const all = approvals ?? [];
  if (all.length === 0) return 100; // No approvals needed = full score

  const decided = all.filter(
    (a: { status: string }) => a.status === 'approved' || a.status === 'rejected',
  ).length;

  return Math.round((decided / all.length) * 100);
}

async function computeUnresolvedBlockers(
  transactionId: string,
): Promise<Record<string, unknown>[]> {
  const { data: exceptions } = await supabase
    .from('transaction_exceptions')
    .select('id, exception_type, severity, title')
    .eq('transaction_id', transactionId)
    .eq('resolution_status', 'open');

  return (exceptions ?? []).map((e: { id: string; exception_type: string; severity: string; title: string }) => ({
    exception_id: e.id,
    exception_type: e.exception_type,
    severity: e.severity,
    title: e.title,
  }));
}

async function computeClosingInfo(
  transactionId: string,
): Promise<{ targetClosingDate: string | null; daysUntilClosing: number | null }> {
  const { data: events } = await supabase
    .from('timeline_events')
    .select('event_type, event_date')
    .eq('transaction_id', transactionId)
    .in('event_type', ['closing', 'closing_date', 'closing_scheduled'])
    .order('event_date', { ascending: false })
    .limit(1);

  if (!events?.length || !events[0].event_date) {
    return { targetClosingDate: null, daysUntilClosing: null };
  }

  const closingDate = events[0].event_date;
  const daysUntilClosing = Math.ceil(
    (new Date(closingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return { targetClosingDate: closingDate, daysUntilClosing };
}
