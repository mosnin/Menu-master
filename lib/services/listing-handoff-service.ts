import * as listingRepo from '@/lib/repositories/listings';
import * as offerRepo from '@/lib/repositories/offers';
import * as transactionRepo from '@/lib/repositories/transactions';
import * as handoffEventRepo from '@/lib/repositories/listing-handoff-events';
import { transitionListingStage } from '@/lib/services/listing-stage-service';
import { logAction } from '@/lib/audit/logger';
import type { Listing, Offer, Transaction, ListingHandoffEvent } from '@/types';

export class HandoffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandoffError';
  }
}

export interface HandoffResult {
  transaction: Transaction;
  handoffEvent: ListingHandoffEvent;
  listing: Listing;
}

/**
 * Accepts an offer and creates (or links to) a transaction in the under_contract stage.
 * This is the critical listing → transaction handoff.
 */
export async function acceptOfferAndHandoff(
  offerId: string,
  userId: string,
  options?: { decisionNotes?: string; notes?: string },
): Promise<HandoffResult> {
  // Load offer and listing
  const offer = await offerRepo.findById(offerId);
  if (!offer) throw new HandoffError('Offer not found');

  const listing = await listingRepo.findById(offer.listing_id);
  if (!listing) throw new HandoffError('Listing not found');

  // Guard: listing must be in live or paused stage
  if (!['live', 'paused'].includes(listing.listing_stage)) {
    throw new HandoffError(`Listing is in "${listing.listing_stage}" stage — cannot accept offers`);
  }

  // Guard: offer must be in receivable status
  if (!['received', 'under_review', 'countered'].includes(offer.status)) {
    throw new HandoffError(`Offer is in "${offer.status}" status — cannot accept`);
  }

  // Guard: no already accepted offer on this listing
  const existingAccepted = await offerRepo.findAcceptedByListingId(listing.id);
  if (existingAccepted) {
    throw new HandoffError('Another offer has already been accepted on this listing');
  }

  // Guard: idempotency — listing already converted
  if (listing.converted_transaction_id) {
    throw new HandoffError('Listing has already been converted to a transaction');
  }

  // 1. Accept the offer — re-read listing after to catch concurrent handoffs
  await offerRepo.update(offerId, {
    status: 'accepted',
    decided_by_user_id: userId,
    decided_at: new Date().toISOString(),
    decision_notes: options?.decisionNotes ?? null,
  });

  // Re-read listing to catch concurrent handoff (narrow the race window)
  const freshListing = await listingRepo.findById(listing.id);
  if (freshListing?.converted_transaction_id) {
    throw new HandoffError('Listing was converted by another request — aborting');
  }

  // 2. Create the under_contract transaction
  const transaction = await transactionRepo.create({
    organization_id: listing.organization_id,
    title: listing.title,
    status: 'active',
    stage: 'under_contract',
    property_id: listing.property_id,
    created_by_user_id: userId,
    office_id: null,
    team_id: null,
  });

  // 3. Transition listing to under_contract
  await transitionListingStage(listing.id, 'under_contract', userId, {
    triggerType: 'system',
    reason: `Offer accepted — transaction ${transaction.id} created`,
  });

  // 4. Link listing to transaction
  const updatedListing = await listingRepo.update(listing.id, {
    converted_transaction_id: transaction.id,
    converted_at: new Date().toISOString(),
  } as any);

  // 5. Record handoff event
  const handoffEvent = await handoffEventRepo.create({
    listing_id: listing.id,
    offer_id: offerId,
    transaction_id: transaction.id,
    organization_id: listing.organization_id,
    handed_off_by_user_id: userId,
    documents_transferred: 0,
    contacts_transferred: 0,
    notes: options?.notes ?? null,
    metadata: {
      offer_amount: offer.offer_amount,
      buyer_name: offer.buyer_name,
      financing_type: offer.financing_type,
    },
  });

  // 6. Audit
  await logAction({
    organizationId: listing.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'listing.handoff_completed',
    targetType: 'listing',
    targetId: listing.id,
    metadata: {
      offer_id: offerId,
      transaction_id: transaction.id,
      offer_amount: offer.offer_amount,
      buyer_name: offer.buyer_name,
    },
  });

  return {
    transaction,
    handoffEvent,
    listing: updatedListing,
  };
}

/**
 * Check if a listing already has a handoff event.
 */
export async function getHandoffForListing(listingId: string): Promise<ListingHandoffEvent | null> {
  return handoffEventRepo.findByListingId(listingId);
}

export async function getHandoffForTransaction(transactionId: string): Promise<ListingHandoffEvent | null> {
  return handoffEventRepo.findByTransactionId(transactionId);
}
