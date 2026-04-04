export type SpecialistRole =
  | 'planning'
  | 'exception'
  | 'communications'
  | 'compliance'
  | 'closing'
  | 'listing'
  | 'handoff';

export interface SpecialistInput {
  role: SpecialistRole;
  entityType: 'transaction' | 'listing';
  entityId: string;
  organizationId: string;
  worldState: Record<string, unknown>;  // relevant slice only
  memory: Record<string, unknown>[];    // relevant memory entries
  recentActions: string[];              // recent tool executions
  requestContext?: string;              // what the planner is asking about
}

export interface SpecialistFinding {
  severity: 'info' | 'warning' | 'critical';
  confidence: number;
  summary: string;
  details: string;
  recommended_actions: SpecialistRecommendation[];
  blocked_reasons: string[];
  needed_approvals: string[];
  dependencies: string[];
}

export interface SpecialistRecommendation {
  tool_name: string;
  reason: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  confidence: number;
}

export interface SpecialistOutput {
  role: SpecialistRole;
  invoked_at: string;
  duration_ms: number;
  findings: SpecialistFinding[];
  operator_summary: string;  // human-readable summary for UI
}

export interface SpecialistContract {
  role: SpecialistRole;
  description: string;
  allowed_entity_types: ('transaction' | 'listing')[];
  trigger_conditions: string[];  // when to invoke
  max_findings: number;
  timeout_ms: number;
}
