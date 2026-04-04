import { supabase } from '@/lib/db/client';
import type { ListingStageTransition } from '@/types';

const TABLE = 'listing_stage_transitions';

export async function findByListingId(listingId: string): Promise<ListingStageTransition[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<ListingStageTransition, 'id' | 'created_at'>,
): Promise<ListingStageTransition> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
