import { supabase } from '@/lib/db/client';
import type { ListingException } from '@/types';

const TABLE = 'listing_exceptions';

export async function findByListingId(listingId: string): Promise<ListingException[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findOpenByListingId(listingId: string): Promise<ListingException[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('listing_id', listingId)
    .neq('resolution_status', 'resolved')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<ListingException, 'id' | 'created_at' | 'updated_at'>,
): Promise<ListingException> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function update(
  id: string,
  input: Partial<Omit<ListingException, 'id' | 'created_at' | 'updated_at'>>,
): Promise<ListingException> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
