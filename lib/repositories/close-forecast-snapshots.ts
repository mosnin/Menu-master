import { supabase } from '@/lib/db/client';
import type { CloseForecastSnapshot } from '@/types';

const TABLE = 'close_forecast_snapshots';

export async function findByOrgAndMonth(
  orgId: string,
  forecastMonth: string,
): Promise<CloseForecastSnapshot | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('forecast_month', forecastMonth)
    .order('snapshot_date', { ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<CloseForecastSnapshot, 'id'>,
): Promise<CloseForecastSnapshot> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function upsert(
  input: Omit<CloseForecastSnapshot, 'id'>,
): Promise<CloseForecastSnapshot> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(input, { onConflict: 'organization_id,forecast_month,snapshot_date' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
