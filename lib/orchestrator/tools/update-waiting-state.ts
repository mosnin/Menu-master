import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import * as memoryRepo from '@/lib/repositories/orchestrator-memory';

const contract: ToolContract = {
  name: 'update_waiting_state',
  description: 'Update the deal waiting state with details about what is being waited on and from whom.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: true,
  params_schema: {
    waiting_for: { type: 'string', required: true, description: 'What we are waiting for' },
    waiting_on: { type: 'string', required: false, description: 'Who we are waiting on (party name or role)' },
    expected_by: { type: 'string', required: false, description: 'Expected resolution date ISO' },
  },
  side_effects: ['Updates orchestrator memory with waiting state'],
};

const execute: ToolExecutor = async (params, context) => {
  const waitingFor = params.waiting_for as string;
  const waitingOn = (params.waiting_on as string) ?? null;
  const expectedBy = (params.expected_by as string) ?? null;

  // Resolve any existing unresolved waiting-state entries to avoid duplicates
  const existing = await memoryRepo.findByType(context.orchestratorId, 'pending_decision');
  const waitingEntries = existing.filter(
    e => !e.resolved && e.details?.sub_type === 'waiting_state',
  );

  for (const entry of waitingEntries) {
    await memoryRepo.resolve(entry.id);
  }

  // Create a new waiting-state entry
  const summary = waitingOn
    ? `Waiting on ${waitingOn}: ${waitingFor}`
    : `Waiting for: ${waitingFor}`;

  const entry = await memoryRepo.create({
    orchestrator_id: context.orchestratorId,
    memory_type: 'pending_decision',
    summary,
    details: {
      sub_type: 'waiting_state',
      waiting_for: waitingFor,
      waiting_on: waitingOn,
      expected_by: expectedBy,
      since: new Date().toISOString(),
      entity_type: context.entityType,
      entity_id: context.entityId,
    },
    resolved: false,
    resolved_at: null,
    expires_at: expectedBy,
  });

  return {
    success: true,
    result: {
      memory_entry_id: entry.id,
      waiting_for: waitingFor,
      waiting_on: waitingOn,
      expected_by: expectedBy,
      previous_entries_resolved: waitingEntries.length,
    },
    side_effects: [
      {
        type: 'waiting_state_updated',
        description: summary,
        target_id: entry.id,
      },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
