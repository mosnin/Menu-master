import { supabase } from '@/lib/db/client';
import type { Membership } from '@/types';

const TABLE = 'memberships';

export async function findByOrgAndUser(
  organizationId: string,
  userProfileId: string,
): Promise<Membership | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_profile_id', userProfileId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByUserId(
  userProfileId: string,
): Promise<Membership[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_profile_id', userProfileId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByOrgId(
  organizationId: string,
): Promise<(Membership & { user_profiles: Record<string, unknown> })[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, user_profiles(*)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findActiveByOrgAndUser(
  organizationId: string,
  userProfileId: string,
): Promise<Membership | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_profile_id', userProfileId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findActiveByUserId(
  userProfileId: string,
): Promise<Membership[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_profile_id', userProfileId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<Membership, 'id' | 'created_at' | 'updated_at'>,
): Promise<Membership> {
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
  updates: Partial<Pick<Membership, 'status' | 'role'>>,
): Promise<Membership> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function suspend(id: string): Promise<Membership> {
  return update(id, { status: 'suspended' });
}

export async function remove(id: string): Promise<Membership> {
  return update(id, { status: 'removed' });
}

export async function reactivate(id: string): Promise<Membership> {
  return update(id, { status: 'active' });
}
