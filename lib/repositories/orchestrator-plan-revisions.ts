import { supabase } from '@/lib/db/client';
import type { PlanRevision } from '@/types';

const TABLE = 'orchestrator_plan_revisions';

export async function create(
  input: Omit<PlanRevision, 'id' | 'created_at'>,
): Promise<PlanRevision> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findByPlan(
  planId: string,
): Promise<PlanRevision[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('plan_id', planId)
    .order('revision_number', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
