'use server';

import { requireAuth } from '@/lib/auth/session';
import * as userProfileRepo from '@/lib/repositories/user-profiles';

export async function getProfileAction() {
  const session = await requireAuth();
  const profile = await userProfileRepo.findByAuth0Id(session.user.sub);
  if (!profile) throw new Error('Profile not found');
  return profile;
}

export async function updateProfileAction(data: {
  full_name: string;
  phone?: string;
}) {
  const session = await requireAuth();
  const profile = await userProfileRepo.findByAuth0Id(session.user.sub);
  if (!profile) throw new Error('Profile not found');

  const { supabase } = await import('@/lib/db/client');
  const updates: Record<string, unknown> = {
    full_name: data.full_name,
    updated_at: new Date().toISOString(),
  };
  if (data.phone !== undefined) updates.phone = data.phone;

  const { data: updated, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', profile.id)
    .select('*')
    .single();

  if (error) throw error;
  return updated;
}

export async function getMembershipsAction() {
  const session = await requireAuth();
  const profile = await userProfileRepo.findByAuth0Id(session.user.sub);
  if (!profile) throw new Error('Profile not found');

  const { supabase } = await import('@/lib/db/client');
  const { data, error } = await supabase
    .from('memberships')
    .select('*, organizations(*)')
    .eq('user_profile_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
