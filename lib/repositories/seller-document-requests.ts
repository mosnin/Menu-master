import { supabase } from '@/lib/db/client';
import type { SellerDocumentRequest } from '@/types';

const TABLE = 'seller_document_requests';

export async function findByListingId(listingId: string): Promise<SellerDocumentRequest[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findById(id: string): Promise<SellerDocumentRequest | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<SellerDocumentRequest, 'id' | 'created_at' | 'updated_at'>,
): Promise<SellerDocumentRequest> {
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
  input: Partial<Omit<SellerDocumentRequest, 'id' | 'created_at' | 'updated_at'>>,
): Promise<SellerDocumentRequest> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function countPendingByListingId(listingId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('status', 'pending');

  if (error) throw error;
  return count ?? 0;
}
