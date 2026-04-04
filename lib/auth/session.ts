import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client();

export async function getServerSession() {
  const session = await auth0.getSession();
  return session;
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireOrgMembership(orgId: string) {
  // This will be checked against the memberships table
  const session = await requireAuth();
  const { supabase } = await import('@/lib/db/client');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth0_user_id', session.user.sub)
    .single();

  if (!profile) throw new Error('User profile not found');

  const { data: membership } = await supabase
    .from('memberships')
    .select('*')
    .eq('organization_id', orgId)
    .eq('user_profile_id', profile.id)
    .single();

  if (!membership) throw new Error('Not a member of this organization');

  return { session, profile, membership };
}

export async function requireRole(orgId: string, allowedRoles: string[]) {
  const result = await requireOrgMembership(orgId);
  if (!allowedRoles.includes(result.membership.role)) {
    throw new Error('Insufficient permissions');
  }
  return result;
}

export async function getCurrentUserProfile() {
  const session = await requireAuth();
  const { supabase } = await import('@/lib/db/client');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, memberships(*)')
    .eq('auth0_user_id', session.user.sub)
    .single();

  return profile;
}
