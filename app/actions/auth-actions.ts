'use server';

import { getServerSession } from '@/lib/auth/session';
import * as userProfileRepo from '@/lib/repositories/user-profiles';
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
