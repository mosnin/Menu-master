import { supabase } from '@/lib/db/client';
import type { AuditLog } from '@/types';

const TABLE = 'audit_logs';

export async function findByTransactionId(
  transactionId: string,
  limit = 50,
): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findByOrgId(
  orgId: string,
  limit = 50,
): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<AuditLog, 'id' | 'created_at'>,
): Promise<AuditLog> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
