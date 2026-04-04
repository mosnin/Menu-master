import { supabase } from '@/lib/db/client';
import type { ListingHandoffEvent } from '@/types';

const TABLE = 'listing_handoff_events';

export async function findByListingId(listingId: string): Promise<ListingHandoffEvent | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('listing_id', listingId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByTransactionId(transactionId: string): Promise<ListingHandoffEvent | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<ListingHandoffEvent, 'id' | 'created_at'>,
): Promise<ListingHandoffEvent> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
