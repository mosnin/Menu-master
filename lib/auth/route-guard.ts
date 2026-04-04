import { requireAuth, requireOrgMembership, requireRole } from '@/lib/auth/session';
import * as userProfileRepo from '@/lib/repositories/user-profiles';

interface RouteGuardOptions {
  orgId?: string;
  requiredRoles?: string[];
}

export async function withRouteGuard(options: RouteGuardOptions = {}) {
  const session = await requireAuth();
  const profile = await userProfileRepo.findByAuth0Id(session.user.sub);
  if (!profile) throw new Error('User profile not found');

  if (options.orgId && options.requiredRoles) {
    const result = await requireRole(options.orgId, options.requiredRoles);
    return { session, profile, membership: result.membership };
  }

  if (options.orgId) {
    const result = await requireOrgMembership(options.orgId);
    return { session, profile, membership: result.membership };
  }

  return { session, profile, membership: null };
}
