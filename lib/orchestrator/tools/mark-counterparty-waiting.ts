import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import * as memoryRepo from '@/lib/repositories/orchestrator-memory';

const contract: ToolContract = {
  name: 'mark_counterparty_waiting',
  description: 'Record that we are waiting on a counterparty for a response or action.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: true,
  params_schema: {
    counterparty: { type: 'string', required: true, description: 'Name or role of the counterparty we are waiting on' },
    waiting_for: { type: 'string', required: true, description: 'What we are waiting for' },
    since: { type: 'string', required: false, description: 'ISO datetime when the wait started' },
  },
  side_effects: ['Creates orchestrator_memory_entry record'],
};

const execute: ToolExecutor = async (params, context) => {
  const counterparty = params.counterparty as string;
  const waitingFor = params.waiting_for as string;

  const entry = await memoryRepo.create({
    orchestrator_id: context.orchestratorId,
    memory_type: 'counterparty_signal',
    summary: `Waiting on ${counterparty}: ${waitingFor}`,
    details: {
      counterparty,
      waiting_for: waitingFor,
      since: params.since ?? new Date().toISOString(),
      entity_type: context.entityType,
      entity_id: context.entityId,
    },
    resolved: false,
    resolved_at: null,
    expires_at: null,
  });

  return {
    success: true,
    result: { memory_entry_id: entry.id, counterparty, waiting_for: waitingFor },
    side_effects: [
      { type: 'memory_recorded', description: `Counterparty signal recorded: waiting on ${counterparty}`, target_id: entry.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
