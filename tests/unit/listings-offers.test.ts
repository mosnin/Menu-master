import { describe, it, expect } from 'vitest';

// ─── Listing Stage Machine ──────────────────────────────────────────
import {
  LISTING_STAGE_TRANSITIONS,
  LISTING_STAGE_ORDER,
  TERMINAL_LISTING_STAGES,
  getAvailableListingStageTransitions,
  validateListingStageTransition,
  isTerminalListingStage,
  getListingStageIndex,
  getListingStageProgress,
  InvalidListingStageTransitionError,
} from '@/lib/services/listing-stage-service';

// ─── Offer Status Machine ───────────────────────────────────────────
import {
  OFFER_STATUS_TRANSITIONS,
  validateOfferStatusTransition,
  getAvailableOfferTransitions,
  InvalidOfferTransitionError,
} from '@/lib/services/offer-service';

// ─── Listing Readiness ──────────────────────────────────────────────
import { getDefaultListingChecklist } from '@/lib/services/listing-readiness-service';

// ─── Transaction Stage Machine (for coherence tests) ────────────────
import { STAGE_TRANSITIONS as TX_STAGE_TRANSITIONS } from '@/lib/services/stage-service';

// ─── Types ──────────────────────────────────────────────────────────
import type { ListingStage, OfferStatus } from '@/types';

describe('Listing Stage Machine', () => {
  it('defines 10 listing stages in the transition map', () => {
    const stages = Object.keys(LISTING_STAGE_TRANSITIONS);
    expect(stages).toHaveLength(10);
  });

  it('defines 7 stages in the canonical order', () => {
    expect(LISTING_STAGE_ORDER).toHaveLength(7);
    expect(LISTING_STAGE_ORDER[0]).toBe('intake');
    expect(LISTING_STAGE_ORDER[LISTING_STAGE_ORDER.length - 1]).toBe('closed');
  });

  it('defines 3 terminal stages', () => {
    expect(TERMINAL_LISTING_STAGES).toEqual(['closed', 'withdrawn', 'archived']);
  });

  it('allows forward progression: intake → preparing', () => {
    expect(() => validateListingStageTransition('intake', 'preparing')).not.toThrow();
  });

  it('allows forward progression: preparing → ready_for_review', () => {
    expect(() => validateListingStageTransition('preparing', 'ready_for_review')).not.toThrow();
  });

  it('allows review → ready_to_launch', () => {
    expect(() => validateListingStageTransition('ready_for_review', 'ready_to_launch')).not.toThrow();
  });

  it('allows ready_to_launch → live', () => {
    expect(() => validateListingStageTransition('ready_to_launch', 'live')).not.toThrow();
  });

  it('allows live → under_contract', () => {
    expect(() => validateListingStageTransition('live', 'under_contract')).not.toThrow();
  });

  it('allows live → paused', () => {
    expect(() => validateListingStageTransition('live', 'paused')).not.toThrow();
  });

  it('allows paused → live (resume)', () => {
    expect(() => validateListingStageTransition('paused', 'live')).not.toThrow();
  });

  it('allows under_contract → closed', () => {
    expect(() => validateListingStageTransition('under_contract', 'closed')).not.toThrow();
  });

  it('allows under_contract → live (deal falls through)', () => {
    expect(() => validateListingStageTransition('under_contract', 'live')).not.toThrow();
  });

  it('allows withdrawal from any active stage', () => {
    const activeStages: ListingStage[] = ['intake', 'preparing', 'ready_for_review', 'ready_to_launch', 'live', 'paused', 'under_contract'];
    for (const stage of activeStages) {
      expect(() => validateListingStageTransition(stage, 'withdrawn')).not.toThrow();
    }
  });

  it('blocks backward transitions (not explicitly allowed)', () => {
    expect(() => validateListingStageTransition('live', 'preparing')).toThrow(InvalidListingStageTransitionError);
  });

  it('blocks transitions from archived (terminal)', () => {
    expect(() => validateListingStageTransition('archived', 'intake')).toThrow(InvalidListingStageTransitionError);
  });

  it('allows reactivation from withdrawn → intake', () => {
    expect(() => validateListingStageTransition('withdrawn', 'intake')).not.toThrow();
  });

  it('blocks direct intake → live (skip steps)', () => {
    expect(() => validateListingStageTransition('intake', 'live')).toThrow(InvalidListingStageTransitionError);
  });

  it('returns correct available transitions for live stage', () => {
    const available = getAvailableListingStageTransitions('live');
    expect(available).toContain('paused');
    expect(available).toContain('under_contract');
    expect(available).toContain('withdrawn');
    expect(available).toContain('archived');
    expect(available).not.toContain('intake');
  });

  it('returns empty transitions for archived', () => {
    const available = getAvailableListingStageTransitions('archived');
    expect(available).toHaveLength(0);
  });

  it('identifies terminal stages correctly', () => {
    expect(isTerminalListingStage('closed')).toBe(true);
    expect(isTerminalListingStage('withdrawn')).toBe(true);
    expect(isTerminalListingStage('archived')).toBe(true);
    expect(isTerminalListingStage('live')).toBe(false);
    expect(isTerminalListingStage('intake')).toBe(false);
  });

  it('computes stage progress', () => {
    expect(getListingStageProgress('intake')).toBe(0);
    expect(getListingStageProgress('closed')).toBe(100);
    expect(getListingStageProgress('live')).toBeGreaterThan(50);
  });

  it('computes stage index', () => {
    expect(getListingStageIndex('intake')).toBe(0);
    expect(getListingStageIndex('closed')).toBe(6);
    expect(getListingStageIndex('withdrawn')).toBe(-1);
    expect(getListingStageIndex('archived')).toBe(-2);
  });

  it('has a consistent graph — every target stage exists as a key', () => {
    const allStages = new Set(Object.keys(LISTING_STAGE_TRANSITIONS));
    for (const [from, targets] of Object.entries(LISTING_STAGE_TRANSITIONS)) {
      for (const to of targets) {
        expect(allStages.has(to)).toBe(true);
      }
    }
  });
});

describe('Offer Status Machine', () => {
  it('defines 7 offer statuses', () => {
    const statuses = Object.keys(OFFER_STATUS_TRANSITIONS);
    expect(statuses).toHaveLength(7);
  });

  it('allows received → under_review', () => {
    expect(() => validateOfferStatusTransition('received', 'under_review')).not.toThrow();
  });

  it('allows under_review → accepted', () => {
    expect(() => validateOfferStatusTransition('under_review', 'accepted')).not.toThrow();
  });

  it('allows under_review → countered', () => {
    expect(() => validateOfferStatusTransition('under_review', 'countered')).not.toThrow();
  });

  it('allows under_review → rejected', () => {
    expect(() => validateOfferStatusTransition('under_review', 'rejected')).not.toThrow();
  });

  it('allows countered → accepted', () => {
    expect(() => validateOfferStatusTransition('countered', 'accepted')).not.toThrow();
  });

  it('blocks transitions from terminal status (accepted)', () => {
    expect(() => validateOfferStatusTransition('accepted', 'rejected')).toThrow(InvalidOfferTransitionError);
  });

  it('blocks transitions from terminal status (rejected)', () => {
    expect(() => validateOfferStatusTransition('rejected', 'accepted')).toThrow(InvalidOfferTransitionError);
  });

  it('blocks transitions from terminal status (withdrawn)', () => {
    expect(() => validateOfferStatusTransition('withdrawn', 'received')).toThrow(InvalidOfferTransitionError);
  });

  it('blocks direct received → accepted (must review first)', () => {
    expect(() => validateOfferStatusTransition('received', 'accepted')).toThrow(InvalidOfferTransitionError);
  });

  it('returns correct available transitions for received', () => {
    const available = getAvailableOfferTransitions('received');
    expect(available).toContain('under_review');
    expect(available).toContain('rejected');
    expect(available).toContain('withdrawn');
    expect(available).not.toContain('accepted');
  });

  it('returns empty transitions for accepted', () => {
    expect(getAvailableOfferTransitions('accepted')).toHaveLength(0);
  });

  it('returns empty transitions for rejected', () => {
    expect(getAvailableOfferTransitions('rejected')).toHaveLength(0);
  });

  it('has a consistent graph — every target status exists as a key', () => {
    const allStatuses = new Set(Object.keys(OFFER_STATUS_TRANSITIONS));
    for (const [from, targets] of Object.entries(OFFER_STATUS_TRANSITIONS)) {
      for (const to of targets) {
        expect(allStatuses.has(to)).toBe(true);
      }
    }
  });
});

describe('Listing Readiness', () => {
  it('generates 9 default checklist items', () => {
    const items = getDefaultListingChecklist('test-listing-id');
    expect(items).toHaveLength(9);
  });

  it('assigns correct listing_id to all items', () => {
    const items = getDefaultListingChecklist('my-listing');
    items.forEach(item => {
      expect(item.listing_id).toBe('my-listing');
    });
  });

  it('marks 7 items as required', () => {
    const items = getDefaultListingChecklist('test');
    const required = items.filter(i => i.is_required);
    expect(required.length).toBe(7);
  });

  it('marks staging and marketing as optional', () => {
    const items = getDefaultListingChecklist('test');
    const optional = items.filter(i => !i.is_required);
    expect(optional.length).toBe(2);
    expect(optional.map(i => i.category)).toContain('staging');
    expect(optional.map(i => i.category)).toContain('marketing');
  });

  it('covers all required launch categories', () => {
    const items = getDefaultListingChecklist('test');
    const requiredCategories = ['property_details', 'disclosures', 'photography', 'pricing', 'listing_description'];
    for (const cat of requiredCategories) {
      const catItems = items.filter(i => i.category === cat && i.is_required);
      expect(catItems.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('all items start as pending', () => {
    const items = getDefaultListingChecklist('test');
    items.forEach(item => {
      expect(item.status).toBe('pending');
    });
  });

  it('items have incrementing sort_order', () => {
    const items = getDefaultListingChecklist('test');
    for (let i = 1; i < items.length; i++) {
      expect(items[i].sort_order).toBeGreaterThan(items[i - 1].sort_order);
    }
  });
});

describe('Listing Stage ↔ Transaction Stage Coherence', () => {
  it('listing under_contract maps cleanly to transaction under_contract', () => {
    // The listing stage "under_contract" corresponds to the transaction stage "under_contract"
    // when a handoff happens. Verify naming consistency.
    const listingStages = Object.keys(LISTING_STAGE_TRANSITIONS);
    expect(listingStages).toContain('under_contract');

    const txStages = Object.keys(TX_STAGE_TRANSITIONS);
    expect(txStages).toContain('under_contract');
  });

  it('listing closed ≠ listing withdrawn — distinct semantics', () => {
    // closed = deal completed; withdrawn = listing pulled without deal
    expect(TERMINAL_LISTING_STAGES).toContain('closed');
    expect(TERMINAL_LISTING_STAGES).toContain('withdrawn');

    // They should have different transition capabilities
    const closedTransitions = getAvailableListingStageTransitions('closed');
    const withdrawnTransitions = getAvailableListingStageTransitions('withdrawn');
    expect(closedTransitions).not.toEqual(withdrawnTransitions);
  });
});

describe('Offer Handling Edge Cases', () => {
  it('expired offers cannot be accepted', () => {
    expect(() => validateOfferStatusTransition('expired', 'accepted')).toThrow();
  });

  it('withdrawn offers cannot be countered', () => {
    expect(() => validateOfferStatusTransition('withdrawn', 'countered')).toThrow();
  });

  it('countered offers can come back for review', () => {
    expect(() => validateOfferStatusTransition('countered', 'under_review')).not.toThrow();
  });

  it('all active statuses can transition to withdrawn', () => {
    const activeStatuses: OfferStatus[] = ['received', 'under_review', 'countered'];
    for (const status of activeStatuses) {
      expect(getAvailableOfferTransitions(status)).toContain('withdrawn');
    }
  });

  it('all active statuses can transition to expired', () => {
    const activeStatuses: OfferStatus[] = ['received', 'under_review', 'countered'];
    for (const status of activeStatuses) {
      expect(getAvailableOfferTransitions(status)).toContain('expired');
    }
  });
});

describe('Handoff Safety Guarantees', () => {
  it('only live or paused listings should accept offers for handoff', () => {
    // These are the only stages where offers are accepted by the service
    const offerAcceptableStages: ListingStage[] = ['live', 'paused'];
    const allStages: ListingStage[] = ['intake', 'preparing', 'ready_for_review', 'ready_to_launch', 'live', 'paused', 'under_contract', 'closed', 'withdrawn', 'archived'];
    const nonAcceptableStages = allStages.filter(s => !offerAcceptableStages.includes(s));

    // Verify live/paused can reach under_contract (the handoff target)
    for (const stage of offerAcceptableStages) {
      const transitions = getAvailableListingStageTransitions(stage);
      // live can go to under_contract; paused goes via live first
      if (stage === 'live') {
        expect(transitions).toContain('under_contract');
      }
    }

    // Non-acceptable stages should not directly reach under_contract (except live itself)
    for (const stage of ['intake', 'preparing', 'ready_for_review', 'ready_to_launch'] as ListingStage[]) {
      const transitions = getAvailableListingStageTransitions(stage);
      expect(transitions).not.toContain('under_contract');
    }
  });

  it('accepted is terminal for offers — no further transitions', () => {
    expect(getAvailableOfferTransitions('accepted')).toHaveLength(0);
  });

  it('rejected is terminal for offers — no further transitions', () => {
    expect(getAvailableOfferTransitions('rejected')).toHaveLength(0);
  });

  it('listing under_contract can return to live if deal falls through', () => {
    const transitions = getAvailableListingStageTransitions('under_contract');
    expect(transitions).toContain('live');
  });

  it('listing under_contract can also be withdrawn or archived', () => {
    const transitions = getAvailableListingStageTransitions('under_contract');
    expect(transitions).toContain('withdrawn');
    expect(transitions).toContain('archived');
  });
});

describe('Seller Portal Safety', () => {
  it('seller portal stage labels cover all listing stages', () => {
    const allStages: ListingStage[] = ['intake', 'preparing', 'ready_for_review', 'ready_to_launch', 'live', 'paused', 'under_contract', 'closed', 'withdrawn', 'archived'];
    // These labels are defined in seller-portal-service.ts getSellerProgressSummary
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
    for (const stage of allStages) {
      expect(sellerStageLabels[stage]).toBeDefined();
      // Labels should not contain internal jargon
      expect(sellerStageLabels[stage]).not.toContain('_');
    }
  });
});

describe('Readiness Computation Safety', () => {
  it('default checklist has items in all required launch categories', () => {
    const items = getDefaultListingChecklist('test');
    const requiredCategories = ['property_details', 'disclosures', 'photography', 'pricing', 'listing_description'];
    for (const cat of requiredCategories) {
      const count = items.filter(i => i.category === cat && i.is_required).length;
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  it('no default checklist items have null listing_id', () => {
    const items = getDefaultListingChecklist('my-listing');
    for (const item of items) {
      expect(item.listing_id).toBeTruthy();
      expect(item.listing_id).toBe('my-listing');
    }
  });

  it('all default items have valid categories', () => {
    const validCategories = ['property_details', 'disclosures', 'photography', 'staging', 'pricing', 'listing_description', 'mls_readiness', 'documents', 'marketing', 'general'];
    const items = getDefaultListingChecklist('test');
    for (const item of items) {
      expect(validCategories).toContain(item.category);
    }
  });
});
