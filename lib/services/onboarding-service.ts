import { supabase } from '@/lib/db/client';
import * as userProfileRepo from '@/lib/repositories/user-profiles';
import * as membershipRepo from '@/lib/repositories/memberships';
import * as orgRepo from '@/lib/repositories/organizations';
import * as teamInviteRepo from '@/lib/repositories/team-invites';
import { logAction } from '@/lib/audit/logger';
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

  await logAction({
    actorType: 'user',
    actorUserId: userProfileId,
    action: 'user.onboarding_started',
    targetType: 'user_profile',
    targetId: userProfileId,
    metadata: { step: 0 },
  });

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

  await logAction({
    actorType: 'user',
    actorUserId: userProfileId,
    action: 'user.onboarding_completed',
    targetType: 'user_profile',
    targetId: userProfileId,
    metadata: {},
  });

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

  await logAction({
    actorType: 'user',
    actorUserId: userProfileId,
    action: 'user.onboarding_skipped',
    targetType: 'user_profile',
    targetId: userProfileId,
    metadata: {},
  });

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

  await logAction({
    actorType: 'user',
    actorUserId: userProfileId,
    action: 'user.profile_updated',
    targetType: 'user_profile',
    targetId: userProfileId,
    metadata: { full_name: data.full_name, phone: data.phone },
  });

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
      status: 'active',
    });

    await logAction({
      actorType: 'user',
      actorUserId: userProfileId,
      action: 'org.created',
      targetType: 'organization',
      targetId: org.id,
      metadata: { org_name: data.org_name, role },
    });

    return { organization_name: org.name };
  }

  // Join via invite
  if (!data.invite_token) throw new Error('Invite token is required');
  const result = await acceptTeamInvite(userProfileId, data.invite_token);

  await logAction({
    actorType: 'user',
    actorUserId: userProfileId,
    action: 'org.workspace_joined',
    targetType: 'organization',
    metadata: { invite_token: data.invite_token, organization_name: result.organization_name },
  });

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

  // Email mismatch guard — look up user profile and compare email
  const userProfile = await userProfileRepo.findById(userProfileId);
  if (!userProfile) throw new Error('User profile not found');
  if (userProfile.email.toLowerCase() !== invite.email.toLowerCase()) {
    await logAction({
      organizationId: invite.organization_id,
      actorUserId: userProfileId,
      action: 'invite.email_mismatch',
      targetType: 'team_invite',
      targetId: invite.id,
      metadata: { invite_email: invite.email, user_email: userProfile.email },
    });
    throw new Error('Invite email does not match your account email');
  }

  // Duplicate accept guard — check if user already has an active membership
  const existingMembership = await membershipRepo.findActiveByOrgAndUser(
    invite.organization_id,
    userProfileId,
  );

  if (existingMembership) {
    // Already a member — just mark the invite accepted, don't create duplicate
    await teamInviteRepo.update(invite.id, {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    });

    const org = await orgRepo.findById(invite.organization_id);
    return { organization_name: org?.name ?? 'Unknown' };
  }

  // Create membership
  await membershipRepo.create({
    organization_id: invite.organization_id,
    user_profile_id: userProfileId,
    role: invite.role,
    status: 'active',
  });

  // Mark invite as accepted
  await teamInviteRepo.update(invite.id, {
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  });

  // Audit log acceptance
  await logAction({
    organizationId: invite.organization_id,
    actorUserId: userProfileId,
    action: 'collaborator.accepted',
    targetType: 'team_invite',
    targetId: invite.id,
    metadata: { role: invite.role },
  });

  // Get org name for display
  const org = await orgRepo.findById(invite.organization_id);
  return { organization_name: org?.name ?? 'Unknown' };
}

export async function revokeInvite(
  inviteId: string,
  revokedByUserId: string,
): Promise<void> {
  // Revoke the invite (sets status to 'revoked')
  const updatedInvite = await teamInviteRepo.revoke(inviteId);

  await logAction({
    organizationId: updatedInvite.organization_id,
    actorUserId: revokedByUserId,
    action: 'invite.revoked',
    targetType: 'team_invite',
    targetId: inviteId,
    metadata: { email: updatedInvite.email },
  });
}

export async function reInvite(
  orgId: string,
  email: string,
  role: UserRole,
  invitedByUserId: string,
): Promise<TeamInvite> {
  // Revoke any existing pending invite for the same email + org
  const existingInvite = await teamInviteRepo.findPendingByOrgAndEmail(orgId, email);
  if (existingInvite) {
    await teamInviteRepo.revoke(existingInvite.id);
  }

  // Create a new invite
  const newInvite = await teamInviteRepo.create({
    organization_id: orgId,
    email,
    role,
    status: 'pending',
    invited_by_user_id: invitedByUserId,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    accepted_at: null,
  });

  // Audit log the re-invite
  await logAction({
    organizationId: orgId,
    actorUserId: invitedByUserId,
    action: 'invite.re_sent',
    targetType: 'team_invite',
    targetId: newInvite.id,
    metadata: { email, role },
  });

  return newInvite;
}
