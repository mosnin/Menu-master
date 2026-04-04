import { supabase } from '@/lib/db/client';
import type { ListingChecklistItem } from '@/types';

const TABLE = 'listing_checklist_items';

export async function findByListingId(listingId: string): Promise<ListingChecklistItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findById(id: string): Promise<ListingChecklistItem | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<ListingChecklistItem, 'id' | 'created_at' | 'updated_at'>,
): Promise<ListingChecklistItem> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function createMany(
  items: Omit<ListingChecklistItem, 'id' | 'created_at' | 'updated_at'>[],
): Promise<ListingChecklistItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(items)
    .select('*');

  if (error) throw error;
  return data ?? [];
}

export async function update(
  id: string,
  input: Partial<Omit<ListingChecklistItem, 'id' | 'created_at' | 'updated_at'>>,
): Promise<ListingChecklistItem> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function countByListingAndStatus(
  listingId: string,
  status: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('status', status);

  if (error) throw error;
  return count ?? 0;
}
