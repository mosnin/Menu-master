import { supabase } from '@/lib/db/client';
import { logAction } from '@/lib/audit/logger';
import type { DailyDigest, DailyDigestPreference } from '@/types';

export async function generateDigest(
  userId: string,
  orgId: string,
): Promise<DailyDigest> {
  const today = new Date().toISOString().split('T')[0];

  // Fetch user's transactions (via memberships and assignments)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, title, status, updated_at')
    .eq('organization_id', orgId)
    .not('status', 'in', '("closed","cancelled")');

  const txnIds = (transactions ?? []).map((t: { id: string }) => t.id);

  if (txnIds.length === 0) {
    return saveDigest(userId, orgId, today, buildEmptyContent());
  }

  const [
    urgentDeadlines,
    blockedTransactions,
    pendingApprovals,
    missingDocuments,
    healthRisks,
    closingSoon,
    staleResponses,
  ] = await Promise.all([
    fetchUrgentDeadlines(txnIds),
    fetchBlockedTransactions(txnIds),
    fetchPendingApprovals(userId, orgId),
    fetchMissingDocuments(txnIds),
    fetchHealthRisks(txnIds),
    fetchClosingSoon(txnIds),
    fetchStaleResponses(txnIds),
  ]);

  const contentJson = {
    digest_date: today,
    urgent_deadlines: urgentDeadlines,
    blocked_transactions: blockedTransactions,
    pending_approvals: pendingApprovals,
    missing_documents: missingDocuments,
    health_risks: healthRisks,
    closing_soon: closingSoon,
    stale_responses: staleResponses,
    transaction_count: txnIds.length,
  };

  const digest = await saveDigest(userId, orgId, today, contentJson);

  await logAction({
    organizationId: orgId,
    actorType: 'system',
    action: 'digest.generated',
    targetType: 'daily_digest',
    targetId: digest.id,
    metadata: {
      user_id: userId,
      digest_date: today,
      urgent_deadlines_count: urgentDeadlines.length,
      blocked_count: blockedTransactions.length,
    },
  });

  return digest;
}

export async function getDigest(
  userId: string,
  date?: string,
): Promise<DailyDigest | null> {
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }
  const { data, error } = await supabase
    .from('daily_digests')
    .select('*')
    .eq('user_id', userId)
    .eq('digest_date', date)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch digest: ${error.message}`);
  return data as DailyDigest | null;
}

export async function updatePreferences(
  userId: string,
  orgId: string,
  prefs: Partial<Omit<DailyDigestPreference, 'id' | 'user_id' | 'organization_id' | 'created_at' | 'updated_at'>>,
): Promise<DailyDigestPreference> {
  const { data, error } = await supabase
    .from('daily_digest_preferences')
    .upsert(
      {
        user_id: userId,
        organization_id: orgId,
        ...prefs,
      },
      { onConflict: 'user_id,organization_id' },
    )
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update preferences: ${error.message}`);
  return data as DailyDigestPreference;
}

export async function getPreferences(
  userId: string,
): Promise<DailyDigestPreference | null> {
  const { data, error } = await supabase
    .from('daily_digest_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch preferences: ${error.message}`);
  return data as DailyDigestPreference | null;
}

/** Alias used by action layer -- resolves orgId from user's membership */
export async function updateDigestPreferences(
  userId: string,
  prefs: Record<string, unknown>,
): Promise<DailyDigestPreference> {
  const orgId = await resolveUserOrgId(userId);
  return updatePreferences(userId, orgId, prefs);
}

/** Alias used by action layer */
export const getDigestPreferences = getPreferences;

/** Alias used by action layer -- generates a digest as a preview */
export async function generateDigestPreview(
  userId: string,
): Promise<DailyDigest> {
  const orgId = await resolveUserOrgId(userId);
  return generateDigest(userId, orgId);
}

async function resolveUserOrgId(userId: string): Promise<string> {
  const { data } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_profile_id', userId)
    .limit(1)
    .single();
  return data?.organization_id ?? '';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildEmptyContent(): Record<string, unknown> {
  return {
    digest_date: new Date().toISOString().split('T')[0],
    urgent_deadlines: [],
    blocked_transactions: [],
    pending_approvals: [],
    missing_documents: [],
    health_risks: [],
    closing_soon: [],
    stale_responses: [],
    transaction_count: 0,
  };
}

async function saveDigest(
  userId: string,
  orgId: string,
  date: string,
  contentJson: Record<string, unknown>,
): Promise<DailyDigest> {
  const { data, error } = await supabase
    .from('daily_digests')
    .upsert(
      {
        user_id: userId,
        organization_id: orgId,
        digest_date: date,
        content_json: contentJson,
        email_sent: false,
        sent_at: null,
      },
      { onConflict: 'user_id,digest_date' },
    )
    .select('*')
    .single();

  if (error) throw new Error(`Failed to save digest: ${error.message}`);
  return data as DailyDigest;
}

async function fetchUrgentDeadlines(
  txnIds: string[],
): Promise<Record<string, unknown>[]> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() + 48);

  const { data } = await supabase
    .from('checklist_items')
    .select('id, transaction_id, title, due_date, status')
    .in('transaction_id', txnIds)
    .lte('due_date', cutoff.toISOString())
    .not('status', 'in', '("completed","skipped")')
    .order('due_date', { ascending: true })
    .limit(20);

  return (data ?? []) as Record<string, unknown>[];
}

async function fetchBlockedTransactions(
  txnIds: string[],
): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from('transaction_exceptions')
    .select('transaction_id, title, severity')
    .in('transaction_id', txnIds)
    .eq('severity', 'critical')
    .eq('resolution_status', 'open');

  return (data ?? []) as Record<string, unknown>[];
}

async function fetchPendingApprovals(
  userId: string,
  orgId: string,
): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from('approvals')
    .select('id, transaction_id, approval_type, created_at')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  return (data ?? []) as Record<string, unknown>[];
}

async function fetchMissingDocuments(
  txnIds: string[],
): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from('document_requests')
    .select('id, transaction_id, recipient_name, document_type, status, expires_at')
    .in('transaction_id', txnIds)
    .in('status', ['sent', 'viewed'])
    .order('expires_at', { ascending: true })
    .limit(20);

  return (data ?? []) as Record<string, unknown>[];
}

async function fetchHealthRisks(
  txnIds: string[],
): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from('deal_health_scores')
    .select('transaction_id, overall_score, rating, computed_at')
    .in('transaction_id', txnIds)
    .in('rating', ['at_risk', 'critical'])
    .order('computed_at', { ascending: false })
    .limit(20);

  return (data ?? []) as Record<string, unknown>[];
}

async function fetchClosingSoon(
  txnIds: string[],
): Promise<Record<string, unknown>[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 7);

  const { data } = await supabase
    .from('closing_readiness')
    .select('transaction_id, readiness_state, overall_score, target_closing_date, days_until_closing')
    .in('transaction_id', txnIds)
    .not('target_closing_date', 'is', null)
    .lte('target_closing_date', cutoff.toISOString())
    .order('target_closing_date', { ascending: true });

  return (data ?? []) as Record<string, unknown>[];
}

async function fetchStaleResponses(
  txnIds: string[],
): Promise<Record<string, unknown>[]> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 48);

  const { data } = await supabase
    .from('response_obligations')
    .select('id, transaction_id, party_type, party_name, obligation_type, expected_by, status')
    .in('transaction_id', txnIds)
    .in('status', ['waiting', 'overdue'])
    .lte('expected_by', cutoff.toISOString())
    .order('expected_by', { ascending: true })
    .limit(20);

  return (data ?? []) as Record<string, unknown>[];
}
