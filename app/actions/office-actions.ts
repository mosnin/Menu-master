'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as officeService from '@/lib/services/office-service';

async function getUserOrgId(): Promise<string> {
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');
  const orgId = profile.memberships?.[0]?.organization_id;
  if (!orgId) throw new Error('No organization found');
  return orgId;
}

export async function createOfficeAction(
  name: string,
  address?: string,
  city?: string,
  state?: string,
  postalCode?: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['broker_admin']);

    const office = await officeService.createOffice(orgId, { name, address, city, state, postalCode }, profile.id);

    revalidatePath('/settings/offices');

    return { success: true, data: office };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create office' };
  }
}

export async function createTeamAction(
  officeId: string,
  name: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['broker_admin']);

    const team = await officeService.createTeam(officeId, name, profile.id);

    revalidatePath('/settings/offices');
    revalidatePath(`/settings/offices/${officeId}`);

    return { success: true, data: team };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create team' };
  }
}

export async function getOfficesAction(): Promise<{ data?: any; error?: string }> {
  try {
    await requireAuth();

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const offices = await officeService.getOffices(orgId);
    return { data: offices };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get offices' };
  }
}

export async function getTeamsAction(
  officeId?: string,
): Promise<{ data?: any; error?: string }> {
  try {
    await requireAuth();

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const teams = await officeService.getTeams(orgId, officeId);
    return { data: teams };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get teams' };
  }
}

export async function addOfficeMemberAction(
  userId: string,
  officeId: string,
  teamId: string | undefined,
  role: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['broker_admin']);

    const membership = await officeService.addOfficeMember(userId, officeId, teamId, role, profile.id);

    revalidatePath('/settings/offices');
    revalidatePath(`/settings/offices/${officeId}`);

    return { success: true, data: membership };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to add office member' };
  }
}

export async function removeOfficeMemberAction(
  membershipId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['broker_admin']);

    await officeService.removeOfficeMember(membershipId, profile.id);

    revalidatePath('/settings/offices');

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to remove office member' };
  }
}
