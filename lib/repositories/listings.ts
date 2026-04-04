import { supabase } from '@/lib/db/client';
import type { Listing, ListingStage } from '@/types';

const TABLE = 'listings';

export async function findById(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrgId(
  orgId: string,
  options?: { stage?: ListingStage; limit?: number; offset?: number },
): Promise<Listing[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (options?.stage) {
    query = query.eq('listing_stage', options.stage);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<Listing, 'id' | 'created_at' | 'updated_at'>,
): Promise<Listing> {
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
  input: Partial<Omit<Listing, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Listing> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function countByOrgId(orgId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if (error) throw error;
  return count ?? 0;
}

export async function findByPropertyId(propertyId: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
