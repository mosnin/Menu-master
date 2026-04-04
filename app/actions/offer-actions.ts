'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import * as offerService from '@/lib/services/offer-service';
import * as listingService from '@/lib/services/listing-service';
import * as handoffService from '@/lib/services/listing-handoff-service';
import type { OfferStatus, OfferFinancingType } from '@/types';

export async function createOfferAction(
  listingId: string,
  data: {
    buyerName: string;
    buyerEmail?: string;
    buyerPhone?: string;
    buyerAgentName?: string;
    buyerAgentEmail?: string;
    offerAmount: number;
    earnestMoney?: number;
    financingType?: OfferFinancingType;
    contingencies?: string[];
    closingTimelineDays?: number;
    proposedClosingDate?: string;
    concessionsAmount?: number;
    concessionsNotes?: string;
    offerDate?: string;
    expirationDate?: string;
    sellerNotes?: string;
  },
): Promise<{ id?: string; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const listing = await listingService.getListing(listingId);
    if (!listing) return { error: 'Listing not found' };
    await requireOrgMembership(listing.organization_id);

    const offer = await offerService.createOffer({
      listingId,
      organizationId: listing.organization_id,
      submittedByUserId: profile.id,
      ...data,
    });

    revalidatePath(`/listings/${listingId}`);
    revalidatePath(`/listings/${listingId}/offers`);
    return { id: offer.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create offer' };
  }
}

export async function updateOfferStatusAction(
  offerId: string,
  newStatus: OfferStatus,
  options?: { decisionNotes?: string; counterAmount?: number; counterNotes?: string },
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const offer = await offerService.getOffer(offerId);
    if (!offer) return { error: 'Offer not found' };
    await requireOrgMembership(offer.organization_id);

    await offerService.updateOfferStatus(offerId, newStatus, profile.id, options);

    revalidatePath(`/listings/${offer.listing_id}`);
    revalidatePath(`/listings/${offer.listing_id}/offers`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update offer status' };
  }
}

export async function acceptOfferAndHandoffAction(
  offerId: string,
  options?: { decisionNotes?: string; notes?: string },
): Promise<{ transactionId?: string; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const offer = await offerService.getOffer(offerId);
    if (!offer) return { error: 'Offer not found' };
    await requireOrgMembership(offer.organization_id);

    const result = await handoffService.acceptOfferAndHandoff(offerId, profile.id, options);

    revalidatePath(`/listings/${offer.listing_id}`);
    revalidatePath(`/listings/${offer.listing_id}/offers`);
    revalidatePath('/transactions');
    return { transactionId: result.transaction.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to accept offer' };
  }
}

export async function getOffersByListingAction(listingId: string) {
  await requireAuth();
  const listing = await listingService.getListing(listingId);
  if (!listing) return [];
  await requireOrgMembership(listing.organization_id);
  return offerService.getOffersByListing(listingId);
}

export async function getOfferAction(offerId: string) {
  await requireAuth();
  const offer = await offerService.getOffer(offerId);
  if (!offer) return null;
  await requireOrgMembership(offer.organization_id);
  return offer;
}
