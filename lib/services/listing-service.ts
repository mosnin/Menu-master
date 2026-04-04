import * as listingRepo from '@/lib/repositories/listings';
import * as propertyRepo from '@/lib/repositories/properties';
import { logAction } from '@/lib/audit/logger';
import type { Listing, ListingStage, ListingType } from '@/types';

interface CreateListingInput {
  organizationId: string;
  createdByUserId: string;
  title: string;
  listingType?: ListingType;
  listPrice?: number;
  listingDescription?: string;
  targetLaunchDate?: string;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  notes?: string;
  // Property fields (creates new property if provided)
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyPostalCode?: string;
  propertyId?: string;
}

export async function createListing(input: CreateListingInput): Promise<Listing> {
  let propertyId = input.propertyId ?? null;

  // Create property if address provided but no existing property
  if (!propertyId && input.propertyAddress) {
    const property = await propertyRepo.create({
      organization_id: input.organizationId,
      address_line_1: input.propertyAddress,
      address_line_2: null,
      city: input.propertyCity ?? '',
      state: input.propertyState ?? '',
      postal_code: input.propertyPostalCode ?? '',
    });
    propertyId = property.id;
  }

  const listing = await listingRepo.create({
    organization_id: input.organizationId,
    property_id: propertyId,
    created_by_user_id: input.createdByUserId,
    title: input.title,
    listing_stage: 'intake',
    listing_type: input.listingType ?? 'residential',
    list_price: input.listPrice ?? null,
    listing_description: input.listingDescription ?? null,
    target_launch_date: input.targetLaunchDate ?? null,
    actual_launch_date: null,
    mls_number: null,
    seller_name: input.sellerName ?? null,
    seller_email: input.sellerEmail ?? null,
    seller_phone: input.sellerPhone ?? null,
    readiness_score: 0,
    readiness_state: 'not_ready',
    converted_transaction_id: null,
    converted_at: null,
    notes: input.notes ?? null,
    metadata: {},
  });

  await logAction({
    organizationId: input.organizationId,
    actorType: 'user',
    actorUserId: input.createdByUserId,
    action: 'listing.created',
    targetType: 'listing',
    targetId: listing.id,
    metadata: { title: input.title, listing_type: input.listingType ?? 'residential' },
  });

  return listing;
}

export async function updateListing(
  id: string,
  input: Partial<Pick<Listing, 'title' | 'list_price' | 'listing_description' | 'target_launch_date' | 'mls_number' | 'seller_name' | 'seller_email' | 'seller_phone' | 'notes'>>,
  userId: string,
): Promise<Listing> {
  const listing = await listingRepo.findById(id);
  if (!listing) throw new Error('Listing not found');

  const updated = await listingRepo.update(id, input);

  await logAction({
    organizationId: listing.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'listing.updated',
    targetType: 'listing',
    targetId: id,
    metadata: { fields: Object.keys(input) },
  });

  return updated;
}

export async function getListing(id: string): Promise<Listing | null> {
  return listingRepo.findById(id);
}

export async function getListings(
  orgId: string,
  options?: { stage?: ListingStage; limit?: number; offset?: number },
): Promise<Listing[]> {
  return listingRepo.findByOrgId(orgId, options);
}

export async function getListingCount(orgId: string): Promise<number> {
  return listingRepo.countByOrgId(orgId);
}
