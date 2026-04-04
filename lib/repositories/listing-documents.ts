import { supabase } from '@/lib/db/client';
import type { ListingDocument } from '@/types';

const TABLE = 'listing_documents';

export async function findByListingId(listingId: string): Promise<ListingDocument[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<ListingDocument, 'id' | 'created_at'>,
): Promise<ListingDocument> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findByDocumentId(documentId: string): Promise<ListingDocument | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
