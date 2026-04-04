import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { detectExceptions } from '@/lib/services/exception-service';

const contract: ToolContract = {
  name: 'recompute_exceptions',
  description: 'Run exception detection on a transaction to find overdue items, missing documents, and stale state.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: true,
  params_schema: {},
  side_effects: ['May create new transaction_exception records'],
};

const execute: ToolExecutor = async (_params, context) => {
  const exceptions = await detectExceptions(context.entityId);
  return {
    success: true,
    result: {
      exceptions_detected: exceptions.length,
      exceptions: exceptions.map(e => ({
        id: e.id,
        type: e.exception_type,
        severity: e.severity,
        title: e.title,
      })),
    },
    side_effects: exceptions.map(e => ({
      type: 'exception_created',
      description: `Exception detected: ${e.title} (${e.severity})`,
      target_id: e.id,
    })),
  };
};

export function register(): void {
  registerTool(contract, execute);
}
