import * as offerRepo from '@/lib/repositories/offers';
import * as listingRepo from '@/lib/repositories/listings';
import { logAction } from '@/lib/audit/logger';
import type { Offer, OfferStatus, OfferFinancingType } from '@/types';

// Valid offer status transitions
const OFFER_STATUS_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  received: ['under_review', 'rejected', 'withdrawn', 'expired'],
  under_review: ['countered', 'accepted', 'rejected', 'withdrawn', 'expired'],
  countered: ['under_review', 'accepted', 'rejected', 'withdrawn', 'expired'],
  accepted: [], // terminal — handoff creates transaction
  rejected: [], // terminal
  withdrawn: [], // terminal
  expired: [], // terminal
};

export class InvalidOfferTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition offer from "${from}" to "${to}"`);
    this.name = 'InvalidOfferTransitionError';
  }
}

export function validateOfferStatusTransition(from: OfferStatus, to: OfferStatus): void {
  const allowed = OFFER_STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidOfferTransitionError(from, to);
  }
}

export function getAvailableOfferTransitions(status: OfferStatus): OfferStatus[] {
  return OFFER_STATUS_TRANSITIONS[status] ?? [];
}

interface CreateOfferInput {
  listingId: string;
  organizationId: string;
  submittedByUserId: string;
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
}

export async function createOffer(input: CreateOfferInput): Promise<Offer> {
  // Verify listing exists and is in a valid stage for offers
  const listing = await listingRepo.findById(input.listingId);
  if (!listing) throw new Error('Listing not found');
  if (!['live', 'paused'].includes(listing.listing_stage)) {
    throw new Error('Listing is not in a stage that accepts offers');
  }

  const offer = await offerRepo.create({
    listing_id: input.listingId,
    organization_id: input.organizationId,
    buyer_name: input.buyerName,
    buyer_email: input.buyerEmail ?? null,
    buyer_phone: input.buyerPhone ?? null,
    buyer_agent_name: input.buyerAgentName ?? null,
    buyer_agent_email: input.buyerAgentEmail ?? null,
    offer_amount: input.offerAmount,
    earnest_money: input.earnestMoney ?? null,
    financing_type: input.financingType ?? 'conventional',
    contingencies: input.contingencies ?? [],
    closing_timeline_days: input.closingTimelineDays ?? null,
    proposed_closing_date: input.proposedClosingDate ?? null,
    concessions_amount: input.concessionsAmount ?? null,
    concessions_notes: input.concessionsNotes ?? null,
    status: 'received',
    offer_date: input.offerDate ?? new Date().toISOString().split('T')[0],
    expiration_date: input.expirationDate ?? null,
    seller_notes: input.sellerNotes ?? null,
    decision_notes: null,
    decided_by_user_id: null,
    decided_at: null,
    counter_amount: null,
    counter_notes: null,
    submitted_by_user_id: input.submittedByUserId,
    metadata: {},
  });

  await logAction({
    organizationId: input.organizationId,
    actorType: 'user',
    actorUserId: input.submittedByUserId,
    action: 'offer.created',
    targetType: 'offer',
    targetId: offer.id,
    metadata: { listing_id: input.listingId, amount: input.offerAmount, buyer: input.buyerName },
  });

  return offer;
}

export async function updateOfferStatus(
  offerId: string,
  newStatus: OfferStatus,
  userId: string,
  options?: { decisionNotes?: string; counterAmount?: number; counterNotes?: string },
): Promise<Offer> {
  const offer = await offerRepo.findById(offerId);
  if (!offer) throw new Error('Offer not found');

  validateOfferStatusTransition(offer.status, newStatus);

  const updateData: Partial<Offer> = {
    status: newStatus,
    decided_by_user_id: userId,
    decided_at: new Date().toISOString(),
  };

  if (options?.decisionNotes) {
    updateData.decision_notes = options.decisionNotes;
  }
  if (newStatus === 'countered' && options?.counterAmount) {
    updateData.counter_amount = options.counterAmount;
    updateData.counter_notes = options.counterNotes ?? null;
  }

  const updated = await offerRepo.update(offerId, updateData);

  await logAction({
    organizationId: offer.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'offer.status_changed',
    targetType: 'offer',
    targetId: offerId,
    metadata: { from_status: offer.status, to_status: newStatus, listing_id: offer.listing_id },
  });

  return updated;
}

export async function getOffersByListing(
  listingId: string,
  options?: { status?: OfferStatus },
): Promise<Offer[]> {
  return offerRepo.findByListingId(listingId, options);
}

export async function getOffer(id: string): Promise<Offer | null> {
  return offerRepo.findById(id);
}

export async function getOfferCount(listingId: string): Promise<number> {
  return offerRepo.countByListingId(listingId);
}

export { OFFER_STATUS_TRANSITIONS };
