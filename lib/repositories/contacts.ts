import { supabase } from '@/lib/db/client';
import type { Contact } from '@/types';

const TABLE = 'contacts';

export async function findById(id: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrgId(orgId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<Contact, 'id' | 'created_at' | 'updated_at'>,
): Promise<Contact> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findByEmail(
  orgId: string,
  email: string,
): Promise<Contact | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
}
