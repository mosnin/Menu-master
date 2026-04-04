import { supabase } from '@/lib/db/client';
import type { PacketIngestion, PacketIngestionStatus } from '@/types';

const TABLE = 'packet_ingestions';

export async function findById(
  id: string,
): Promise<PacketIngestion | null> {
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
): Promise<PacketIngestion[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<PacketIngestion, 'id' | 'created_at' | 'updated_at'>,
): Promise<PacketIngestion> {
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
  status: PacketIngestionStatus,
  extra?: {
    processing_started_at?: string;
    processing_completed_at?: string;
    classification_results?: Record<string, unknown>;
    error_message?: string;
  },
): Promise<PacketIngestion> {
  const updates: Record<string, unknown> = { status, ...extra };

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
