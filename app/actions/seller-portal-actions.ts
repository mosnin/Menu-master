'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import * as sellerPortalService from '@/lib/services/seller-portal-service';
import * as listingService from '@/lib/services/listing-service';

export async function inviteSellerAction(
  listingId: string,
  data: { sellerEmail: string; sellerName: string },
): Promise<{ accessToken?: string; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const listing = await listingService.getListing(listingId);
    if (!listing) return { error: 'Listing not found' };
    await requireOrgMembership(listing.organization_id);

    const access = await sellerPortalService.inviteSellerToPortal(
      listingId,
      listing.organization_id,
      profile.id,
      data.sellerEmail,
      data.sellerName,
    );

    revalidatePath(`/listings/${listingId}`);
    return { accessToken: access.access_token };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to invite seller' };
  }
}

export async function revokeSellerAccessAction(accessId: string): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await sellerPortalService.revokeSellerAccess(accessId, profile.id);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to revoke access' };
  }
}

export async function getSellerPortalAccessAction(listingId: string) {
  await requireAuth();
  const listing = await listingService.getListing(listingId);
  if (!listing) return [];
  await requireOrgMembership(listing.organization_id);
  return sellerPortalService.getSellerPortalAccess(listingId);
}

export async function createSellerDocRequestAction(
  listingId: string,
  data: { documentType: string; description?: string; dueDate?: string },
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const listing = await listingService.getListing(listingId);
    if (!listing) return { error: 'Listing not found' };
    await requireOrgMembership(listing.organization_id);

    await sellerPortalService.createSellerDocRequest(
      listingId,
      listing.organization_id,
      profile.id,
      data.documentType,
      data.description,
      data.dueDate,
    );

    revalidatePath(`/listings/${listingId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create document request' };
  }
}

export async function getSellerDocRequestsAction(listingId: string) {
  await requireAuth();
  const listing = await listingService.getListing(listingId);
  if (!listing) return [];
  await requireOrgMembership(listing.organization_id);
  return sellerPortalService.getSellerDocRequests(listingId);
}

/**
 * Seller-side: validate token and get progress summary.
 * This does NOT require auth — sellers use access tokens.
 */
export async function getSellerProgressAction(accessToken: string) {
  try {
    const { access, listing } = await sellerPortalService.validateSellerAccess(accessToken);
    return await sellerPortalService.getSellerProgressSummary(listing, access);
  } catch {
    return null;
  }
}
