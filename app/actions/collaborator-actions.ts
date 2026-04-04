'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as transactionService from '@/lib/services/transaction-service';
import * as collaboratorService from '@/lib/services/collaborator-service';

async function getTransactionOrgId(transactionId: string): Promise<string> {
  const transaction = await transactionService.getTransactionWithDetails(transactionId);
  if (!transaction) throw new Error('Transaction not found');
  return transaction.organization_id;
}

export async function inviteCollaboratorAction(
  transactionId: string,
  email: string,
  fullName: string,
  role: string,
  permissions?: string[],
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const invite = await collaboratorService.inviteCollaborator({
      transactionId,
      email,
      fullName,
      role,
      permissions,
      invitedByUserId: profile.id,
    });

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath(`/transactions/${transactionId}/collaborators`);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to invite collaborator' };
  }
}

export async function revokeInviteAction(
  inviteId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const invite = await collaboratorService.getInvite(inviteId);
    if (!invite) return { error: 'Invite not found' };

    const orgId = await getTransactionOrgId(invite.transaction_id);
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    await collaboratorService.revokeInvite(inviteId, profile.id);

    revalidatePath(`/transactions/${invite.transaction_id}`);
    revalidatePath(`/transactions/${invite.transaction_id}/collaborators`);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to revoke invite' };
  }
}

export async function getCollaboratorsAction(
  transactionId: string,
) {
  try {
    await requireAuth();
    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const collaborators = await collaboratorService.getCollaborators(transactionId);
    return { data: collaborators };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get collaborators' };
  }
}

export async function getInvitesAction(
  transactionId: string,
) {
  try {
    await requireAuth();
    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const invites = await collaboratorService.getInvites(transactionId);
    return { data: invites };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get invites' };
  }
}
