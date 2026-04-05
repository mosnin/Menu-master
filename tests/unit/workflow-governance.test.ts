import { describe, expect, it } from 'vitest';
import {
  buildApprovalSteps,
  canActWithinScope,
  evaluateSeparationOfDuties,
  resolveScopeInheritance,
} from '@/lib/services/workflow-governance-service';

describe('workflow governance enterprise controls', () => {
  it('resolves scope inheritance from team to organization', () => {
    const resolved = resolveScopeInheritance({
      orgId: 'org-1',
      scopeType: 'team',
      scopeRef: 'team-1',
      scopes: [
        { id: 'scope-org', scope_type: 'organization', scope_ref: 'org-1', parent_scope_id: null },
        { id: 'scope-office', scope_type: 'office', scope_ref: 'office-1', parent_scope_id: 'scope-org' },
        { id: 'scope-team', scope_type: 'team', scope_ref: 'team-1', parent_scope_id: 'scope-office' },
      ],
    });

    expect(resolved.effectiveScope?.id).toBe('scope-team');
    expect(resolved.inheritedFrom).toEqual(['scope-team', 'scope-office', 'scope-org']);
  });

  it('enforces office/team delegation boundaries for non-admin roles', () => {
    expect(canActWithinScope({
      membershipRole: 'coordinator',
      scopeType: 'office',
      scopeRef: 'office-1',
      officeIds: ['office-1'],
      teamIds: [],
    })).toBe(true);

    expect(canActWithinScope({
      membershipRole: 'coordinator',
      scopeType: 'office',
      scopeRef: 'office-2',
      officeIds: ['office-1'],
      teamIds: [],
    })).toBe(false);
  });

  it('builds stronger multi-role chains for high-risk automation', () => {
    const safe = buildApprovalSteps('safe');
    const high = buildApprovalSteps('high_risk');

    expect(safe.length).toBe(1);
    expect(high.length).toBe(4);
    expect(high.some((step) => step.requiredAssignmentType === 'enterprise_admin_delegate')).toBe(true);
  });

  it('detects deterministic separation-of-duties violations', () => {
    const result = evaluateSeparationOfDuties({
      riskLevel: 'high_risk',
      creatorUserId: 'user-1',
      approverUserId: 'user-1',
      complianceReviewerUserId: 'user-1',
    });

    expect(result.pass).toBe(false);
    expect(result.violations).toContain('creator_cannot_self_approve_risky_automation');
    expect(result.violations).toContain('compliance_reviewer_must_differ_from_approver_for_high_risk');
  });
});
