'use server';

import { getServerSession, getCurrentUserProfile } from '@/lib/auth/session';
import * as userProfileRepo from '@/lib/repositories/user-profiles';
import { logAction } from '@/lib/audit/logger';
import type { UserProfile } from '@/types';

export async function syncUserProfile(): Promise<UserProfile> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized: no active session');
  }

  const { user } = session;

  const profile = await userProfileRepo.upsertByAuth0Id({
    auth0_user_id: user.sub,
    email: user.email ?? '',
    full_name: user.name ?? user.email ?? '',
  });

  return profile;
}

export async function getPostAuthRoute(): Promise<string> {
  const session = await getServerSession();
  if (!session) return '/signin';

  const profile = await getCurrentUserProfile();
  if (!profile) return '/signin';

  // Check onboarding status
  if (
    profile.onboarding_status === 'pending' ||
    profile.onboarding_status === 'in_progress'
  ) {
    return '/onboarding';
  }

  // Check membership
  if (!profile.memberships || profile.memberships.length === 0) {
    return '/onboarding';
  }

  return '/dashboard';
}

export async function logSignInAction() {
  const session = await getServerSession();
  if (!session) return;

  const profile = await getCurrentUserProfile();
  if (!profile) return;

  await logAction({
    actorType: 'user',
    actorUserId: profile.id,
    action: 'user.signed_in',
    targetType: 'user_profile',
    targetId: profile.id,
    metadata: { email: session.user.email },
  });
}
