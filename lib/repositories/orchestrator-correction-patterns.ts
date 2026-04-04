import { supabase } from '@/lib/db/client';
import type { OrchestratorCorrectionPattern, CorrectionCategory } from '@/types';

const TABLE = 'orchestrator_correction_patterns';

export async function findByOrg(
  orgId: string,
  activeOnly = true,
): Promise<OrchestratorCorrectionPattern[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('occurrence_count', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByCategory(
  orgId: string,
  category: CorrectionCategory,
): Promise<OrchestratorCorrectionPattern[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('correction_category', category)
    .order('occurrence_count', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function upsertPattern(
  input: Omit<OrchestratorCorrectionPattern, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrchestratorCorrectionPattern> {
  // Check for existing matching pattern
  const { data: existing, error: findError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', input.organization_id)
    .eq('correction_category', input.correction_category)
    .eq('correction_detail', input.correction_detail)
    .eq('entity_type', input.entity_type ?? '')
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        occurrence_count: existing.occurrence_count + 1,
        last_occurrence_at: new Date().toISOString(),
        suggested_action: input.suggested_action,
        confidence_adjustment: input.confidence_adjustment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deactivate(
  id: string,
): Promise<OrchestratorCorrectionPattern> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
