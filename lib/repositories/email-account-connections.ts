import { supabase } from '@/lib/db/client';
import type { EmailAccountConnection, SyncStatus } from '@/types';

const TABLE = 'email_account_connections';

export async function findByUserId(
  userId: string,
): Promise<EmailAccountConnection[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByOrgId(
  orgId: string,
): Promise<EmailAccountConnection[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<EmailAccountConnection, 'id' | 'created_at' | 'updated_at'>,
): Promise<EmailAccountConnection> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateSyncStatus(
  id: string,
  syncStatus: SyncStatus,
  syncError?: string | null,
): Promise<EmailAccountConnection> {
  const updates: Record<string, unknown> = {
    sync_status: syncStatus,
    last_sync_at: new Date().toISOString(),
  };
  if (syncError !== undefined) {
    updates.sync_error = syncError;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateTokens(
  id: string,
  accessTokenEncrypted: string,
  refreshTokenEncrypted: string,
  tokenExpiresAt: string,
): Promise<EmailAccountConnection> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      token_expires_at: tokenExpiresAt,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
