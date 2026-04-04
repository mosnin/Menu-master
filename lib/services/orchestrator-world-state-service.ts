import { supabase } from '@/lib/db/client';
import type { WorldStateSnapshot, OrchestratorEntityType, OrchestratorWorldState } from '@/types';
import * as worldStateRepo from '@/lib/repositories/orchestrator-world-states';
import crypto from 'crypto';

export async function aggregateWorldState(
  orchestratorId: string,
  entityType: OrchestratorEntityType,
  entityId: string,
): Promise<WorldStateSnapshot> {
  if (entityType === 'transaction') {
    return aggregateTransactionState(entityId);
  }
  return aggregateListingState(entityId);
}

async function aggregateTransactionState(transactionId: string): Promise<WorldStateSnapshot> {
  const [
    transaction,
    completeness,
    healthScore,
    exceptions,
    documents,
    approvals,
    communications,
    obligations,
    assignments,
    checklistItems,
    corrections,
    economics,
  ] = await Promise.all([
    supabase.from('transactions').select('*').eq('id', transactionId).single().then(r => r.data),
    supabase
      .from('transaction_completeness')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(r => r.data),
    supabase
      .from('deal_health_scores')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(r => r.data),
    supabase
      .from('transaction_exceptions')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', transactionId)
      .eq('resolution_status', 'open')
      .then(r => r.count ?? 0),
    supabase
      .from('documents')
      .select('document_type, processing_status')
      .eq('transaction_id', transactionId)
      .then(r => r.data ?? []),
    supabase
      .from('approvals')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', transactionId)
      .eq('status', 'pending')
      .then(r => r.count ?? 0),
    supabase
      .from('communication_messages')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', transactionId)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .then(r => r.count ?? 0),
    supabase
      .from('response_obligations')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('status', 'open')
      .then(r => r.data ?? []),
    supabase
      .from('transaction_assignments')
      .select('user_profile_id, role')
      .eq('transaction_id', transactionId)
      .then(r => r.data ?? []),
    supabase
      .from('checklist_items')
      .select('due_date, status, title')
      .eq('transaction_id', transactionId)
      .not('status', 'in', '("completed","skipped")')
      .then(r => r.data ?? []),
    supabase
      .from('field_corrections')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', 'transaction')
      .eq('entity_id', transactionId)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .then(r => r.count ?? 0),
    supabase
      .from('transaction_economics')
      .select('*')
      .eq('transaction_id', transactionId)
      .maybeSingle()
      .then(r => r.data),
  ]);

  // Build missing docs list
  const existingDocTypes = new Set(
    (documents as Record<string, unknown>[]).map(d => d.document_type as string).filter(Boolean),
  );
  const requiredDocTypes = ['purchase_agreement', 'disclosure'];
  const missingDocs = requiredDocTypes.filter(t => !existingDocTypes.has(t));

  // Build urgent deadlines from checklist items
  const now = new Date();
  const urgentDeadlines = (checklistItems as Record<string, unknown>[])
    .filter(item => item.due_date)
    .map(item => {
      const dueDate = new Date(item.due_date as string);
      const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
      return {
        description: item.title as string,
        due_at: item.due_date as string,
        days_remaining: daysRemaining,
      };
    })
    .filter(d => d.days_remaining <= 7)
    .sort((a, b) => a.days_remaining - b.days_remaining)
    .slice(0, 10);

  // Build response latency signals
  const responseLatency = (obligations as Record<string, unknown>[]).map(o => ({
    waiting_on: (o.description as string) || 'Unknown',
    days_waiting: Math.ceil((now.getTime() - new Date(o.created_at as string).getTime()) / 86400000),
  }));

  // Count overdue obligations
  const overdueObligations = (obligations as Record<string, unknown>[]).filter(
    o => o.due_at && new Date(o.due_at as string) < now,
  ).length;

  // Get compliance flags
  const { data: complianceIssues } = await supabase
    .from('compliance_issues')
    .select('category, severity')
    .eq('transaction_id', transactionId)
    .eq('status', 'open');
  const complianceFlags = (complianceIssues ?? []).map(
    (i: Record<string, unknown>) => `${i.severity}:${i.category}`,
  );

  // Count recent uploads (last 7 days)
  const { count: recentUploads } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_id', transactionId)
    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

  const assignmentsTyped = assignments as Record<string, unknown>[];
  const completenessTyped = completeness as Record<string, unknown> | null;
  const healthScoreTyped = healthScore as Record<string, unknown> | null;
  const economicsTyped = economics as Record<string, unknown> | null;
  const transactionTyped = transaction as Record<string, unknown> | null;

  return {
    entity_type: 'transaction',
    entity_id: transactionId,
    stage: (transactionTyped?.stage as string) ?? (transactionTyped?.status as string) ?? 'unknown',
    readiness: (completenessTyped?.readiness_state as WorldStateSnapshot['readiness']) ?? 'not_ready',
    completeness_score: (completenessTyped?.completeness_score as number) ?? 0,
    unresolved_exceptions: exceptions as number,
    missing_docs: missingDocs,
    missing_signatures: (completenessTyped?.missing_signatures as string[]) ?? [],
    pending_approvals: approvals as number,
    recent_communications: communications as number,
    open_obligations: (obligations as Record<string, unknown>[]).length,
    overdue_obligations: overdueObligations,
    response_latency_signals: responseLatency,
    ownership: {
      owner_id: (assignmentsTyped[0]?.user_profile_id as string) ?? null,
      owner_role: (assignmentsTyped[0]?.role as string) ?? null,
    },
    assignments: assignmentsTyped.map(a => ({
      user_id: a.user_profile_id as string,
      role: a.role as string,
    })),
    urgent_deadlines: urgentDeadlines,
    recent_corrections: corrections as number,
    recent_uploads: recentUploads ?? 0,
    compliance_flags: complianceFlags,
    economics_summary: economicsTyped ? { finalized: economicsTyped.finalized } : null,
    health_rating: (healthScoreTyped?.rating as string) ?? null,
    health_score: (healthScoreTyped?.overall_score as number) ?? null,
  };
}

async function aggregateListingState(listingId: string): Promise<WorldStateSnapshot> {
  const [listing, documents, exceptions, checklistItems, offers] = await Promise.all([
    supabase.from('listings').select('*').eq('id', listingId).single().then(r => r.data),
    supabase
      .from('listing_documents')
      .select('document_type')
      .eq('listing_id', listingId)
      .then(r => r.data ?? []),
    supabase
      .from('listing_exceptions')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .eq('resolution_status', 'open')
      .then(r => r.count ?? 0),
    supabase
      .from('listing_checklist_items')
      .select('*')
      .eq('listing_id', listingId)
      .not('status', 'eq', 'completed')
      .then(r => r.data ?? []),
    supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .eq('status', 'pending')
      .then(r => r.count ?? 0),
  ]);

  const existingDocTypes = new Set(
    (documents as Record<string, unknown>[]).map(d => d.document_type as string).filter(Boolean),
  );
  const missingDocs = ['listing_agreement', 'disclosure'].filter(t => !existingDocTypes.has(t));
  const listingTyped = listing as Record<string, unknown> | null;

  return {
    entity_type: 'listing',
    entity_id: listingId,
    stage: (listingTyped?.stage as string) ?? 'unknown',
    readiness: missingDocs.length === 0 ? 'ready' : 'needs_attention',
    completeness_score: 0,
    unresolved_exceptions: exceptions as number,
    missing_docs: missingDocs,
    missing_signatures: [],
    pending_approvals: 0,
    recent_communications: 0,
    open_obligations: 0,
    overdue_obligations: 0,
    response_latency_signals: [],
    ownership: {
      owner_id: (listingTyped?.created_by_user_id as string) ?? null,
      owner_role: null,
    },
    assignments: [],
    urgent_deadlines: [],
    recent_corrections: 0,
    recent_uploads: 0,
    compliance_flags: [],
    economics_summary: null,
    health_rating: null,
    health_score: null,
  };
}

export function computeStateHash(snapshot: WorldStateSnapshot): string {
  const str = JSON.stringify(snapshot);
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

export async function captureAndStoreWorldState(
  orchestratorId: string,
  entityType: OrchestratorEntityType,
  entityId: string,
): Promise<{ worldState: OrchestratorWorldState; changed: boolean }> {
  const snapshot = await aggregateWorldState(orchestratorId, entityType, entityId);
  const hash = computeStateHash(snapshot);

  // Check if state actually changed
  const previous = await worldStateRepo.findLatestByOrchestrator(orchestratorId);
  const changed = !previous || previous.state_hash !== hash;

  const worldState = await worldStateRepo.create({
    orchestrator_id: orchestratorId,
    snapshot,
    state_hash: hash,
    changed_since_last: changed,
  });

  return { worldState, changed };
}
