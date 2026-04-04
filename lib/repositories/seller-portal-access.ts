import { supabase } from '@/lib/db/client';
import type { SellerPortalAccess } from '@/types';

const TABLE = 'seller_portal_access';

export async function findById(id: string): Promise<SellerPortalAccess | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByAccessToken(token: string): Promise<SellerPortalAccess | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('access_token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByListingId(listingId: string): Promise<SellerPortalAccess[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<SellerPortalAccess, 'id' | 'created_at' | 'updated_at'>,
): Promise<SellerPortalAccess> {
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
  input: Partial<Omit<SellerPortalAccess, 'id' | 'created_at' | 'updated_at'>>,
): Promise<SellerPortalAccess> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function revoke(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
