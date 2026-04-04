import * as listingRepo from '@/lib/repositories/listings';
import * as checklistRepo from '@/lib/repositories/listing-checklist-items';
import * as exceptionRepo from '@/lib/repositories/listing-exceptions';
import * as sellerDocRequestRepo from '@/lib/repositories/seller-document-requests';
import type { Listing, ReadinessState, ListingChecklistItem, ListingException } from '@/types';

export interface ListingReadinessResult {
  score: number;
  state: ReadinessState;
  totalChecklist: number;
  completedChecklist: number;
  requiredChecklist: number;
  completedRequired: number;
  blockedItems: number;
  openExceptions: number;
  criticalExceptions: number;
  pendingSellerDocs: number;
  blockers: string[];
}

// Required categories for launch readiness
const LAUNCH_REQUIRED_CATEGORIES = [
  'property_details',
  'disclosures',
  'photography',
  'pricing',
  'listing_description',
];

export async function computeListingReadiness(listingId: string): Promise<ListingReadinessResult> {
  const [checklist, exceptions, pendingDocs] = await Promise.all([
    checklistRepo.findByListingId(listingId),
    exceptionRepo.findOpenByListingId(listingId),
    sellerDocRequestRepo.countPendingByListingId(listingId),
  ]);

  const totalChecklist = checklist.length;
  const completedChecklist = checklist.filter(i => i.status === 'completed').length;
  const requiredItems = checklist.filter(i => i.is_required);
  const completedRequired = requiredItems.filter(i => i.status === 'completed').length;
  const blockedItems = checklist.filter(i => i.status === 'blocked').length;
  const criticalExceptions = exceptions.filter(e => e.severity === 'critical').length;

  // Compute blockers
  const blockers: string[] = [];

  // Check required categories
  for (const cat of LAUNCH_REQUIRED_CATEGORIES) {
    const catItems = requiredItems.filter(i => i.category === cat);
    const catComplete = catItems.filter(i => i.status === 'completed').length;
    if (catItems.length > 0 && catComplete < catItems.length) {
      blockers.push(`Incomplete ${cat.replace(/_/g, ' ')} items`);
    }
  }

  if (blockedItems > 0) {
    blockers.push(`${blockedItems} blocked checklist item(s)`);
  }
  if (criticalExceptions > 0) {
    blockers.push(`${criticalExceptions} critical exception(s)`);
  }
  if (pendingDocs > 0) {
    blockers.push(`${pendingDocs} pending seller document(s)`);
  }

  // Score: weighted across checklist completion, exceptions, and seller docs
  const checklistWeight = 0.6;
  const exceptionWeight = 0.25;
  const sellerDocWeight = 0.15;

  const checklistScore = requiredItems.length > 0
    ? (completedRequired / requiredItems.length) * 100
    : (totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 100);
  const exceptionScore = criticalExceptions > 0 ? 0 : (exceptions.length > 0 ? 50 : 100);
  const sellerDocScore = pendingDocs > 0 ? Math.max(0, 100 - pendingDocs * 25) : 100;

  const score = Math.round(
    checklistScore * checklistWeight +
    exceptionScore * exceptionWeight +
    sellerDocScore * sellerDocWeight,
  );

  const state: ReadinessState =
    score >= 90 ? 'ready' :
    score >= 70 ? 'nearly_ready' :
    score >= 40 ? 'needs_attention' :
    'not_ready';

  // Persist readiness to listing
  await listingRepo.update(listingId, {
    readiness_score: score,
    readiness_state: state,
  } as any);

  return {
    score,
    state,
    totalChecklist,
    completedChecklist,
    requiredChecklist: requiredItems.length,
    completedRequired,
    blockedItems,
    openExceptions: exceptions.length,
    criticalExceptions,
    pendingSellerDocs: pendingDocs,
    blockers,
  };
}

// Default listing prep checklist template
export function getDefaultListingChecklist(listingId: string): Omit<ListingChecklistItem, 'id' | 'created_at' | 'updated_at'>[] {
  return [
    { listing_id: listingId, title: 'Review property details and features', category: 'property_details', status: 'pending', description: 'Confirm square footage, rooms, lot size, and features', assigned_to_user_id: null, due_date: null, completed_at: null, completed_by_user_id: null, sort_order: 1, is_required: true, blocker_reason: null },
    { listing_id: listingId, title: 'Gather seller disclosures', category: 'disclosures', status: 'pending', description: 'Collect all required property disclosures from seller', assigned_to_user_id: null, due_date: null, completed_at: null, completed_by_user_id: null, sort_order: 2, is_required: true, blocker_reason: null },
    { listing_id: listingId, title: 'Schedule professional photography', category: 'photography', status: 'pending', description: 'Book photographer for listing photos and virtual tour', assigned_to_user_id: null, due_date: null, completed_at: null, completed_by_user_id: null, sort_order: 3, is_required: true, blocker_reason: null },
    { listing_id: listingId, title: 'Coordinate staging', category: 'staging', status: 'pending', description: 'Arrange staging consultation and setup', assigned_to_user_id: null, due_date: null, completed_at: null, completed_by_user_id: null, sort_order: 4, is_required: false, blocker_reason: null },
    { listing_id: listingId, title: 'Complete pricing analysis', category: 'pricing', status: 'pending', description: 'Run CMA and finalize list price with seller', assigned_to_user_id: null, due_date: null, completed_at: null, completed_by_user_id: null, sort_order: 5, is_required: true, blocker_reason: null },
    { listing_id: listingId, title: 'Write listing description', category: 'listing_description', status: 'pending', description: 'Draft and review MLS listing description', assigned_to_user_id: null, due_date: null, completed_at: null, completed_by_user_id: null, sort_order: 6, is_required: true, blocker_reason: null },
    { listing_id: listingId, title: 'Verify MLS readiness', category: 'mls_readiness', status: 'pending', description: 'Confirm all MLS required fields and data entry', assigned_to_user_id: null, due_date: null, completed_at: null, completed_by_user_id: null, sort_order: 7, is_required: true, blocker_reason: null },
    { listing_id: listingId, title: 'Collect listing documents', category: 'documents', status: 'pending', description: 'Gather listing agreement, agency disclosures, and supplements', assigned_to_user_id: null, due_date: null, completed_at: null, completed_by_user_id: null, sort_order: 8, is_required: true, blocker_reason: null },
    { listing_id: listingId, title: 'Prepare marketing materials', category: 'marketing', status: 'pending', description: 'Create flyers, social media posts, and email campaigns', assigned_to_user_id: null, due_date: null, completed_at: null, completed_by_user_id: null, sort_order: 9, is_required: false, blocker_reason: null },
  ];
}
