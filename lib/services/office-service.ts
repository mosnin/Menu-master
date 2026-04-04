import * as officesRepo from '@/lib/repositories/offices';
import * as teamsRepo from '@/lib/repositories/teams';
import * as membershipsRepo from '@/lib/repositories/office-memberships';
import { logAction } from '@/lib/audit/logger';
import type { Office, Team, OfficeMembership, OfficeMembershipRole } from '@/types';

// -----------------------------------------------------------------------------
// Office Service
// Office, team, and membership management.
// -----------------------------------------------------------------------------

// --- Offices ----------------------------------------------------------------

interface CreateOfficeData {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  managingBrokerId?: string | null;
}

export async function createOffice(
  orgId: string,
  data: CreateOfficeData,
  userId: string,
): Promise<Office> {
  const office = await officesRepo.create({
    organization_id: orgId,
    name: data.name,
    address: data.address ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    postal_code: data.postalCode ?? null,
    is_active: true,
    managing_broker_id: data.managingBrokerId ?? null,
  });

  await logAction({
    organizationId: orgId,
    actorType: 'user',
    actorUserId: userId,
    action: 'office.created',
    targetType: 'office',
    targetId: office.id,
    metadata: { name: office.name },
  });

  return office;
}

export async function updateOffice(
  id: string,
  params: Partial<{
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    isActive: boolean;
    managingBrokerId: string | null;
  }>,
): Promise<Office> {
  const updates: Partial<Omit<Office, 'id' | 'created_at' | 'updated_at'>> = {};
  if (params.name !== undefined) updates.name = params.name;
  if (params.address !== undefined) updates.address = params.address;
  if (params.city !== undefined) updates.city = params.city;
  if (params.state !== undefined) updates.state = params.state;
  if (params.postalCode !== undefined) updates.postal_code = params.postalCode;
  if (params.isActive !== undefined) updates.is_active = params.isActive;
  if (params.managingBrokerId !== undefined) updates.managing_broker_id = params.managingBrokerId;

  const office = await officesRepo.update(id, updates);

  await logAction({
    organizationId: office.organization_id,
    actorType: 'user',
    action: 'office.updated',
    targetType: 'office',
    targetId: office.id,
    metadata: { updated_fields: Object.keys(updates) },
  });

  return office;
}

export async function getOffices(orgId: string): Promise<Office[]> {
  return officesRepo.findByOrgId(orgId);
}

// --- Teams ------------------------------------------------------------------

export async function createTeam(
  officeId: string,
  name: string,
  userId: string,
): Promise<Team> {
  // Look up the office to get the org id
  const office = await officesRepo.findById(officeId);
  if (!office) throw new Error(`Office not found: ${officeId}`);

  const team = await teamsRepo.create({
    organization_id: office.organization_id,
    office_id: officeId,
    name,
    team_lead_id: null,
    is_active: true,
  });

  await logAction({
    organizationId: office.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'team.created',
    targetType: 'team',
    targetId: team.id,
    metadata: { name: team.name, office_id: officeId },
  });

  return team;
}

export async function updateTeam(
  id: string,
  params: Partial<{
    name: string;
    officeId: string | null;
    teamLeadId: string | null;
    isActive: boolean;
  }>,
): Promise<Team> {
  const updates: Partial<Omit<Team, 'id' | 'created_at' | 'updated_at'>> = {};
  if (params.name !== undefined) updates.name = params.name;
  if (params.officeId !== undefined) updates.office_id = params.officeId;
  if (params.teamLeadId !== undefined) updates.team_lead_id = params.teamLeadId;
  if (params.isActive !== undefined) updates.is_active = params.isActive;

  const team = await teamsRepo.update(id, updates);

  await logAction({
    organizationId: team.organization_id,
    actorType: 'user',
    action: 'team.updated',
    targetType: 'team',
    targetId: team.id,
    metadata: { updated_fields: Object.keys(updates) },
  });

  return team;
}

export async function getTeams(orgId: string, officeId?: string): Promise<Team[]> {
  if (officeId) {
    return teamsRepo.findByOfficeId(officeId);
  }
  return teamsRepo.findByOrgId(orgId);
}

// --- Memberships ------------------------------------------------------------

export async function addMember(
  userId: string,
  officeId: string,
  teamId: string | null,
  role: OfficeMembershipRole,
): Promise<OfficeMembership> {
  return membershipsRepo.create({
    user_id: userId,
    office_id: officeId,
    team_id: teamId,
    role,
    is_primary: false,
  });
}

export async function addOfficeMember(
  userId: string,
  officeId: string,
  teamId: string | undefined,
  role: string,
  actorUserId: string,
): Promise<OfficeMembership> {
  const membership = await membershipsRepo.create({
    user_id: userId,
    office_id: officeId,
    team_id: teamId ?? null,
    role: role as OfficeMembershipRole,
    is_primary: false,
  });

  const office = await officesRepo.findById(officeId);

  await logAction({
    organizationId: office?.organization_id,
    actorType: 'user',
    actorUserId: actorUserId,
    action: 'office.updated',
    targetType: 'office_membership',
    targetId: membership.id,
    metadata: { user_id: userId, office_id: officeId, role },
  });

  return membership;
}

export async function removeMember(membershipId: string): Promise<void> {
  return membershipsRepo.deleteById(membershipId);
}

export async function removeOfficeMember(
  membershipId: string,
  actorUserId: string,
): Promise<void> {
  await membershipsRepo.deleteById(membershipId);

  await logAction({
    actorType: 'user',
    actorUserId: actorUserId,
    action: 'office.updated',
    targetType: 'office_membership',
    targetId: membershipId,
    metadata: { removed: true },
  });
}

export async function getOfficeMembers(officeId: string): Promise<OfficeMembership[]> {
  return membershipsRepo.findByOfficeId(officeId);
}

export async function getTeamMembers(teamId: string): Promise<OfficeMembership[]> {
  return membershipsRepo.findByTeamId(teamId);
}
