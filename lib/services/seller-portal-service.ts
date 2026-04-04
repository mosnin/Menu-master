import * as sellerPortalRepo from '@/lib/repositories/seller-portal-access';
import * as sellerDocRequestRepo from '@/lib/repositories/seller-document-requests';
import * as listingRepo from '@/lib/repositories/listings';
import { logAction } from '@/lib/audit/logger';
import type { SellerPortalAccess, SellerDocumentRequest, Listing } from '@/types';
import crypto from 'crypto';

export class SellerAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SellerAccessError';
  }
}

/**
 * Validate seller portal access token and return the access record + listing.
 * Enforces: active, not expired, not revoked.
 */
export async function validateSellerAccess(
  accessToken: string,
): Promise<{ access: SellerPortalAccess; listing: Listing }> {
  const access = await sellerPortalRepo.findByAccessToken(accessToken);
  if (!access) throw new SellerAccessError('Invalid or expired access token');

  if (!access.is_active || access.revoked_at) {
    throw new SellerAccessError('Access has been revoked');
  }

  if (access.expires_at && new Date(access.expires_at) < new Date()) {
    throw new SellerAccessError('Access token has expired');
  }

  const listing = await listingRepo.findById(access.listing_id);
  if (!listing) throw new SellerAccessError('Listing not found');

  // Verify org boundary — access and listing must belong to same org
  if (listing.organization_id !== access.organization_id) {
    throw new SellerAccessError('Access denied');
  }

  // Block access to archived/withdrawn listings
  if (['archived'].includes(listing.listing_stage)) {
    throw new SellerAccessError('This listing is no longer active');
  }

  // Update last accessed
  await sellerPortalRepo.update(access.id, {
    last_accessed_at: new Date().toISOString(),
  } as any);

  return { access, listing };
}

export async function inviteSellerToPortal(
  listingId: string,
  orgId: string,
  invitedByUserId: string,
  sellerEmail: string,
  sellerName: string,
  permissions?: Record<string, boolean>,
): Promise<SellerPortalAccess> {
  const accessToken = crypto.randomBytes(32).toString('hex');

  const access = await sellerPortalRepo.create({
    listing_id: listingId,
    organization_id: orgId,
    seller_email: sellerEmail,
    seller_name: sellerName,
    access_token: accessToken,
    is_active: true,
    permissions: permissions ?? {
      view_progress: true,
      upload_documents: true,
      view_offers_summary: false,
    },
    last_accessed_at: null,
    expires_at: null,
    revoked_at: null,
    invited_by_user_id: invitedByUserId,
  });

  await logAction({
    organizationId: orgId,
    actorType: 'user',
    actorUserId: invitedByUserId,
    action: 'seller_portal.invited',
    targetType: 'seller_portal_access',
    targetId: access.id,
    metadata: { listing_id: listingId, seller_email: sellerEmail },
  });

  return access;
}

export async function revokeSellerAccess(
  accessId: string,
  userId: string,
): Promise<void> {
  const access = await sellerPortalRepo.findById(accessId);
  if (!access) throw new Error('Access record not found');

  await sellerPortalRepo.revoke(accessId);

  await logAction({
    organizationId: access.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'seller_portal.revoked',
    targetType: 'seller_portal_access',
    targetId: accessId,
    metadata: { listing_id: access.listing_id, seller_email: access.seller_email },
  });
}

export async function getSellerPortalAccess(listingId: string): Promise<SellerPortalAccess[]> {
  return sellerPortalRepo.findByListingId(listingId);
}

export async function createSellerDocRequest(
  listingId: string,
  orgId: string,
  requestedByUserId: string,
  documentType: string,
  description?: string,
  dueDate?: string,
  sellerPortalAccessId?: string,
): Promise<SellerDocumentRequest> {
  const request = await sellerDocRequestRepo.create({
    listing_id: listingId,
    organization_id: orgId,
    requested_by_user_id: requestedByUserId,
    document_type: documentType,
    description: description ?? null,
    status: 'pending',
    seller_portal_access_id: sellerPortalAccessId ?? null,
    uploaded_document_id: null,
    due_date: dueDate ?? null,
    viewed_at: null,
    uploaded_at: null,
    reminder_count: 0,
    last_reminder_at: null,
  });

  await logAction({
    organizationId: orgId,
    actorType: 'user',
    actorUserId: requestedByUserId,
    action: 'seller_doc_request.created',
    targetType: 'seller_document_request',
    targetId: request.id,
    metadata: { listing_id: listingId, document_type: documentType },
  });

  return request;
}

export async function getSellerDocRequests(listingId: string): Promise<SellerDocumentRequest[]> {
  return sellerDocRequestRepo.findByListingId(listingId);
}

/**
 * Get the seller-visible progress summary for a listing.
 * This is what shows on the seller portal — no internal-only data.
 */
export async function getSellerProgressSummary(listing: Listing, access: SellerPortalAccess) {
  const docRequests = await sellerDocRequestRepo.findByListingId(listing.id);

  const pendingDocs = docRequests.filter(d => d.status === 'pending');
  const uploadedDocs = docRequests.filter(d => d.status === 'uploaded');

  // Simple, non-jargon stage labels for sellers
  const sellerStageLabels: Record<string, string> = {
    intake: 'Getting Started',
    preparing: 'Preparing Your Listing',
    ready_for_review: 'Final Review',
    ready_to_launch: 'Ready to Go Live',
    live: 'Listed & Active',
    paused: 'Temporarily Paused',
    under_contract: 'Under Contract',
    closed: 'Closed',
    withdrawn: 'Withdrawn',
    archived: 'Archived',
  };

  return {
    listingTitle: listing.title,
    stage: listing.listing_stage,
    stageLabel: sellerStageLabels[listing.listing_stage] ?? listing.listing_stage,
    listPrice: listing.list_price,
    targetLaunchDate: listing.target_launch_date,
    documentsRequested: docRequests.length,
    documentsPending: pendingDocs.length,
    documentsUploaded: uploadedDocs.length,
    pendingDocuments: pendingDocs.map(d => ({
      id: d.id,
      documentType: d.document_type,
      description: d.description,
      dueDate: d.due_date,
    })),
    canUpload: access.permissions.upload_documents ?? false,
    showOffersSummary: access.permissions.view_offers_summary ?? false,
  };
}
