'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as workflowRepo from '@/lib/repositories/workflows';
import * as versionRepo from '@/lib/repositories/workflow-versions';
import * as runRepo from '@/lib/repositories/workflow-runs';
import * as publishService from '@/lib/services/workflow-publish-service';
import * as engineService from '@/lib/services/workflow-engine-service';
import { compareWorkflowVersions } from '@/lib/services/workflow-diff-service';
import type { WorkflowGraphData } from '@/types';

// ---------------------------------------------------------------------------
// 1. List workflows for an org
// ---------------------------------------------------------------------------

export async function getWorkflowsAction(orgId: string) {
  await requireAuth();
  await requireOrgMembership(orgId);
  return workflowRepo.findByOrgId(orgId);
}

// ---------------------------------------------------------------------------
// 2. Create a workflow (broker_admin only)
// ---------------------------------------------------------------------------

export async function createWorkflowAction(data: {
  name: string;
  description?: string;
  orgId: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await requireRole(data.orgId, ['broker_admin']);

    const workflow = await workflowRepo.create({
      organization_id: data.orgId,
      name: data.name,
      description: data.description ?? null,
      created_by_user_id: profile.id,
      is_active: true,
    });

    revalidatePath('/ops/workflows');
    return { id: workflow.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create workflow' };
  }
}

// ---------------------------------------------------------------------------
// 3. List versions for a workflow
// ---------------------------------------------------------------------------

export async function getWorkflowVersionsAction(workflowId: string) {
  await requireAuth();
  const workflow = await workflowRepo.findById(workflowId);
  if (!workflow) return [];
  await requireOrgMembership(workflow.organization_id);
  return versionRepo.findByWorkflowId(workflowId);
}

// ---------------------------------------------------------------------------
// 4. Create a draft version (broker_admin only)
// ---------------------------------------------------------------------------

export async function createDraftAction(
  workflowId: string,
  graphData: WorkflowGraphData,
): Promise<{ id?: string; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const workflow = await workflowRepo.findById(workflowId);
    if (!workflow) return { error: 'Workflow not found' };
    await requireRole(workflow.organization_id, ['broker_admin']);

    const version = await publishService.createWorkflowDraft(workflowId, graphData, profile.id);

    revalidatePath(`/ops/workflows/${workflowId}`);
    return { id: version.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create draft' };
  }
}

// ---------------------------------------------------------------------------
// 5. Validate a draft version (broker_admin only)
// ---------------------------------------------------------------------------

export async function validateDraftAction(
  versionId: string,
): Promise<{ valid?: boolean; errors?: unknown[]; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const version = await versionRepo.findById(versionId);
    if (!version) return { error: 'Version not found' };

    const workflow = await workflowRepo.findById(version.workflow_id);
    if (!workflow) return { error: 'Workflow not found' };
    await requireRole(workflow.organization_id, ['broker_admin']);

    const result = await publishService.validateDraft(versionId);

    revalidatePath(`/ops/workflows/${workflow.id}`);
    return {
      valid: result.valid,
      errors: result.errors,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to validate draft' };
  }
}

// ---------------------------------------------------------------------------
// 6. Publish a validated version (broker_admin only)
// ---------------------------------------------------------------------------

export async function publishVersionAction(
  versionId: string,
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const version = await versionRepo.findById(versionId);
    if (!version) return { error: 'Version not found' };

    const workflow = await workflowRepo.findById(version.workflow_id);
    if (!workflow) return { error: 'Workflow not found' };
    const { membership } = await requireRole(workflow.organization_id, ['broker_admin']);

    await publishService.publishVersion(versionId, profile.id, membership.role);

    revalidatePath(`/ops/workflows/${workflow.id}`);
    revalidatePath('/ops/workflows');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to publish version' };
  }
}

// ---------------------------------------------------------------------------
// 7. List workflow runs for an org
// ---------------------------------------------------------------------------

export async function getWorkflowRunsAction(
  orgId: string,
  options?: { status?: string; limit?: number; offset?: number },
) {
  await requireAuth();
  await requireOrgMembership(orgId);
  return runRepo.findByOrgId(orgId, options as any);
}

// ---------------------------------------------------------------------------
// 8. Get a single workflow run with steps
// ---------------------------------------------------------------------------

export async function getWorkflowRunAction(runId: string) {
  await requireAuth();
  const result = await engineService.getRunWithSteps(runId);
  if (!result) return null;
  await requireOrgMembership(result.run.organization_id);
  return result;
}

// ---------------------------------------------------------------------------
// 9. Start a manual run (broker_admin only)
// ---------------------------------------------------------------------------

export async function startManualRunAction(
  workflowVersionId: string,
  triggerPayload?: Record<string, unknown>,
): Promise<{ id?: string; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const version = await versionRepo.findById(workflowVersionId);
    if (!version) return { error: 'Version not found' };

    const workflow = await workflowRepo.findById(version.workflow_id);
    if (!workflow) return { error: 'Workflow not found' };
    await requireRole(workflow.organization_id, ['broker_admin']);

    const run = await engineService.startWorkflowRun(
      workflowVersionId,
      workflow.organization_id,
      'manual_trigger',
      triggerPayload ?? {},
      { initiatedByUserId: profile.id },
    );

    revalidatePath('/ops/workflow-runs');
    return { id: run.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to start run' };
  }
}

// ---------------------------------------------------------------------------
// 10. Cancel a run (broker_admin only)
// ---------------------------------------------------------------------------

export async function cancelRunAction(
  runId: string,
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const run = await runRepo.findById(runId);
    if (!run) return { error: 'Run not found' };
    await requireRole(run.organization_id, ['broker_admin']);

    await engineService.cancelRun(runId, profile.id);

    revalidatePath('/ops/workflow-runs');
    revalidatePath(`/ops/workflow-runs/${runId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to cancel run' };
  }
}

// ---------------------------------------------------------------------------
// 11. Get publish warnings for a version
// ---------------------------------------------------------------------------

export async function getPublishWarningsAction(
  versionId: string,
): Promise<{ warnings?: string[]; error?: string }> {
  try {
    await requireAuth();

    const version = await versionRepo.findById(versionId);
    if (!version) return { error: 'Version not found' };

    const workflow = await workflowRepo.findById(version.workflow_id);
    if (!workflow) return { error: 'Workflow not found' };
    await requireOrgMembership(workflow.organization_id);

    const warnings = publishService.getPublishWarnings(version.graph_data);
    return { warnings };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get publish warnings' };
  }
}

// ---------------------------------------------------------------------------
// 12. Compare two workflow versions
// ---------------------------------------------------------------------------

export async function compareVersionsAction(
  versionIdA: string,
  versionIdB: string,
): Promise<{ diff?: ReturnType<typeof compareWorkflowVersions>; error?: string }> {
  try {
    await requireAuth();

    const [versionA, versionB] = await Promise.all([
      versionRepo.findById(versionIdA),
      versionRepo.findById(versionIdB),
    ]);

    if (!versionA) return { error: 'Version A not found' };
    if (!versionB) return { error: 'Version B not found' };

    // Ensure both belong to the same workflow
    if (versionA.workflow_id !== versionB.workflow_id) {
      return { error: 'Cannot compare versions from different workflows' };
    }

    const workflow = await workflowRepo.findById(versionA.workflow_id);
    if (!workflow) return { error: 'Workflow not found' };
    await requireOrgMembership(workflow.organization_id);

    const diff = compareWorkflowVersions(versionA.graph_data, versionB.graph_data);
    return { diff };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to compare versions' };
  }
}

// ---------------------------------------------------------------------------
// 13. Pause a run
// ---------------------------------------------------------------------------

export async function pauseRunAction(
  runId: string,
): Promise<{ error?: string }> {
  try {
    await requireAuth();

    await engineService.pauseRun(runId);

    revalidatePath('/ops/workflow-runs');
    revalidatePath(`/ops/workflow-runs/${runId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to pause run' };
  }
}

// ---------------------------------------------------------------------------
// 14. Resume a paused run
// ---------------------------------------------------------------------------

export async function resumeRunAction(
  runId: string,
): Promise<{ error?: string }> {
  try {
    await requireAuth();

    await engineService.resumePausedRun(runId);

    revalidatePath('/ops/workflow-runs');
    revalidatePath(`/ops/workflow-runs/${runId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to resume run' };
  }
}

// ---------------------------------------------------------------------------
// 15. Override a step (broker_admin only)
// ---------------------------------------------------------------------------

export async function overrideStepAction(
  runId: string,
  stepId: string,
  output: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    await requireAuth();

    const run = await runRepo.findById(runId);
    if (!run) return { error: 'Run not found' };
    await requireOrgMembership(run.organization_id);
    await requireRole(run.organization_id, ['broker_admin']);

    await engineService.overrideStep(runId, stepId, output);

    revalidatePath('/ops/workflow-runs');
    revalidatePath(`/ops/workflow-runs/${runId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to override step' };
  }
}

// ---------------------------------------------------------------------------
// 16. Re-run a workflow
// ---------------------------------------------------------------------------

export async function rerunWorkflowAction(
  runId: string,
): Promise<{ id?: string; error?: string }> {
  try {
    await requireAuth();

    const newRunId = await engineService.rerunWorkflow(runId);

    revalidatePath('/ops/workflow-runs');
    return { id: newRunId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to re-run workflow' };
  }
}
