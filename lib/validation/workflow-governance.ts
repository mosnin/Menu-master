import { z } from 'zod';

export const GovernanceScopeTypeSchema = z.enum(['organization', 'office', 'team', 'workflow_family', 'automation_category', 'template_segment', 'playbook_segment']);
export const GovernanceAssignmentTypeSchema = z.enum(['automation_owner', 'compliance_reviewer', 'release_reviewer', 'office_delegate', 'team_delegate', 'enterprise_admin_delegate']);
export const GovernanceRiskLevelSchema = z.enum(['safe', 'medium_risk', 'high_risk']);
export const GovernanceConflictTypeSchema = z.enum(['missing_owner', 'missing_reviewer_route', 'sod_violation', 'scope_boundary_violation', 'approval_chain_gap']);

export type GovernanceScopeType = z.infer<typeof GovernanceScopeTypeSchema>;
export type GovernanceAssignmentType = z.infer<typeof GovernanceAssignmentTypeSchema>;
