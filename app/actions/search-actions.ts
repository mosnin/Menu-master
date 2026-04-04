'use server';

import { requireAuth, getCurrentUserProfile } from '@/lib/auth/session';
import * as searchService from '@/lib/services/search-service';
import * as membershipRepo from '@/lib/repositories/memberships';

export async function globalSearchAction(
  query: string,
  entityTypes?: string[],
): Promise<{ data?: searchService.SearchResult[]; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const orgId = memberships[0].organization_id;
    const results = await searchService.globalSearch(orgId, query, { entityTypes });

    return { data: results };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Search failed' };
  }
}

export async function saveRecentSearchAction(
  query: string,
  resultEntityType?: string,
  resultEntityId?: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const orgId = memberships[0].organization_id;
    await searchService.saveRecentSearch(profile.id, orgId, query, resultEntityType, resultEntityId);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to save search' };
  }
}

export async function getRecentSearchesAction() {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const searches = await searchService.getRecentSearches(profile.id);
    return { data: searches };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get recent searches' };
  }
}

export async function clearRecentSearchesAction(): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await searchService.clearRecentSearches(profile.id);
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to clear searches' };
  }
}
