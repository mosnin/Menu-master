'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import * as listingService from '@/lib/services/listing-service';
import * as listingStageService from '@/lib/services/listing-stage-service';
import * as listingReadinessService from '@/lib/services/listing-readiness-service';
import * as checklistRepo from '@/lib/repositories/listing-checklist-items';
import * as exceptionRepo from '@/lib/repositories/listing-exceptions';
import type { ListingStage, ListingType, ListingChecklistStatus, ExceptionSeverity } from '@/types';

export async function createListingAction(formData: FormData): Promise<{ id?: string; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = formData.get('organizationId') as string || profile.memberships?.[0]?.organization_id;
    if (!orgId) return { error: 'Organization not found' };
    await requireOrgMembership(orgId);

    const listing = await listingService.createListing({
      organizationId: orgId,
      createdByUserId: profile.id,
      title: formData.get('title') as string,
      listingType: (formData.get('listingType') as ListingType) || 'residential',
      listPrice: formData.get('listPrice') ? Number(formData.get('listPrice')) : undefined,
      listingDescription: formData.get('listingDescription') as string || undefined,
      targetLaunchDate: formData.get('targetLaunchDate') as string || undefined,
      sellerName: formData.get('sellerName') as string || undefined,
      sellerEmail: formData.get('sellerEmail') as string || undefined,
      sellerPhone: formData.get('sellerPhone') as string || undefined,
      propertyAddress: formData.get('propertyAddress') as string || undefined,
      propertyCity: formData.get('propertyCity') as string || undefined,
      propertyState: formData.get('propertyState') as string || undefined,
      propertyPostalCode: formData.get('propertyPostalCode') as string || undefined,
    });

    // Apply default checklist
    const defaultChecklist = listingReadinessService.getDefaultListingChecklist(listing.id);
    await checklistRepo.createMany(defaultChecklist);

    revalidatePath('/listings');
    return { id: listing.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create listing' };
  }
}

export async function updateListingAction(
  id: string,
  data: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const listing = await listingService.getListing(id);
    if (!listing) return { error: 'Listing not found' };
    await requireOrgMembership(listing.organization_id);

    await listingService.updateListing(id, data as any, profile.id);

    revalidatePath('/listings');
    revalidatePath(`/listings/${id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update listing' };
  }
}

export async function transitionListingStageAction(
  listingId: string,
  toStage: ListingStage,
  reason?: string,
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const listing = await listingService.getListing(listingId);
    if (!listing) return { error: 'Listing not found' };
    await requireOrgMembership(listing.organization_id);

    await listingStageService.transitionListingStage(listingId, toStage, profile.id, { reason });

    revalidatePath('/listings');
    revalidatePath(`/listings/${listingId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to transition stage' };
  }
}

export async function getAvailableListingStagesAction(currentStage: ListingStage) {
  return listingStageService.getAvailableListingStageTransitions(currentStage);
}

export async function getListingReadinessAction(listingId: string) {
  try {
    await requireAuth();
    const listing = await listingService.getListing(listingId);
    if (!listing) throw new Error('Listing not found');
    await requireOrgMembership(listing.organization_id);

    return await listingReadinessService.computeListingReadiness(listingId);
  } catch {
    return null;
  }
}

export async function getListingsAction(orgId: string, options?: { stage?: ListingStage }) {
  await requireAuth();
  await requireOrgMembership(orgId);
  return listingService.getListings(orgId, options);
}

export async function getListingAction(id: string) {
  await requireAuth();
  const listing = await listingService.getListing(id);
  if (!listing) return null;
  await requireOrgMembership(listing.organization_id);
  return listing;
}

export async function getListingStageHistoryAction(listingId: string) {
  await requireAuth();
  const listing = await listingService.getListing(listingId);
  if (!listing) return [];
  await requireOrgMembership(listing.organization_id);
  return listingStageService.getListingTransitionHistory(listingId);
}

export async function updateChecklistItemAction(
  itemId: string,
  status: ListingChecklistStatus,
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const item = await checklistRepo.findById(itemId);
    if (!item) return { error: 'Checklist item not found' };

    // Verify org membership via the listing
    const listing = await listingService.getListing(item.listing_id);
    if (!listing) return { error: 'Listing not found' };
    await requireOrgMembership(listing.organization_id);

    const updateData: Record<string, unknown> = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by_user_id = profile.id;
    }

    await checklistRepo.update(itemId, updateData as any);

    // Recompute readiness
    await listingReadinessService.computeListingReadiness(item.listing_id);

    revalidatePath(`/listings/${item.listing_id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update checklist item' };
  }
}

export async function getListingChecklistAction(listingId: string) {
  await requireAuth();
  const listing = await listingService.getListing(listingId);
  if (!listing) return [];
  await requireOrgMembership(listing.organization_id);
  return checklistRepo.findByListingId(listingId);
}

export async function getListingExceptionsAction(listingId: string) {
  await requireAuth();
  const listing = await listingService.getListing(listingId);
  if (!listing) return [];
  await requireOrgMembership(listing.organization_id);
  return exceptionRepo.findByListingId(listingId);
}

export async function createListingExceptionAction(
  listingId: string,
  data: { exceptionType: string; severity: ExceptionSeverity; title: string; description?: string },
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const listing = await listingService.getListing(listingId);
    if (!listing) return { error: 'Listing not found' };
    await requireOrgMembership(listing.organization_id);

    await exceptionRepo.create({
      listing_id: listingId,
      exception_type: data.exceptionType,
      severity: data.severity,
      title: data.title,
      description: data.description ?? null,
      resolution_status: 'open',
      resolved_by_user_id: null,
      resolved_at: null,
      metadata: {},
    });

    await listingReadinessService.computeListingReadiness(listingId);

    revalidatePath(`/listings/${listingId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create exception' };
  }
}
