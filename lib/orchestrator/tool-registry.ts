import type { ActionRiskClass, UserRole } from '@/types';

const VALID_RISK_CLASSES: readonly ActionRiskClass[] = ['safe', 'medium_risk', 'high_risk'] as const;
const VALID_ROLES: readonly UserRole[] = ['agent', 'coordinator', 'broker_admin'] as const;

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

/**
 * Validate a tool contract before registration.
 * Throws if the contract is invalid.
 */
function validateContract(contract: ToolContract): void {
  if (!contract.name || typeof contract.name !== 'string') {
    throw new Error('Tool contract validation failed: name must be a non-empty string');
  }
  if (!VALID_RISK_CLASSES.includes(contract.risk_class)) {
    throw new Error(
      `Tool contract validation failed: risk_class must be one of ${VALID_RISK_CLASSES.join(', ')} (got '${contract.risk_class}')`,
    );
  }
  if (!VALID_ROLES.includes(contract.required_role)) {
    throw new Error(
      `Tool contract validation failed: required_role must be one of ${VALID_ROLES.join(', ')} (got '${contract.required_role}')`,
    );
  }
}

export function registerTool(contract: ToolContract, execute: ToolExecutor): void {
  validateContract(contract);

  if (registry.has(contract.name)) {
    throw new Error(`Duplicate tool registration: tool '${contract.name}' is already registered`);
  }

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

/**
 * Validate params against a tool's params_schema.
 * Returns an array of error strings (empty if all valid).
 */
export function validateParams(toolName: string, params: Record<string, unknown>): string[] {
  const tool = registry.get(toolName);
  if (!tool) {
    return [`Unknown tool: '${toolName}'`];
  }

  const errors: string[] = [];
  const schema = tool.contract.params_schema;

  for (const [paramName, spec] of Object.entries(schema)) {
    const value = params[paramName];

    if (spec.required && (value === undefined || value === null)) {
      errors.push(`Missing required parameter: '${paramName}'`);
      continue;
    }

    if (value !== undefined && value !== null) {
      const expectedType = spec.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (expectedType === 'array' && !Array.isArray(value)) {
        errors.push(`Parameter '${paramName}' must be of type array, got ${actualType}`);
      } else if (expectedType !== 'array' && actualType !== expectedType) {
        errors.push(`Parameter '${paramName}' must be of type ${expectedType}, got ${actualType}`);
      }
    }
  }

  return errors;
}

/**
 * Helper to validate a single required parameter from a params record.
 * Returns either the validated value or an error string.
 */
export function requireParam(
  params: Record<string, unknown>,
  name: string,
  type: string,
): { valid: true; value: unknown } | { valid: false; error: string } {
  const value = params[name];

  if (value === undefined || value === null) {
    return { valid: false, error: `Missing required parameter: '${name}'` };
  }

  const actualType = Array.isArray(value) ? 'array' : typeof value;

  if (type === 'array' && !Array.isArray(value)) {
    return { valid: false, error: `Parameter '${name}' must be of type array, got ${actualType}` };
  }

  if (type !== 'array' && actualType !== type) {
    return { valid: false, error: `Parameter '${name}' must be of type ${type}, got ${actualType}` };
  }

  return { valid: true, value };
}
