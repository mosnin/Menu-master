import { supabase } from '@/lib/db/client';
import * as inviteRepo from '@/lib/repositories/collaborator-invites';
import { logAction } from '@/lib/audit/logger';
import type { CollaboratorInvite, CollaboratorRole } from '@/types';

interface InviteCollaboratorParams {
  orgId?: string;
  transactionId: string;
  invitedByUserId: string;
  email: string;
  fullName: string;
  role: CollaboratorRole | string;
  permissions?: Record<string, boolean> | string[];
}

export async function inviteCollaborator(
  params: InviteCollaboratorParams,
): Promise<CollaboratorInvite> {
  const accessToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Resolve orgId from transaction if not provided
  let orgId = params.orgId;
  if (!orgId) {
    const { data: txn } = await supabase
      .from('transactions')
      .select('organization_id')
      .eq('id', params.transactionId)
      .single();
    orgId = txn?.organization_id;
  }

  // Normalize permissions array to record
  const permissions: Record<string, boolean> =
    Array.isArray(params.permissions)
      ? Object.fromEntries(params.permissions.map((p) => [p, true]))
      : params.permissions ?? {};

  const invite = await inviteRepo.create({
    organization_id: orgId!,
    transaction_id: params.transactionId,
    invited_by_user_id: params.invitedByUserId,
    email: params.email,
    full_name: params.fullName,
    role: params.role as CollaboratorRole,
    status: 'pending',
    access_token: accessToken,
    expires_at: expiresAt.toISOString(),
    accepted_at: null,
    revoked_at: null,
    linked_user_id: null,
    permissions,
  });

  await logAction({
    organizationId: orgId,
    transactionId: params.transactionId,
    actorType: 'user',
    actorUserId: params.invitedByUserId,
    action: 'collaborator.invited',
    targetType: 'collaborator_invite',
    targetId: invite.id,
    metadata: { email: params.email, role: params.role },
  });

  return invite;
}

export async function acceptInvite(
  token: string,
): Promise<CollaboratorInvite> {
  const invite = await inviteRepo.findByToken(token);
  if (!invite) throw new Error('Invite not found');

  if (invite.status === 'revoked') {
    throw new Error('Invite has been revoked');
  }
  if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
    throw new Error('Invite has expired');
  }
  if (invite.status === 'accepted') {
    throw new Error('Invite has already been accepted');
  }

  const { data, error } = await supabase
    .from('collaborator_invites')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to accept invite: ${error.message}`);

  await logAction({
    organizationId: invite.organization_id,
    transactionId: invite.transaction_id,
    actorType: 'system',
    action: 'collaborator.accepted',
    targetType: 'collaborator_invite',
    targetId: invite.id,
    metadata: { email: invite.email, role: invite.role },
  });

  return data as CollaboratorInvite;
}

export async function revokeInvite(
  inviteId: string,
  revokedByUserId: string,
): Promise<CollaboratorInvite> {
  const { data, error } = await supabase
    .from('collaborator_invites')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    })
    .eq('id', inviteId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to revoke invite: ${error.message}`);

  const invite = data as CollaboratorInvite;

  await logAction({
    organizationId: invite.organization_id,
    transactionId: invite.transaction_id,
    actorType: 'user',
    actorUserId: revokedByUserId,
    action: 'collaborator.revoked',
    targetType: 'collaborator_invite',
    targetId: inviteId,
    metadata: { email: invite.email, role: invite.role },
  });

  return invite;
}

export async function getCollaboratorsForTransaction(
  transactionId: string,
): Promise<CollaboratorInvite[]> {
  const { data, error } = await supabase
    .from('collaborator_invites')
    .select('*')
    .eq('transaction_id', transactionId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch collaborators: ${error.message}`);
  return (data ?? []) as CollaboratorInvite[];
}

export async function getInvitesForTransaction(
  transactionId: string,
): Promise<CollaboratorInvite[]> {
  return inviteRepo.findByTransactionId(transactionId);
}

/** Alias used by action layer */
export const getInvites = getInvitesForTransaction;

/** Alias used by action layer */
export const getCollaborators = getCollaboratorsForTransaction;

export async function getInvite(
  inviteId: string,
): Promise<CollaboratorInvite | null> {
  const { data, error } = await supabase
    .from('collaborator_invites')
    .select('*')
    .eq('id', inviteId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch invite: ${error.message}`);
  return data as CollaboratorInvite | null;
}

export async function verifyCollaboratorAccess(
  token: string,
  transactionId: string,
): Promise<{ valid: boolean; invite: CollaboratorInvite | null }> {
  const invite = await inviteRepo.findByToken(token);

  if (!invite) return { valid: false, invite: null };
  if (invite.transaction_id !== transactionId) return { valid: false, invite: null };
  if (invite.status !== 'accepted') return { valid: false, invite: null };
  if (new Date(invite.expires_at) < new Date()) return { valid: false, invite: null };

  return { valid: true, invite };
}
