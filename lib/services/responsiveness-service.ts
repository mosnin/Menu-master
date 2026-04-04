import { supabase } from '@/lib/db/client';
import { logAction } from '@/lib/audit/logger';
import type { ResponseObligation } from '@/types';

interface CreateObligationParams {
  transactionId: string;
  orgId?: string;
  partyType: string;
  partyName: string;
  partyEmail?: string;
  obligationType: string;
  description: string;
  expectedBy?: string;
  createdByUserId?: string;
}

export async function createObligation(
  params: CreateObligationParams,
): Promise<ResponseObligation> {
  const now = new Date().toISOString();

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

  const { data, error } = await supabase
    .from('response_obligations')
    .insert({
      transaction_id: params.transactionId,
      organization_id: orgId!,
      party_type: params.partyType,
      party_name: params.partyName,
      party_email: params.partyEmail ?? null,
      obligation_type: params.obligationType,
      description: params.description,
      requested_at: now,
      expected_by: params.expectedBy ?? null,
      responded_at: null,
      status: 'waiting',
      source_type: null,
      source_id: null,
    })
    .select('*')
    .single();

  if (error) throw new Error('Failed to create obligation');

  const obligation = data as ResponseObligation;

  await logAction({
    organizationId: orgId,
    transactionId: params.transactionId,
    actorType: params.createdByUserId ? 'user' : 'system',
    actorUserId: params.createdByUserId,
    action: 'response_obligation.created',
    targetType: 'response_obligation',
    targetId: obligation.id,
    metadata: {
      party_type: params.partyType,
      party_name: params.partyName,
      obligation_type: params.obligationType,
    },
  });

  return obligation;
}

export async function markResponded(
  obligationId: string,
  userId: string,
): Promise<ResponseObligation> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('response_obligations')
    .update({
      status: 'responded',
      responded_at: now,
    })
    .eq('id', obligationId)
    .select('*')
    .single();

  if (error) throw new Error('Failed to mark responded');

  const obligation = data as ResponseObligation;

  await logAction({
    organizationId: obligation.organization_id,
    transactionId: obligation.transaction_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'response_obligation.responded',
    targetType: 'response_obligation',
    targetId: obligationId,
    metadata: { party_type: obligation.party_type },
  });

  return obligation;
}

export async function markEscalated(
  obligationId: string,
  userId: string,
): Promise<ResponseObligation> {
  const { data, error } = await supabase
    .from('response_obligations')
    .update({ status: 'escalated' })
    .eq('id', obligationId)
    .select('*')
    .single();

  if (error) throw new Error('Failed to escalate obligation');

  const obligation = data as ResponseObligation;

  await logAction({
    organizationId: obligation.organization_id,
    transactionId: obligation.transaction_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'response_obligation.escalated',
    targetType: 'response_obligation',
    targetId: obligationId,
    metadata: { party_type: obligation.party_type },
  });

  return obligation;
}

export async function getObligation(
  obligationId: string,
): Promise<ResponseObligation | null> {
  const { data, error } = await supabase
    .from('response_obligations')
    .select('*')
    .eq('id', obligationId)
    .maybeSingle();

  if (error) throw new Error('Failed to fetch obligation');
  return data as ResponseObligation | null;
}

export async function getOpenObligations(
  transactionId: string,
): Promise<ResponseObligation[]> {
  const { data, error } = await supabase
    .from('response_obligations')
    .select('*')
    .eq('transaction_id', transactionId)
    .in('status', ['waiting', 'overdue', 'escalated'])
    .order('expected_by', { ascending: true });

  if (error) throw new Error('Failed to fetch obligations');
  return (data ?? []) as ResponseObligation[];
}

interface PartyReport {
  party_type: string;
  total: number;
  open: number;
  overdue: number;
  responded: number;
  avg_response_hours: number | null;
}

export async function getResponsivenessReport(
  transactionId: string,
): Promise<PartyReport[]> {
  const { data, error } = await supabase
    .from('response_obligations')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch obligations');

  const obligations = (data ?? []) as ResponseObligation[];

  // Group by party_type
  const grouped = new Map<string, ResponseObligation[]>();
  for (const ob of obligations) {
    const existing = grouped.get(ob.party_type) ?? [];
    existing.push(ob);
    grouped.set(ob.party_type, existing);
  }

  const reports: PartyReport[] = [];
  const now = new Date();

  for (const [partyType, items] of grouped) {
    const open = items.filter((o) => o.status === 'waiting' || o.status === 'overdue').length;
    const overdue = items.filter(
      (o) =>
        o.status === 'overdue' ||
        (o.status === 'waiting' && o.expected_by && new Date(o.expected_by) < now),
    ).length;
    const responded = items.filter((o) => o.status === 'responded').length;

    // Calculate average response time for responded obligations
    const responseTimes: number[] = [];
    for (const o of items) {
      if (o.responded_at && o.requested_at) {
        const hours =
          (new Date(o.responded_at).getTime() - new Date(o.requested_at).getTime()) /
          (1000 * 60 * 60);
        responseTimes.push(hours);
      }
    }

    const avgResponseHours =
      responseTimes.length > 0
        ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
        : null;

    reports.push({
      party_type: partyType,
      total: items.length,
      open,
      overdue,
      responded,
      avg_response_hours: avgResponseHours,
    });
  }

  return reports;
}
