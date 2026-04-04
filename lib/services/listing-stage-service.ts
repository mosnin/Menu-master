import * as listingRepo from '@/lib/repositories/listings';
import * as listingStageTransitionRepo from '@/lib/repositories/listing-stage-transitions';
import { logAction } from '@/lib/audit/logger';
import type { ListingStage, ListingStageTransition, StageTriggerType } from '@/types';

// Canonical listing stage order (non-terminal)
const LISTING_STAGE_ORDER: ListingStage[] = [
  'intake',
  'preparing',
  'ready_for_review',
  'ready_to_launch',
  'live',
  'under_contract',
  'closed',
];

const TERMINAL_LISTING_STAGES: ListingStage[] = ['closed', 'withdrawn', 'archived'];

// Allowed transitions
const LISTING_STAGE_TRANSITIONS: Record<ListingStage, ListingStage[]> = {
  intake: ['preparing', 'withdrawn', 'archived'],
  preparing: ['ready_for_review', 'withdrawn', 'archived'],
  ready_for_review: ['preparing', 'ready_to_launch', 'withdrawn', 'archived'],
  ready_to_launch: ['ready_for_review', 'live', 'withdrawn', 'archived'],
  live: ['paused', 'under_contract', 'withdrawn', 'archived'],
  paused: ['live', 'withdrawn', 'archived'],
  under_contract: ['live', 'closed', 'withdrawn', 'archived'], // can fall back to live if deal falls through
  closed: ['archived'],
  withdrawn: ['archived', 'intake'], // can reactivate
  archived: [],
};

export class InvalidListingStageTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition listing from "${from}" to "${to}"`);
    this.name = 'InvalidListingStageTransitionError';
  }
}

export function getAvailableListingStageTransitions(currentStage: ListingStage): ListingStage[] {
  return LISTING_STAGE_TRANSITIONS[currentStage] ?? [];
}

export function validateListingStageTransition(from: ListingStage, to: ListingStage): void {
  const allowed = LISTING_STAGE_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidListingStageTransitionError(from, to);
  }
}

export function isTerminalListingStage(stage: ListingStage): boolean {
  return TERMINAL_LISTING_STAGES.includes(stage);
}

export function getListingStageOrder(): ListingStage[] {
  return [...LISTING_STAGE_ORDER];
}

export function getListingStageIndex(stage: ListingStage): number {
  const idx = LISTING_STAGE_ORDER.indexOf(stage);
  if (idx === -1) {
    if (stage === 'paused') return 4; // same level as live
    if (stage === 'withdrawn') return -1;
    if (stage === 'archived') return -2;
  }
  return idx;
}

export function getListingStageProgress(stage: ListingStage): number {
  const idx = LISTING_STAGE_ORDER.indexOf(stage);
  if (idx === -1) return 0;
  return Math.round((idx / (LISTING_STAGE_ORDER.length - 1)) * 100);
}

export async function transitionListingStage(
  listingId: string,
  toStage: ListingStage,
  userId: string,
  options?: {
    triggerType?: StageTriggerType;
    reason?: string;
  },
): Promise<ListingStageTransition> {
  const listing = await listingRepo.findById(listingId);
  if (!listing) throw new Error('Listing not found');

  const fromStage = listing.listing_stage;
  validateListingStageTransition(fromStage, toStage);

  // Update listing stage
  await listingRepo.update(listingId, { listing_stage: toStage } as any);

  // Record the transition
  const transition = await listingStageTransitionRepo.create({
    listing_id: listingId,
    organization_id: listing.organization_id,
    from_stage: fromStage,
    to_stage: toStage,
    triggered_by_user_id: userId,
    trigger_type: options?.triggerType ?? 'manual',
    reason: options?.reason ?? null,
    metadata: {},
  });

  await logAction({
    organizationId: listing.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'listing.stage_changed',
    targetType: 'listing',
    targetId: listingId,
    metadata: { from_stage: fromStage, to_stage: toStage, reason: options?.reason },
  });

  return transition;
}

export async function getListingTransitionHistory(
  listingId: string,
): Promise<ListingStageTransition[]> {
  return listingStageTransitionRepo.findByListingId(listingId);
}

export {
  LISTING_STAGE_TRANSITIONS,
  LISTING_STAGE_ORDER,
  TERMINAL_LISTING_STAGES,
};
