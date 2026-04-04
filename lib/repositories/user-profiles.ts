import { supabase } from '@/lib/db/client';
import type { UserProfile } from '@/types';

const TABLE = 'user_profiles';

export async function findById(id: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByAuth0Id(
  auth0UserId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('auth0_user_id', auth0UserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertByAuth0Id(input: {
  auth0_user_id: string;
  email: string;
  full_name: string;
}): Promise<UserProfile> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(input, { onConflict: 'auth0_user_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findByEmail(
  email: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
}
