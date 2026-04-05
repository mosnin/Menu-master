import * as governanceRepo from '@/lib/repositories/workflow-governance';
import * as workflowRepo from '@/lib/repositories/workflows';
import * as versionRepo from '@/lib/repositories/workflow-versions';
import * as officeRepo from '@/lib/repositories/offices';
import * as teamRepo from '@/lib/repositories/teams';
import * as officeMembershipRepo from '@/lib/repositories/office-memberships';
import type { GovernanceAssignmentType, GovernanceScopeType } from '@/lib/validation/workflow-governance';

export function classifyWorkflowRisk(graph: { nodes: Array<{ type: string }> }) {
  const nodeTypes = new Set(graph.nodes.map((node) => node.type));
  if (nodeTypes.has('transition_transaction_stage') || nodeTypes.has('transition_listing_stage') || nodeTypes.has('emit_webhook')) return 'high_risk';
  if (nodeTypes.has('create_approval') || nodeTypes.has('human_checkpoint') || Array.from(nodeTypes).some((type) => type.startsWith('agent_'))) return 'medium_risk';
  return 'safe';
}

export function evaluateSeparationOfDuties(input: {
  riskLevel: 'safe' | 'medium_risk' | 'high_risk';
  creatorUserId: string;
  approverUserId?: string | null;
  complianceReviewerUserId?: string | null;
}) {
  const violations: string[] = [];

  if ((input.riskLevel === 'medium_risk' || input.riskLevel === 'high_risk') && input.approverUserId && input.approverUserId === input.creatorUserId) {
    violations.push('creator_cannot_self_approve_risky_automation');
  }

  if (input.riskLevel === 'high_risk' && input.approverUserId && input.complianceReviewerUserId && input.approverUserId === input.complianceReviewerUserId) {
    violations.push('compliance_reviewer_must_differ_from_approver_for_high_risk');
  }

  return { pass: violations.length === 0, violations };
}

export function resolveScopeInheritance(input: {
  scopes: Array<{ id: string; scope_type: string; scope_ref: string; parent_scope_id: string | null }>;
  scopeType: GovernanceScopeType;
  scopeRef: string;
  orgId: string;
}) {
  const byTypeRef = new Map(input.scopes.map((scope) => [`${scope.scope_type}:${scope.scope_ref}`, scope]));
  const byId = new Map(input.scopes.map((scope) => [scope.id, scope]));

  const scoped = byTypeRef.get(`${input.scopeType}:${input.scopeRef}`);
  const root = byTypeRef.get(`organization:${input.orgId}`) ?? null;
  if (!scoped) return { effectiveScope: root, inheritedFrom: root ? [root.id] : [] };

  const path = [scoped.id];
  let cursor = scoped.parent_scope_id ? byId.get(scoped.parent_scope_id) ?? null : null;
  while (cursor) {
    path.push(cursor.id);
    cursor = cursor.parent_scope_id ? byId.get(cursor.parent_scope_id) ?? null : null;
  }

  return { effectiveScope: scoped, inheritedFrom: path };
}

export function canActWithinScope(input: {
  membershipRole: string;
  scopeType: GovernanceScopeType;
  scopeRef: string;
  officeIds: string[];
  teamIds: string[];
}) {
  if (input.membershipRole === 'broker_admin') return true;
  if (input.scopeType === 'office') return input.officeIds.includes(input.scopeRef);
  if (input.scopeType === 'team') return input.teamIds.includes(input.scopeRef);
  return false;
}

export async function ensureRootAndLocalScopes(input: { orgId: string; userId: string }) {
  const root = await governanceRepo.upsertScope({
    organization_id: input.orgId,
    scope_type: 'organization',
    scope_ref: input.orgId,
    scope_name: 'Organization Governance Scope',
    parent_scope_id: null,
    created_by_user_id: input.userId,
  });

  const [offices, teams] = await Promise.all([officeRepo.findByOrgId(input.orgId), teamRepo.findByOrgId(input.orgId)]);
  const officeScopes = await Promise.all(offices.map((office) => governanceRepo.upsertScope({
    organization_id: input.orgId,
    scope_type: 'office',
    scope_ref: office.id,
    scope_name: `Office: ${office.name}`,
    parent_scope_id: root.id,
    created_by_user_id: input.userId,
    scope_config_json: { office_id: office.id },
  })));

  const teamScopes = await Promise.all(teams.map((team) => governanceRepo.upsertScope({
    organization_id: input.orgId,
    scope_type: 'team',
    scope_ref: team.id,
    scope_name: `Team: ${team.name}`,
    parent_scope_id: root.id,
    created_by_user_id: input.userId,
    scope_config_json: { team_id: team.id },
  })));

  return { root, officeScopes, teamScopes };
}

export async function assignDelegatedOwnership(input: {
  orgId: string;
  scopeType: GovernanceScopeType;
  scopeRef: string;
  assignmentType: GovernanceAssignmentType;
  assetType: 'workflow' | 'template' | 'playbook';
  assetRef: string;
  assignedUserId: string;
  assignedRole: string;
  actorUserId: string;
  note?: string;
}) {
  const scope = await governanceRepo.findScope(input.orgId, input.scopeType, input.scopeRef);
  if (!scope) throw new Error('Scope not found');

  const assignment = await governanceRepo.createAssignment({
    organization_id: input.orgId,
    scope_id: scope.id,
    assignment_type: input.assignmentType,
    asset_type: input.assetType,
    asset_ref: input.assetRef,
    assigned_user_id: input.assignedUserId,
    assigned_role: input.assignedRole,
    status: 'active',
    assigned_by_user_id: input.actorUserId,
    note: input.note ?? null,
  });

  await governanceRepo.createEvent({
    organization_id: input.orgId,
    scope_id: scope.id,
    event_type: 'ownership_delegated',
    actor_user_id: input.actorUserId,
    target_type: 'governance_assignment',
    target_ref: assignment.id,
    note: input.note ?? null,
  });

  return assignment;
}

export async function createDefaultApprovalChain(input: {
  orgId: string;
  scopeType: GovernanceScopeType;
  scopeRef: string;
  assetType: 'workflow' | 'template' | 'playbook';
  riskLevel: 'safe' | 'medium_risk' | 'high_risk';
  chainName: string;
  actorUserId: string;
}) {
  const scope = await governanceRepo.findScope(input.orgId, input.scopeType, input.scopeRef);
  if (!scope) throw new Error('Scope not found');

  const chain = await governanceRepo.createChain({
    organization_id: input.orgId,
    scope_id: scope.id,
    chain_name: input.chainName,
    asset_type: input.assetType,
    risk_level: input.riskLevel,
    created_by_user_id: input.actorUserId,
  });

  const steps = buildApprovalSteps(input.riskLevel);
  const createdSteps = await Promise.all(steps.map((step) => governanceRepo.createChainStep({
    organization_id: input.orgId,
    chain_id: chain.id,
    step_order: step.stepOrder,
    step_mode: step.stepMode,
    required_role: step.requiredRole,
    required_assignment_type: step.requiredAssignmentType,
    requires_distinct_user: step.requiresDistinctUser,
    rationale: step.rationale,
  })));

  return { chain, steps: createdSteps };
}

export function buildApprovalSteps(riskLevel: 'safe' | 'medium_risk' | 'high_risk') {
  const steps = [{ stepOrder: 1, stepMode: 'sequential' as const, requiredRole: 'automation_owner', requiredAssignmentType: 'automation_owner', requiresDistinctUser: false, rationale: 'Owner review' }];
  if (riskLevel !== 'safe') {
    steps.push({ stepOrder: 2, stepMode: 'sequential' as const, requiredRole: 'coordinator', requiredAssignmentType: 'compliance_reviewer', requiresDistinctUser: true, rationale: 'Compliance review' });
  }
  if (riskLevel === 'high_risk') {
    steps.push({ stepOrder: 3, stepMode: 'parallel' as const, requiredRole: 'broker_admin', requiredAssignmentType: 'release_reviewer', requiresDistinctUser: true, rationale: 'Release reviewer approval' });
    steps.push({ stepOrder: 3, stepMode: 'parallel' as const, requiredRole: 'broker_admin', requiredAssignmentType: 'enterprise_admin_delegate', requiresDistinctUser: true, rationale: 'Enterprise admin approval' });
  }
  return steps;
}

export async function detectGovernanceGaps(orgId: string) {
  const [workflows, assignments, routes, chains, conflicts] = await Promise.all([
    workflowRepo.findByOrgId(orgId),
    governanceRepo.listAssignments(orgId),
    governanceRepo.listRoutes(orgId),
    governanceRepo.listChains(orgId),
    governanceRepo.listConflicts(orgId, 'open'),
  ]);

  const openKeys = new Set(conflicts.map((conflict) => `${conflict.asset_type}:${conflict.asset_ref}:${conflict.conflict_type}`));
  const generated: any[] = [];

  for (const workflow of workflows) {
    const versions = await versionRepo.findByWorkflowId(workflow.id);
    const latest = versions[0];
    if (!latest) continue;

    const riskLevel = classifyWorkflowRisk(latest.graph_data);
    const owner = assignments.find((assignment) => assignment.assignment_type === 'automation_owner' && assignment.asset_type === 'workflow' && assignment.asset_ref === workflow.id);
    if (!owner && !openKeys.has(`workflow:${workflow.id}:missing_owner`)) {
      generated.push(await governanceRepo.createConflict({
        organization_id: orgId,
        asset_type: 'workflow',
        asset_ref: workflow.id,
        conflict_type: 'missing_owner',
        severity: riskLevel === 'high_risk' ? 'critical' : 'major',
        details: 'Workflow has no delegated automation owner.',
      }));
    }

    const hasRoute = routes.some((route) => route.risk_level === riskLevel && route.route_type === 'approval');
    if (!hasRoute && !openKeys.has(`workflow:${workflow.id}:missing_reviewer_route`)) {
      generated.push(await governanceRepo.createConflict({
        organization_id: orgId,
        asset_type: 'workflow',
        asset_ref: workflow.id,
        conflict_type: 'missing_reviewer_route',
        severity: 'major',
        details: 'No reviewer route configured for workflow risk level.',
      }));
    }

    const hasChain = chains.some((chain) => chain.asset_type === 'workflow' && chain.risk_level === riskLevel);
    if (!hasChain && !openKeys.has(`workflow:${workflow.id}:approval_chain_gap`)) {
      generated.push(await governanceRepo.createConflict({
        organization_id: orgId,
        asset_type: 'workflow',
        asset_ref: workflow.id,
        conflict_type: 'approval_chain_gap',
        severity: riskLevel === 'high_risk' ? 'critical' : 'major',
        details: 'No approval chain configured for workflow risk level.',
      }));
    }
  }

  return generated;
}

export async function buildGovernanceOverview(orgId: string, actorUserId: string) {
  const [scopes, assignments, routes, chains, conflicts, offices, teams, workflows, memberships] = await Promise.all([
    governanceRepo.listScopes(orgId),
    governanceRepo.listAssignments(orgId),
    governanceRepo.listRoutes(orgId),
    governanceRepo.listChains(orgId),
    governanceRepo.listConflicts(orgId, 'open'),
    officeRepo.findByOrgId(orgId),
    teamRepo.findByOrgId(orgId),
    workflowRepo.findByOrgId(orgId),
    officeMembershipRepo.findByUserId(actorUserId),
  ]);

  const myOfficeIds = memberships.map((membership) => membership.office_id);
  const myTeamIds = memberships.map((membership) => membership.team_id).filter(Boolean);

  return {
    summary: {
      totalScopes: scopes.length,
      totalAssignments: assignments.length,
      totalApprovalChains: chains.length,
      totalRoutes: routes.length,
      openConflicts: conflicts.length,
      missingOwnerConflicts: conflicts.filter((c) => c.conflict_type === 'missing_owner').length,
      sodConflicts: conflicts.filter((c) => c.conflict_type === 'sod_violation').length,
      officesMissingCoverage: Math.max(0, offices.length - scopes.filter((scope) => scope.scope_type === 'office').length),
      teamsMissingCoverage: Math.max(0, teams.length - scopes.filter((scope) => scope.scope_type === 'team').length),
    },
    queues: {
      myAutomationApprovals: assignments.filter((a) => a.assigned_user_id === actorUserId && a.assignment_type === 'release_reviewer'),
      myOfficeAutomationReviews: assignments.filter((a) => a.assignment_type === 'office_delegate' && a.office_id && myOfficeIds.includes(a.office_id)),
      myTeamAutomationReviews: assignments.filter((a) => a.assignment_type === 'team_delegate' && a.team_id && myTeamIds.includes(a.team_id)),
      enterpriseRiskyAutomationQueue: workflows,
      missingOwnerQueue: conflicts.filter((c) => c.conflict_type === 'missing_owner'),
      sodConflictQueue: conflicts.filter((c) => c.conflict_type === 'sod_violation'),
    },
    scopes,
    assignments,
    routes,
    chains,
    conflicts,
  };
}

export async function ensurePublishGovernance(input: {
  orgId: string;
  workflowId: string;
  actorUserId: string;
}) {
  const versions = await versionRepo.findByWorkflowId(input.workflowId);
  const latest = versions[0];
  if (!latest) return { pass: true, reason: 'No versions found' };

  const riskLevel = classifyWorkflowRisk(latest.graph_data);
  const assignments = await governanceRepo.listAssignments(input.orgId);
  const owner = assignments.find((assignment) => assignment.assignment_type === 'automation_owner' && assignment.asset_type === 'workflow' && assignment.asset_ref === input.workflowId);
  const complianceReviewer = assignments.find((assignment) => assignment.assignment_type === 'compliance_reviewer' && assignment.asset_type === 'workflow' && assignment.asset_ref === input.workflowId);

  const sod = evaluateSeparationOfDuties({
    riskLevel,
    creatorUserId: latest.created_by_user_id,
    approverUserId: input.actorUserId,
    complianceReviewerUserId: complianceReviewer?.assigned_user_id,
  });

  if (!sod.pass) {
    return { pass: false, reason: `SoD violation: ${sod.violations.join(', ')}` };
  }

  if (!owner && riskLevel !== 'safe') {
    return { pass: false, reason: 'Risky workflow is missing delegated automation owner.' };
  }

  return { pass: true, reason: 'Governance checks passed' };
}
