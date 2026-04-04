import { supabase } from '@/lib/db/client';
import * as userProfileRepo from '@/lib/repositories/user-profiles';
import * as membershipRepo from '@/lib/repositories/memberships';
import * as orgRepo from '@/lib/repositories/organizations';
import * as teamInviteRepo from '@/lib/repositories/team-invites';
import type { UserProfile, TeamInvite, UserRole } from '@/types';

export const ONBOARDING_STEPS = [
  { step: 0, key: 'welcome', label: 'Welcome' },
  { step: 1, key: 'profile', label: 'Your Profile' },
  { step: 2, key: 'workspace', label: 'Workspace' },
  { step: 3, key: 'get_started', label: 'Get Started' },
] as const;

export async function getOnboardingState(
  userProfileId: string,
): Promise<UserProfile | null> {
  return userProfileRepo.findById(userProfileId);
}

export async function startOnboarding(
  userProfileId: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      onboarding_status: 'in_progress',
      onboarding_step: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userProfileId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function advanceOnboarding(
  userProfileId: string,
  step: number,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      onboarding_step: step,
      onboarding_status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userProfileId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function completeOnboarding(
  userProfileId: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      onboarding_status: 'completed',
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userProfileId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function skipOnboarding(
  userProfileId: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      onboarding_status: 'skipped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userProfileId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

// Step 1: Profile
export async function updateProfileStep(
  userProfileId: string,
  data: { full_name: string; phone?: string },
): Promise<UserProfile> {
  const updates: Record<string, unknown> = {
    full_name: data.full_name,
    updated_at: new Date().toISOString(),
  };
  if (data.phone !== undefined) {
    updates.phone = data.phone;
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userProfileId)
    .select('*')
    .single();

  if (error) throw error;
  return profile;
}

// Step 2: Workspace
export async function createOrJoinWorkspace(
  userProfileId: string,
  data: {
    action: 'create' | 'join';
    org_name?: string;
    invite_token?: string;
    role?: string;
  },
): Promise<{ organization_name: string }> {
  if (data.action === 'create') {
    if (!data.org_name) throw new Error('Organization name is required');

    const org = await orgRepo.create({ name: data.org_name });
    const role = (data.role as UserRole) || 'broker_admin';

    await membershipRepo.create({
      organization_id: org.id,
      user_profile_id: userProfileId,
      role,
    });

    return { organization_name: org.name };
  }

  // Join via invite
  if (!data.invite_token) throw new Error('Invite token is required');
  const result = await acceptTeamInvite(userProfileId, data.invite_token);
  return { organization_name: result.organization_name };
}

// Invite handling
export async function checkPendingInvites(
  email: string,
): Promise<TeamInvite[]> {
  return teamInviteRepo.findPendingByEmail(email);
}

export async function acceptTeamInvite(
  userProfileId: string,
  inviteToken: string,
): Promise<{ organization_name: string }> {
  const invite = await teamInviteRepo.findByToken(inviteToken);
  if (!invite) throw new Error('Invite not found');
  if (invite.status !== 'pending') throw new Error('Invite is no longer valid');
  if (new Date(invite.expires_at) < new Date()) throw new Error('Invite has expired');

  // Create membership
  await membershipRepo.create({
    organization_id: invite.organization_id,
    user_profile_id: userProfileId,
    role: invite.role,
  });

  // Mark invite as accepted
  await teamInviteRepo.update(invite.id, {
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  });

  // Get org name for display
  const org = await orgRepo.findById(invite.organization_id);
  return { organization_name: org?.name ?? 'Unknown' };
}
