import type { ActionRiskClass, UserRole } from '@/types';

export interface ToolContract {
  name: string;
  description: string;
  risk_class: ActionRiskClass;
  required_role: UserRole;
  idempotent: boolean;
  params_schema: Record<string, { type: string; required: boolean; description: string }>;
  side_effects: string[];
}

export interface ToolExecutionContext {
  orchestratorId: string;
  organizationId: string;
  entityType: 'transaction' | 'listing';
  entityId: string;
  actorUserId?: string;
}

export type ToolExecutor = (
  params: Record<string, unknown>,
  context: ToolExecutionContext,
) => Promise<{
  success: boolean;
  result: Record<string, unknown>;
  side_effects: { type: string; description: string; target_id?: string }[];
}>;

interface RegisteredTool {
  contract: ToolContract;
  execute: ToolExecutor;
}

const registry = new Map<string, RegisteredTool>();

export function registerTool(contract: ToolContract, execute: ToolExecutor): void {
  registry.set(contract.name, { contract, execute });
}

export function getTool(name: string): RegisteredTool | undefined {
  return registry.get(name);
}

export function getAllTools(): RegisteredTool[] {
  return Array.from(registry.values());
}

export function getToolContract(name: string): ToolContract | undefined {
  return registry.get(name)?.contract;
}

export function getToolsByRiskClass(riskClass: ActionRiskClass): RegisteredTool[] {
  return getAllTools().filter(t => t.contract.risk_class === riskClass);
}

export function isToolAllowed(name: string, userRole: UserRole): boolean {
  const tool = registry.get(name);
  if (!tool) return false;
  const hierarchy: Record<string, number> = { agent: 1, coordinator: 2, broker_admin: 3 };
  return (hierarchy[userRole] ?? 0) >= (hierarchy[tool.contract.required_role] ?? 999);
}
