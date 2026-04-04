'use server';

import { requireAuth } from '@/lib/auth/session';
import * as userProfileRepo from '@/lib/repositories/user-profiles';
import * as onboardingService from '@/lib/services/onboarding-service';

async function getProfileFromSession() {
  const session = await requireAuth();
  const profile = await userProfileRepo.findByAuth0Id(session.user.sub);
  if (!profile) throw new Error('User profile not found');
  return profile;
}

export async function getOnboardingStateAction() {
  const profile = await getProfileFromSession();
  const state = await onboardingService.getOnboardingState(profile.id);
  return state;
}

export async function updateProfileAction(data: {
  full_name: string;
  phone?: string;
}) {
  const profile = await getProfileFromSession();
  return onboardingService.updateProfileStep(profile.id, data);
}

export async function setupWorkspaceAction(data: {
  action: 'create' | 'join';
  org_name?: string;
  invite_token?: string;
}) {
  const profile = await getProfileFromSession();
  return onboardingService.createOrJoinWorkspace(profile.id, data);
}

export async function advanceOnboardingAction(step: number) {
  const profile = await getProfileFromSession();
  return onboardingService.advanceOnboarding(profile.id, step);
}

export async function completeOnboardingAction() {
  const profile = await getProfileFromSession();
  return onboardingService.completeOnboarding(profile.id);
}

export async function skipOnboardingAction() {
  const profile = await getProfileFromSession();
  return onboardingService.skipOnboarding(profile.id);
}

export async function checkInvitesAction() {
  const profile = await getProfileFromSession();
  return onboardingService.checkPendingInvites(profile.email);
}

export async function acceptInviteAction(inviteToken: string) {
  const profile = await getProfileFromSession();
  return onboardingService.acceptTeamInvite(profile.id, inviteToken);
}
