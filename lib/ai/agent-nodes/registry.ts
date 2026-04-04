import type { AgentNodeDefinition, AgentNodeType } from './types';

const registry = new Map<AgentNodeType, AgentNodeDefinition>();

export function registerAgentNode(definition: AgentNodeDefinition): void {
  if (registry.has(definition.type)) {
    throw new Error(`Agent node type already registered: ${definition.type}`);
  }
  registry.set(definition.type, definition);
}

export function getAgentNodeDefinition(type: AgentNodeType): AgentNodeDefinition | undefined {
  return registry.get(type);
}

export function getAllAgentNodeDefinitions(): AgentNodeDefinition[] {
  return Array.from(registry.values());
}

export function isAgentNodeType(type: string): type is AgentNodeType {
  return registry.has(type as AgentNodeType);
}

export const AGENT_NODE_TYPES: readonly AgentNodeType[] = [
  'agent_next_best_action_planner',
  'agent_exception_triage_classifier',
  'agent_document_classifier',
  'agent_offer_explanation',
  'agent_communication_draft',
  'agent_compliance_critic',
  'agent_deal_router',
] as const;
