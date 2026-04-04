import { supabase } from '@/lib/db/client';
import type { WorldStateSnapshot, OrchestratorEntityType, OrchestratorWorldState } from '@/types';
import * as worldStateRepo from '@/lib/repositories/orchestrator-world-states';
import crypto from 'crypto';

// TODO: These should come from org config rather than being hardcoded defaults
const DEFAULT_REQUIRED_DOC_TYPES = [
  'purchase_agreement',
  'disclosure',
  'inspection_report',
  'title_report',
];

const DEFAULT_REQUIRED_LISTING_DOC_TYPES = [
  'listing_agreement',
  'disclosure',
  'inspection_report',
];

// ---------------------------------------------------------------------------
// Simple in-memory TTL cache for world state snapshots (5 minute expiry)
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  snapshot: WorldStateSnapshot;
  expiresAt: number;
}

const snapshotCache = new Map<string, CacheEntry>();

function getCachedSnapshot(entityId: string): WorldStateSnapshot | null {
  const entry = snapshotCache.get(entityId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    snapshotCache.delete(entityId);
    return null;
  }
  return entry.snapshot;
}

function setCachedSnapshot(entityId: string, snapshot: WorldStateSnapshot): void {
  snapshotCache.set(entityId, {
    snapshot,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/** Exported for testing — clears the entire snapshot cache. */
export function clearSnapshotCache(): void {
  snapshotCache.clear();
}

export async function aggregateWorldState(
  orchestratorId: string,
  entityType: OrchestratorEntityType,
  entityId: string,
): Promise<WorldStateSnapshot> {
  // Check cache first
  const cached = getCachedSnapshot(entityId);
  if (cached) return cached;

  const snapshot =
    entityType === 'transaction'
      ? await aggregateTransactionState(entityId)
      : await aggregateListingState(entityId);

  setCachedSnapshot(entityId, snapshot);
  return snapshot;
}

async function aggregateTransactionState(transactionId: string): Promise<WorldStateSnapshot> {
  const [
    transactionResult,
    completenessResult,
    healthScoreResult,
    exceptionsResult,
    documentsResult,
    approvalsResult,
    communicationsResult,
    obligationsResult,
    assignmentsResult,
    checklistItemsResult,
    correctionsResult,
    economicsResult,
  ] = await Promise.all([
    supabase.from('transactions').select('*').eq('id', transactionId).single(),
    supabase
      .from('transaction_completeness')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('deal_health_scores')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('transaction_exceptions')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', transactionId)
      .eq('resolution_status', 'open'),
    supabase
      .from('documents')
      .select('document_type, processing_status')
      .eq('transaction_id', transactionId),
    supabase
      .from('approvals')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', transactionId)
      .eq('status', 'pending'),
    supabase
      .from('communication_messages')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', transactionId)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase
      .from('response_obligations')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('status', 'open'),
    supabase
      .from('transaction_assignments')
      .select('user_profile_id, role')
      .eq('transaction_id', transactionId),
    supabase
      .from('checklist_items')
      .select('due_date, status, title')
      .eq('transaction_id', transactionId)
      .not('status', 'in', '("completed","skipped")'),
    supabase
      .from('field_corrections')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', 'transaction')
      .eq('entity_id', transactionId)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase
      .from('transaction_economics')
      .select('*')
      .eq('transaction_id', transactionId)
      .maybeSingle(),
  ]);

  // Null-safe extraction with error checking
  if (transactionResult.error) {
    console.error(`Failed to fetch transaction ${transactionId}:`, transactionResult.error);
  }
  if (completenessResult.error) {
    console.error(`Failed to fetch completeness for ${transactionId}:`, completenessResult.error);
  }
  if (healthScoreResult.error) {
    console.error(`Failed to fetch health score for ${transactionId}:`, healthScoreResult.error);
  }

  const transaction = transactionResult.data as Record<string, unknown> | null;
  const completeness = completenessResult.data as Record<string, unknown> | null;
  const healthScore = healthScoreResult.data as Record<string, unknown> | null;
  const exceptions = exceptionsResult.error ? 0 : (exceptionsResult.count ?? 0);
  const documents = documentsResult.error ? [] : (documentsResult.data ?? []) as Record<string, unknown>[];
  const approvals = approvalsResult.error ? 0 : (approvalsResult.count ?? 0);
  const communications = communicationsResult.error ? 0 : (communicationsResult.count ?? 0);
  const obligations = obligationsResult.error ? [] : (obligationsResult.data ?? []) as Record<string, unknown>[];
  const assignments = assignmentsResult.error ? [] : (assignmentsResult.data ?? []) as Record<string, unknown>[];
  const checklistItems = checklistItemsResult.error ? [] : (checklistItemsResult.data ?? []) as Record<string, unknown>[];
  const corrections = correctionsResult.error ? 0 : (correctionsResult.count ?? 0);
  const economics = economicsResult.data as Record<string, unknown> | null;

  // Build missing docs list using configurable doc types
  const existingDocTypes = new Set(
    documents.map(d => d.document_type as string).filter(Boolean),
  );
  const missingDocs = DEFAULT_REQUIRED_DOC_TYPES.filter(t => !existingDocTypes.has(t));

  // Build urgent deadlines from checklist items
  const now = new Date();
  const urgentDeadlines = checklistItems
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

  // Build response latency signals — use due_at (not created_at) so we measure
  // how long the obligation has been *overdue*, not merely how old it is.
  const responseLatency = obligations.map(o => {
    const referenceDate = o.due_at ? new Date(o.due_at as string) : new Date(o.created_at as string);
    const daysWaiting = Math.max(
      0,
      Math.ceil((now.getTime() - referenceDate.getTime()) / 86400000),
    );
    return {
      waiting_on: (o.description as string) || 'Unknown',
      days_waiting: daysWaiting,
    };
  });

  // Count overdue obligations
  const overdueObligations = obligations.filter(
    o => o.due_at && new Date(o.due_at as string) < now,
  ).length;

  // Get compliance flags
  const complianceResult = await supabase
    .from('compliance_issues')
    .select('category, severity')
    .eq('transaction_id', transactionId)
    .eq('status', 'open');
  const complianceFlags = (complianceResult.error ? [] : (complianceResult.data ?? [])).map(
    (i: Record<string, unknown>) => `${i.severity}:${i.category}`,
  );

  // Count recent uploads (last 7 days)
  const recentUploadsResult = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_id', transactionId)
    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

  return {
    entity_type: 'transaction',
    entity_id: transactionId,
    stage: (transaction?.stage as string) ?? (transaction?.status as string) ?? 'unknown',
    readiness: (completeness?.readiness_state as WorldStateSnapshot['readiness']) ?? 'not_ready',
    completeness_score: (completeness?.completeness_score as number) ?? 0,
    unresolved_exceptions: exceptions,
    missing_docs: missingDocs,
    missing_signatures: (completeness?.missing_signatures as string[]) ?? [],
    pending_approvals: approvals,
    recent_communications: communications,
    open_obligations: obligations.length,
    overdue_obligations: overdueObligations,
    response_latency_signals: responseLatency,
    ownership: {
      owner_id: (assignments[0]?.user_profile_id as string) ?? null,
      owner_role: (assignments[0]?.role as string) ?? null,
    },
    assignments: assignments.map(a => ({
      user_id: a.user_profile_id as string,
      role: a.role as string,
    })),
    urgent_deadlines: urgentDeadlines,
    recent_corrections: corrections,
    recent_uploads: recentUploadsResult.error ? 0 : (recentUploadsResult.count ?? 0),
    compliance_flags: complianceFlags,
    economics_summary: economics ? { finalized: economics.finalized } : null,
    health_rating: (healthScore?.rating as string) ?? null,
    health_score: (healthScore?.overall_score as number) ?? null,
  };
}

async function aggregateListingState(listingId: string): Promise<WorldStateSnapshot> {
  const [
    listingResult,
    documentsResult,
    exceptionsResult,
    checklistItemsResult,
    offersResult,
    contactsResult,
    recentUploadsResult,
  ] = await Promise.all([
    supabase.from('listings').select('*').eq('id', listingId).single(),
    supabase
      .from('listing_documents')
      .select('document_category')
      .eq('listing_id', listingId),
    supabase
      .from('listing_exceptions')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .eq('resolution_status', 'open'),
    supabase
      .from('listing_checklist_items')
      .select('due_date, status, title, is_required')
      .eq('listing_id', listingId)
      .not('status', 'eq', 'completed'),
    supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .eq('status', 'pending'),
    supabase
      .from('listing_contacts')
      .select('contact_id, role')
      .eq('listing_id', listingId),
    supabase
      .from('listing_documents')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);

  // Null-safe extraction with error checking
  if (listingResult.error) {
    console.error(`Failed to fetch listing ${listingId}:`, listingResult.error);
  }

  const listing = listingResult.data as Record<string, unknown> | null;
  const documents = documentsResult.error ? [] : (documentsResult.data ?? []) as Record<string, unknown>[];
  const exceptions = exceptionsResult.error ? 0 : (exceptionsResult.count ?? 0);
  const checklistItems = checklistItemsResult.error ? [] : (checklistItemsResult.data ?? []) as Record<string, unknown>[];
  const contacts = contactsResult.error ? [] : (contactsResult.data ?? []) as Record<string, unknown>[];
  const recentUploads = recentUploadsResult.error ? 0 : (recentUploadsResult.count ?? 0);

  // Build missing docs list using configurable listing doc types
  const existingDocCategories = new Set(
    documents.map(d => d.document_category as string).filter(Boolean),
  );
  const missingDocs = DEFAULT_REQUIRED_LISTING_DOC_TYPES.filter(t => !existingDocCategories.has(t));

  // Build urgent deadlines from checklist items
  const now = new Date();
  const urgentDeadlines = checklistItems
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

  // Compute a basic completeness score from checklist items
  const totalRequired = checklistItems.filter(i => i.is_required !== false).length;
  const completedRequired = checklistItems.filter(
    i => i.is_required !== false && (i.status === 'completed' || i.status === 'skipped'),
  ).length;
  // All items fetched are non-completed, so completedRequired here will be 0.
  // We need total items (including completed) for a real score. Use listing readiness_score instead.
  const completenessScore = (listing?.readiness_score as number) ?? 0;

  const readiness: WorldStateSnapshot['readiness'] =
    (listing?.readiness_state as WorldStateSnapshot['readiness']) ??
    (missingDocs.length === 0 ? 'ready' : 'needs_attention');

  return {
    entity_type: 'listing',
    entity_id: listingId,
    stage: (listing?.listing_stage as string) ?? 'unknown',
    readiness,
    completeness_score: completenessScore,
    unresolved_exceptions: exceptions,
    missing_docs: missingDocs,
    missing_signatures: [],
    pending_approvals: offersResult.error ? 0 : (offersResult.count ?? 0),
    recent_communications: 0,
    open_obligations: totalRequired, // outstanding required checklist items
    overdue_obligations: checklistItems.filter(
      i => i.due_date && new Date(i.due_date as string) < now,
    ).length,
    response_latency_signals: [],
    ownership: {
      owner_id: (listing?.created_by_user_id as string) ?? null,
      owner_role: null,
    },
    assignments: contacts.map(c => ({
      user_id: c.contact_id as string,
      role: c.role as string,
    })),
    urgent_deadlines: urgentDeadlines,
    recent_corrections: 0,
    recent_uploads: recentUploads,
    compliance_flags: [],
    economics_summary: listing?.list_price
      ? { finalized: false, list_price: listing.list_price }
      : null,
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
