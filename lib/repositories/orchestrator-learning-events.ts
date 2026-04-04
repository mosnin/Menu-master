import { supabase } from '@/lib/db/client';
import type { OrchestratorLearningEvent, LearningEventType } from '@/types';

const TABLE = 'orchestrator_learning_events';

export async function create(
  input: Omit<OrchestratorLearningEvent, 'id' | 'created_at' | 'influenced_entity' | 'influenced_entity_id'> & {
    influenced_entity?: string | null;
    influenced_entity_id?: string | null;
  },
): Promise<OrchestratorLearningEvent> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findByOrg(
  orgId: string,
  limit = 50,
): Promise<OrchestratorLearningEvent[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findByType(
  orgId: string,
  eventType: LearningEventType,
  limit = 50,
): Promise<OrchestratorLearningEvent[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('event_type', eventType)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findByOrchestrator(
  orchestratorId: string,
  limit = 50,
): Promise<OrchestratorLearningEvent[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
