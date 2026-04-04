import { supabase } from '@/lib/db/client';
import type { Offer, OfferStatus } from '@/types';

const TABLE = 'offers';

export async function findById(id: string): Promise<Offer | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByListingId(
  listingId: string,
  options?: { status?: OfferStatus },
): Promise<Offer[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('listing_id', listingId)
    .order('offer_amount', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function findByOrgId(
  orgId: string,
  options?: { status?: OfferStatus; limit?: number },
): Promise<Offer[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<Offer, 'id' | 'created_at' | 'updated_at'>,
): Promise<Offer> {
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
  input: Partial<Omit<Offer, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Offer> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function countByListingId(listingId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId);

  if (error) throw error;
  return count ?? 0;
}

export async function findAcceptedByListingId(listingId: string): Promise<Offer | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('listing_id', listingId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (error) throw error;
  return data;
}
