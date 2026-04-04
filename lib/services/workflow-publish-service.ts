import * as workflowRepo from '@/lib/repositories/workflows';
import * as versionRepo from '@/lib/repositories/workflow-versions';
import * as triggerRepo from '@/lib/repositories/workflow-triggers';
import { validateWorkflowGraph, type ValidationResult } from '@/lib/services/workflow-graph-validator';
import { logAction } from '@/lib/audit/logger';
import type { WorkflowGraphData, WorkflowVersion } from '@/types';

// ---------------------------------------------------------------------------
// Publish Governance
// ---------------------------------------------------------------------------

export class PublishGovernanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublishGovernanceError';
  }
}

const STAGE_TRANSITION_NODE_TYPES = new Set([
  'transition_transaction_stage',
  'transition_listing_stage',
]);

/**
 * Inspect a workflow graph and return an array of human-readable warnings that
 * should be surfaced to the publisher before they confirm the publish action.
 */
export function getPublishWarnings(graphData: WorkflowGraphData): string[] {
  const warnings: string[] = [];
  const nodes = graphData.nodes ?? [];

  const hasAgentNodes = nodes.some((n) => n.type.startsWith('agent_'));
  if (hasAgentNodes) {
    warnings.push(
      'This workflow contains AI agent nodes that will execute automatically.',
    );
  }

  const hasHumanCheckpoints = nodes.some((n) => n.type === 'human_checkpoint');
  if (hasHumanCheckpoints) {
    warnings.push(
      'This workflow includes human checkpoints that will block execution until reviewed.',
    );
  }

  const hasBranchingLogic = nodes.some(
    (n) => n.type === 'condition' || n.type === 'branch',
  );
  if (!hasBranchingLogic) {
    warnings.push(
      'This workflow has no branching logic \u2014 all paths are unconditional.',
    );
  }

  if (nodes.length > 15) {
    warnings.push(
      `This workflow has many nodes (${nodes.length}). Consider simplifying.`,
    );
  }

  const hasStageTransition = nodes.some((n) =>
    STAGE_TRANSITION_NODE_TYPES.has(n.type),
  );
  if (hasStageTransition) {
    warnings.push('This workflow can automatically transition stages.');
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Create a new draft version for a workflow
// ---------------------------------------------------------------------------

export async function createWorkflowDraft(
  workflowId: string,
  graphData: WorkflowGraphData,
  userId: string,
): Promise<WorkflowVersion> {
  const workflow = await workflowRepo.findById(workflowId);
  if (!workflow) throw new Error('Workflow not found');

  const latest = await versionRepo.findLatestByWorkflowId(workflowId);
  const nextVersion = latest ? latest.version_number + 1 : 1;

  const version = await versionRepo.create({
    workflow_id: workflowId,
    version_number: nextVersion,
    status: 'draft',
    graph_data: graphData,
    validation_errors: [],
    published_by_user_id: null,
    published_at: null,
    created_by_user_id: userId,
  });

  await logAction({
    organizationId: workflow.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'workflow.version_created',
    targetType: 'workflow_version',
    targetId: version.id,
    metadata: { workflow_id: workflowId, version_number: nextVersion },
  });

  return version;
}

// ---------------------------------------------------------------------------
// Validate a draft version
// ---------------------------------------------------------------------------

export async function validateDraft(
  versionId: string,
): Promise<ValidationResult> {
  const version = await versionRepo.findById(versionId);
  if (!version) throw new Error('Version not found');
  if (version.status !== 'draft' && version.status !== 'validated') {
    throw new Error(`Cannot validate a version in status "${version.status}"`);
  }

  const result = validateWorkflowGraph(version.graph_data);

  await versionRepo.update(versionId, {
    status: result.valid ? 'validated' : 'draft',
    validation_errors: result.errors as unknown[],
  });

  const workflow = await workflowRepo.findById(version.workflow_id);

  await logAction({
    organizationId: workflow?.organization_id,
    actorType: 'system',
    action: 'workflow.version_validated',
    targetType: 'workflow_version',
    targetId: versionId,
    metadata: {
      workflow_id: version.workflow_id,
      valid: result.valid,
      error_count: result.errors.length,
    },
  });

  return result;
}

// ---------------------------------------------------------------------------
// Publish a validated version
// ---------------------------------------------------------------------------

export async function publishVersion(
  versionId: string,
  userId: string,
  publisherRole?: string,
): Promise<WorkflowVersion> {
  if (publisherRole && publisherRole !== 'broker_admin') {
    throw new PublishGovernanceError(
      'Only users with the broker_admin role may publish workflow versions.',
    );
  }

  const version = await versionRepo.findById(versionId);
  if (!version) throw new Error('Version not found');
  if (version.status !== 'validated') {
    throw new Error(`Cannot publish a version in status "${version.status}" — must be "validated"`);
  }

  const workflow = await workflowRepo.findById(version.workflow_id);
  if (!workflow) throw new Error('Workflow not found');

  // Archive any currently published version for this workflow
  const currentPublished = await versionRepo.findPublishedByWorkflowId(version.workflow_id);
  if (currentPublished) {
    await versionRepo.update(currentPublished.id, { status: 'archived' });
  }

  // Deactivate existing triggers for this workflow
  await triggerRepo.deactivateByWorkflowId(version.workflow_id);

  // Activate triggers from graph data
  const graph: WorkflowGraphData = version.graph_data;
  for (const triggerConfig of graph.triggers ?? []) {
    await triggerRepo.create({
      workflow_id: version.workflow_id,
      workflow_version_id: versionId,
      event_type: triggerConfig.event_type,
      event_filter: triggerConfig.event_filter ?? {},
      is_active: true,
    });
  }

  const published = await versionRepo.update(versionId, {
    status: 'published',
    published_by_user_id: userId,
    published_at: new Date().toISOString(),
  });

  await logAction({
    organizationId: workflow.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'workflow.version_published',
    targetType: 'workflow_version',
    targetId: versionId,
    metadata: { workflow_id: version.workflow_id, version_number: version.version_number },
  });

  return published;
}

// ---------------------------------------------------------------------------
// Archive a version
// ---------------------------------------------------------------------------

export async function archiveVersion(
  versionId: string,
  userId: string,
): Promise<WorkflowVersion> {
  const version = await versionRepo.findById(versionId);
  if (!version) throw new Error('Version not found');

  const workflow = await workflowRepo.findById(version.workflow_id);

  const archived = await versionRepo.update(versionId, {
    status: 'archived',
  });

  await logAction({
    organizationId: workflow?.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'workflow.version_archived',
    targetType: 'workflow_version',
    targetId: versionId,
    metadata: { workflow_id: version.workflow_id, version_number: version.version_number },
  });

  return archived;
}

// ---------------------------------------------------------------------------
// Get all versions for a workflow
// ---------------------------------------------------------------------------

export async function getVersions(workflowId: string): Promise<WorkflowVersion[]> {
  return versionRepo.findByWorkflowId(workflowId);
}

// ---------------------------------------------------------------------------
// Backward-compatible aliases (used by workflow-actions.ts)
// ---------------------------------------------------------------------------

export const createDraftVersion = createWorkflowDraft;

export async function validateDraftVersion(
  versionId: string,
): Promise<WorkflowVersion> {
  const result = await validateDraft(versionId);
  const version = await versionRepo.findById(versionId);
  if (!version) throw new Error('Version not found after validation');
  return version;
}
