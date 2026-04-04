import { supabase } from '@/lib/db/client';
import * as requestRepo from '@/lib/repositories/document-requests';
import * as uploadRepo from '@/lib/repositories/document-request-uploads';
import { logAction } from '@/lib/audit/logger';
import type { DocumentRequest, DocumentRequestUpload } from '@/types';

interface CreateRequestParams {
  orgId?: string;
  transactionId: string;
  requestedByUserId: string;
  recipientEmail: string;
  recipientName: string;
  documentType: string;
  description?: string;
  expiresInDays?: number;
}

export async function createRequest(
  params: CreateRequestParams,
): Promise<DocumentRequest> {
  const accessToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (params.expiresInDays ?? 14));

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

  const request = await requestRepo.create({
    organization_id: orgId!,
    transaction_id: params.transactionId,
    requested_by_user_id: params.requestedByUserId,
    recipient_email: params.recipientEmail,
    recipient_name: params.recipientName,
    document_type: params.documentType,
    description: params.description ?? null,
    status: 'sent',
    access_token: accessToken,
    expires_at: expiresAt.toISOString(),
    viewed_at: null,
    uploaded_at: null,
    cancelled_at: null,
    reminder_count: 0,
    last_reminder_at: null,
  });

  await logAction({
    organizationId: orgId,
    transactionId: params.transactionId,
    actorType: 'user',
    actorUserId: params.requestedByUserId,
    action: 'document_request.created',
    targetType: 'document_request',
    targetId: request.id,
    metadata: {
      recipient_email: params.recipientEmail,
      document_type: params.documentType,
    },
  });

  return request;
}

export async function markViewed(
  token: string,
): Promise<DocumentRequest> {
  const request = await requestRepo.findByToken(token);
  if (!request) throw new Error('Document request not found');

  if (request.status === 'cancelled' || request.status === 'expired') {
    throw new Error(`Request is ${request.status}`);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('document_requests')
    .update({
      status: 'viewed',
      viewed_at: now,
    })
    .eq('id', request.id)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to mark as viewed: ${error.message}`);

  await logAction({
    organizationId: request.organization_id,
    transactionId: request.transaction_id,
    actorType: 'system',
    action: 'document_request.viewed',
    targetType: 'document_request',
    targetId: request.id,
    metadata: { recipient_email: request.recipient_email },
  });

  return data as DocumentRequest;
}

export async function handleUpload(
  token: string,
  documentId: string,
  uploaderEmail: string,
  uploaderName: string,
  fileName: string,
  fileSize: number,
): Promise<DocumentRequestUpload> {
  const request = await requestRepo.findByToken(token);
  if (!request) throw new Error('Document request not found');

  if (request.status === 'cancelled' || request.status === 'expired') {
    throw new Error(`Request is ${request.status}`);
  }

  const upload = await uploadRepo.create({
    document_request_id: request.id,
    document_id: documentId,
    uploader_email: uploaderEmail,
    uploader_name: uploaderName,
    file_name: fileName,
    file_size: fileSize,
  });

  const now = new Date().toISOString();
  await supabase
    .from('document_requests')
    .update({
      status: 'uploaded',
      uploaded_at: now,
    })
    .eq('id', request.id);

  await logAction({
    organizationId: request.organization_id,
    transactionId: request.transaction_id,
    actorType: 'system',
    action: 'document_request.uploaded',
    targetType: 'document_request',
    targetId: request.id,
    metadata: {
      document_id: documentId,
      uploader_email: uploaderEmail,
      file_name: fileName,
      file_size: fileSize,
    },
  });

  return upload;
}

export async function cancelRequest(
  requestId: string,
  userId: string,
): Promise<DocumentRequest> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('document_requests')
    .update({
      status: 'cancelled',
      cancelled_at: now,
    })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to cancel request: ${error.message}`);

  const request = data as DocumentRequest;

  await logAction({
    organizationId: request.organization_id,
    transactionId: request.transaction_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'document_request.cancelled',
    targetType: 'document_request',
    targetId: requestId,
    metadata: { document_type: request.document_type },
  });

  return request;
}

export async function getRequestsForTransaction(
  transactionId: string,
): Promise<(DocumentRequest & { uploads?: DocumentRequestUpload[] })[]> {
  const requests = await requestRepo.findByTransactionId(transactionId);

  const requestsWithUploads = await Promise.all(
    requests.map(async (req) => {
      const uploads = await uploadRepo.findByRequestId(req.id);
      return { ...req, uploads };
    }),
  );

  return requestsWithUploads;
}

/** Alias used by action layer */
export const createDocumentRequest = createRequest;

/** Alias used by action layer */
export const cancelDocumentRequest = cancelRequest;

/** Alias used by action layer */
export const getDocumentRequests = getRequestsForTransaction;

export async function getDocumentRequest(
  requestId: string,
): Promise<DocumentRequest | null> {
  const { data, error } = await supabase
    .from('document_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch document request: ${error.message}`);
  return data as DocumentRequest | null;
}

export async function verifyRequestAccess(
  token: string,
): Promise<DocumentRequest> {
  const request = await requestRepo.findByToken(token);
  if (!request) throw new Error('Document request not found');

  if (request.status === 'cancelled') {
    throw new Error('Request has been cancelled');
  }
  if (request.status === 'expired' || new Date(request.expires_at) < new Date()) {
    throw new Error('Request has expired');
  }

  return request;
}
