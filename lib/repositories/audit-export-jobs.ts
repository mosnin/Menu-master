import { supabase } from '@/lib/db/client';
import type { AuditExportJob, ExportJobStatus } from '@/types';

const TABLE = 'audit_export_jobs';

export async function findById(
  id: string,
): Promise<AuditExportJob | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrgId(
  orgId: string,
): Promise<AuditExportJob[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<AuditExportJob, 'id' | 'created_at' | 'updated_at'>,
): Promise<AuditExportJob> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateStatus(
  id: string,
  status: ExportJobStatus,
): Promise<AuditExportJob> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
