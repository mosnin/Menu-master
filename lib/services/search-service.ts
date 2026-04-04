import { supabase } from '@/lib/db/client';
import * as recentSearchRepo from '@/lib/repositories/recent-searches';
import { logAction } from '@/lib/audit/logger';

export interface SearchResult {
  entity_type: 'transaction' | 'contact' | 'document';
  entity_id: string;
  title: string;
  subtitle: string | null;
  url: string;
  rank: number;
}

export async function globalSearch(
  orgId: string,
  query: string,
  options?: { limit?: number; entityTypes?: string[] },
): Promise<SearchResult[]> {
  const limit = options?.limit ?? 20;
  const results: SearchResult[] = [];
  const tsQuery = query.split(/\s+/).filter(Boolean).join(' & ');

  if (!tsQuery) return [];

  const shouldSearch = (type: string) =>
    !options?.entityTypes || options.entityTypes.includes(type);

  // Search transactions
  if (shouldSearch('transaction')) {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, title, status, stage')
      .eq('organization_id', orgId)
      .or(`title.ilike.%${query}%`)
      .limit(limit);

    if (transactions) {
      for (const t of transactions) {
        results.push({
          entity_type: 'transaction',
          entity_id: t.id,
          title: t.title,
          subtitle: `${t.status} · ${t.stage ?? 'intake'}`,
          url: `/transactions/${t.id}`,
          rank: t.title.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 2,
        });
      }
    }
  }

  // Search contacts
  if (shouldSearch('contact')) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name, email, contact_type')
      .eq('organization_id', orgId)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (contacts) {
      for (const c of contacts) {
        results.push({
          entity_type: 'contact',
          entity_id: c.id,
          title: c.full_name,
          subtitle: c.email ?? c.contact_type,
          url: '#', // Contacts don't have a dedicated page yet
          rank: c.full_name.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 2,
        });
      }
    }
  }

  // Search documents
  if (shouldSearch('document')) {
    const { data: documents } = await supabase
      .from('documents')
      .select('id, file_name, document_type, transaction_id')
      .eq('organization_id', orgId)
      .or(`file_name.ilike.%${query}%`)
      .limit(limit);

    if (documents) {
      for (const d of documents) {
        results.push({
          entity_type: 'document',
          entity_id: d.id,
          title: d.file_name,
          subtitle: d.document_type ?? 'Document',
          url: `/transactions/${d.transaction_id}/documents`,
          rank: d.file_name.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 2,
        });
      }
    }
  }

  // Sort by rank then title
  results.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));

  return results.slice(0, limit);
}

export async function saveRecentSearch(
  userId: string,
  orgId: string,
  query: string,
  resultEntityType?: string,
  resultEntityId?: string,
): Promise<void> {
  await recentSearchRepo.create({
    user_id: userId,
    organization_id: orgId,
    query,
    result_entity_type: resultEntityType ?? null,
    result_entity_id: resultEntityId ?? null,
  });

  await logAction({
    organizationId: orgId,
    actorType: 'user',
    actorUserId: userId,
    action: 'search.executed',
    targetType: 'search',
    metadata: { query },
  });
}

export async function getRecentSearches(
  userId: string,
  limit = 10,
) {
  return recentSearchRepo.findByUserId(userId, limit);
}

export async function clearRecentSearches(userId: string): Promise<void> {
  await recentSearchRepo.clearByUserId(userId);
}
