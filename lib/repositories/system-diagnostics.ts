import { supabase } from '@/lib/db/client';
import type { SystemDiagnostic, DiagnosticCheckType } from '@/types';

const TABLE = 'system_diagnostics';

export async function findLatestByOrg(
  orgId: string,
): Promise<SystemDiagnostic[]> {
  // Get the latest diagnostic for each check type
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('checked_at', { ascending: false })
    .limit(20);
  if (error) throw error;

  // Deduplicate by check_type (keep latest)
  const seen = new Set<string>();
  const latest: SystemDiagnostic[] = [];
  for (const d of data ?? []) {
    if (!seen.has(d.check_type)) {
      seen.add(d.check_type);
      latest.push(d);
    }
  }
  return latest;
}

export async function create(
  input: Omit<SystemDiagnostic, 'id' | 'checked_at'>,
): Promise<SystemDiagnostic> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...input, checked_at: new Date().toISOString() })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function findByCheckType(
  orgId: string,
  checkType: DiagnosticCheckType,
  limit = 10,
): Promise<SystemDiagnostic[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('check_type', checkType)
    .order('checked_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
