import { supabase } from '@/lib/db/client';
import type { ComplianceIssue, ComplianceIssueStatus } from '@/types';

const TABLE = 'compliance_issues';

export async function findByOrgId(
  orgId: string,
): Promise<ComplianceIssue[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByTransactionId(
  transactionId: string,
): Promise<ComplianceIssue[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByStatus(
  orgId: string,
  status: ComplianceIssueStatus,
): Promise<ComplianceIssue[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findById(
  id: string,
): Promise<ComplianceIssue | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<ComplianceIssue, 'id' | 'created_at' | 'updated_at'>,
): Promise<ComplianceIssue> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function update(
  id: string,
  updates: Partial<Omit<ComplianceIssue, 'id' | 'created_at' | 'updated_at'>>,
): Promise<ComplianceIssue> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
