'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as transactionService from '@/lib/services/transaction-service';
import * as documentRequestService from '@/lib/services/document-request-service';

async function getTransactionOrgId(transactionId: string): Promise<string> {
  const transaction = await transactionService.getTransactionWithDetails(transactionId);
  if (!transaction) throw new Error('Transaction not found');
  return transaction.organization_id;
}

export async function createDocumentRequestAction(
  transactionId: string,
  recipientEmail: string,
  recipientName: string,
  documentType: string,
  description?: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    await documentRequestService.createDocumentRequest({
      transactionId,
      recipientEmail,
      recipientName,
      documentType,
      description,
      requestedByUserId: profile.id,
    });

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath(`/transactions/${transactionId}/documents`);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create document request' };
  }
}

export async function cancelDocumentRequestAction(
  requestId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const request = await documentRequestService.getDocumentRequest(requestId);
    if (!request) return { error: 'Document request not found' };

    const orgId = await getTransactionOrgId(request.transaction_id);
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    await documentRequestService.cancelDocumentRequest(requestId, profile.id);

    revalidatePath(`/transactions/${request.transaction_id}`);
    revalidatePath(`/transactions/${request.transaction_id}/documents`);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to cancel document request' };
  }
}

export async function getDocumentRequestsAction(
  transactionId: string,
) {
  try {
    await requireAuth();
    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const requests = await documentRequestService.getDocumentRequests(transactionId);
    return { data: requests };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get document requests' };
  }
}
