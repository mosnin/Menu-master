import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Auth Hardening Tests — pure unit tests for invite edge cases,
// membership state, route guards, and role permissions.
// No DB calls; all logic is tested via local function definitions.
// ---------------------------------------------------------------------------

// ===================================================================
// 1. Membership Status State Machine
// ===================================================================
describe('Membership Status State Machine', () => {
  type MembershipStatus = 'active' | 'suspended' | 'removed';

  const VALID_TRANSITIONS: Record<MembershipStatus, MembershipStatus[]> = {
    active: ['suspended', 'removed'],
    suspended: ['active', 'removed'],
    removed: [], // terminal state
  };

  function canTransition(from: MembershipStatus, to: MembershipStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  it('active -> suspended is valid', () => expect(canTransition('active', 'suspended')).toBe(true));
  it('active -> removed is valid', () => expect(canTransition('active', 'removed')).toBe(true));
  it('suspended -> active is valid (reactivate)', () => expect(canTransition('suspended', 'active')).toBe(true));
  it('suspended -> removed is valid', () => expect(canTransition('suspended', 'removed')).toBe(true));
  it('removed -> active is invalid', () => expect(canTransition('removed', 'active')).toBe(false));
  it('removed -> suspended is invalid', () => expect(canTransition('removed', 'suspended')).toBe(false));
});

// ===================================================================
// 2. Invite Edge Cases
// ===================================================================
describe('Invite Edge Cases', () => {
  type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

  interface Invite {
    status: InviteStatus;
    email: string;
    expires_at: string;
    organization_id: string;
  }

  interface MembershipCheck {
    existingMembership: boolean;
    emailMatches: boolean;
  }

  function validateInviteAcceptance(
    invite: Invite | null,
    acceptorEmail: string,
    check: MembershipCheck,
  ): { ok: boolean; reason?: string } {
    if (!invite) return { ok: false, reason: 'not_found' };
    if (invite.status === 'accepted') return { ok: false, reason: 'already_accepted' };
    if (invite.status === 'revoked') return { ok: false, reason: 'revoked' };
    if (invite.status === 'expired') return { ok: false, reason: 'expired' };
    if (new Date(invite.expires_at) < new Date()) return { ok: false, reason: 'expired' };
    if (invite.status !== 'pending') return { ok: false, reason: 'invalid_status' };
    if (!check.emailMatches && invite.email !== acceptorEmail) {
      return { ok: false, reason: 'email_mismatch' };
    }
    if (check.existingMembership) {
      return { ok: true, reason: 'already_member' }; // ok but skip membership creation
    }
    return { ok: true };
  }

  const validInvite: Invite = {
    status: 'pending',
    email: 'user@test.com',
    expires_at: '2027-01-01T00:00:00Z',
    organization_id: 'org-1',
  };

  it('null invite -> not_found', () => {
    expect(validateInviteAcceptance(null, 'user@test.com', { existingMembership: false, emailMatches: true }).reason).toBe('not_found');
  });

  it('valid pending invite -> ok', () => {
    expect(validateInviteAcceptance(validInvite, 'user@test.com', { existingMembership: false, emailMatches: true }).ok).toBe(true);
  });

  it('already accepted invite -> already_accepted', () => {
    expect(validateInviteAcceptance({ ...validInvite, status: 'accepted' }, 'user@test.com', { existingMembership: false, emailMatches: true }).reason).toBe('already_accepted');
  });

  it('revoked invite -> revoked', () => {
    expect(validateInviteAcceptance({ ...validInvite, status: 'revoked' }, 'user@test.com', { existingMembership: false, emailMatches: true }).reason).toBe('revoked');
  });

  it('expired invite -> expired', () => {
    expect(validateInviteAcceptance({ ...validInvite, expires_at: '2020-01-01T00:00:00Z' }, 'user@test.com', { existingMembership: false, emailMatches: true }).reason).toBe('expired');
  });

  it('email mismatch -> email_mismatch', () => {
    expect(validateInviteAcceptance(validInvite, 'other@test.com', { existingMembership: false, emailMatches: false }).reason).toBe('email_mismatch');
  });

  it('already a member -> ok with already_member reason', () => {
    const result = validateInviteAcceptance(validInvite, 'user@test.com', { existingMembership: true, emailMatches: true });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe('already_member');
  });

  it('duplicate accept (already_accepted status) prevents re-acceptance', () => {
    const accepted = { ...validInvite, status: 'accepted' as const };
    expect(validateInviteAcceptance(accepted, 'user@test.com', { existingMembership: true, emailMatches: true }).ok).toBe(false);
  });
});

// ===================================================================
// 3. Re-invite Logic
// ===================================================================
describe('Re-invite Logic', () => {
  type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

  function canReInvite(existingInvites: { status: InviteStatus }[]): {
    shouldRevokePending: boolean;
    canProceed: boolean;
  } {
    const pendingInvites = existingInvites.filter((i) => i.status === 'pending');
    return {
      shouldRevokePending: pendingInvites.length > 0,
      canProceed: true, // always allow re-invite
    };
  }

  it('no existing invites -> can proceed, nothing to revoke', () => {
    const result = canReInvite([]);
    expect(result.canProceed).toBe(true);
    expect(result.shouldRevokePending).toBe(false);
  });

  it('has pending invite -> should revoke before re-inviting', () => {
    const result = canReInvite([{ status: 'pending' }]);
    expect(result.shouldRevokePending).toBe(true);
    expect(result.canProceed).toBe(true);
  });

  it('has accepted invite -> can re-invite, nothing to revoke', () => {
    const result = canReInvite([{ status: 'accepted' }]);
    expect(result.shouldRevokePending).toBe(false);
    expect(result.canProceed).toBe(true);
  });

  it('has multiple invites including pending -> should revoke pending', () => {
    const result = canReInvite([
      { status: 'accepted' },
      { status: 'expired' },
      { status: 'pending' },
    ]);
    expect(result.shouldRevokePending).toBe(true);
  });
});

// ===================================================================
// 4. Role Permission Checks
// ===================================================================
describe('Role Permission Checks', () => {
  const ROLE_HIERARCHY: Record<string, number> = {
    agent: 1,
    coordinator: 2,
    broker_admin: 3,
  };

  function hasMinimumRole(userRole: string, requiredRole: string): boolean {
    return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 999);
  }

  function canInviteMembers(role: string) { return hasMinimumRole(role, 'coordinator'); }
  function canRemoveMembers(role: string) { return role === 'broker_admin'; }
  function canSuspendMembers(role: string) { return role === 'broker_admin'; }
  function canManageWorkflows(role: string) { return hasMinimumRole(role, 'coordinator'); }
  function canViewAuditLog(role: string) { return hasMinimumRole(role, 'coordinator'); }
  function canManageOrg(role: string) { return role === 'broker_admin'; }

  it('agent cannot invite members', () => expect(canInviteMembers('agent')).toBe(false));
  it('coordinator can invite members', () => expect(canInviteMembers('coordinator')).toBe(true));
  it('broker_admin can invite members', () => expect(canInviteMembers('broker_admin')).toBe(true));

  it('only broker_admin can remove members', () => {
    expect(canRemoveMembers('agent')).toBe(false);
    expect(canRemoveMembers('coordinator')).toBe(false);
    expect(canRemoveMembers('broker_admin')).toBe(true);
  });

  it('only broker_admin can suspend members', () => {
    expect(canSuspendMembers('agent')).toBe(false);
    expect(canSuspendMembers('coordinator')).toBe(false);
    expect(canSuspendMembers('broker_admin')).toBe(true);
  });

  it('coordinator+ can manage workflows', () => {
    expect(canManageWorkflows('agent')).toBe(false);
    expect(canManageWorkflows('coordinator')).toBe(true);
    expect(canManageWorkflows('broker_admin')).toBe(true);
  });

  it('coordinator+ can view audit log', () => {
    expect(canViewAuditLog('agent')).toBe(false);
    expect(canViewAuditLog('coordinator')).toBe(true);
    expect(canViewAuditLog('broker_admin')).toBe(true);
  });

  it('only broker_admin can manage org', () => {
    expect(canManageOrg('agent')).toBe(false);
    expect(canManageOrg('coordinator')).toBe(false);
    expect(canManageOrg('broker_admin')).toBe(true);
  });

  it('unknown role has no permissions', () => {
    expect(canInviteMembers('unknown')).toBe(false);
    expect(canRemoveMembers('unknown')).toBe(false);
    expect(canManageWorkflows('unknown')).toBe(false);
    expect(canManageOrg('unknown')).toBe(false);
  });
});

// ===================================================================
// 5. Route Guard Logic
// ===================================================================
describe('Route Guard Logic', () => {
  type MembershipStatus = 'active' | 'suspended' | 'removed';

  interface GuardContext {
    hasSession: boolean;
    hasProfile: boolean;
    membershipStatus?: MembershipStatus;
    userRole?: string;
    requiredRoles?: string[];
  }

  function evaluateRouteGuard(ctx: GuardContext): {
    allowed: boolean;
    reason?: string;
    redirect?: string;
  } {
    if (!ctx.hasSession) return { allowed: false, reason: 'no_session', redirect: '/signin' };
    if (!ctx.hasProfile) return { allowed: false, reason: 'no_profile', redirect: '/signin' };
    if (ctx.membershipStatus === 'suspended') {
      return { allowed: false, reason: 'membership_suspended', redirect: '/suspended' };
    }
    if (ctx.membershipStatus === 'removed') {
      return { allowed: false, reason: 'membership_removed', redirect: '/removed' };
    }
    if (ctx.requiredRoles && ctx.userRole) {
      const ROLE_HIERARCHY: Record<string, number> = { agent: 1, coordinator: 2, broker_admin: 3 };
      const userLevel = ROLE_HIERARCHY[ctx.userRole] ?? 0;
      const minRequired = Math.min(...ctx.requiredRoles.map((r) => ROLE_HIERARCHY[r] ?? 999));
      if (userLevel < minRequired) {
        return { allowed: false, reason: 'insufficient_role', redirect: '/dashboard' };
      }
    }
    return { allowed: true };
  }

  it('no session -> redirect to signin', () => {
    const result = evaluateRouteGuard({ hasSession: false, hasProfile: false });
    expect(result.allowed).toBe(false);
    expect(result.redirect).toBe('/signin');
  });

  it('no profile -> redirect to signin', () => {
    const result = evaluateRouteGuard({ hasSession: true, hasProfile: false });
    expect(result.allowed).toBe(false);
    expect(result.redirect).toBe('/signin');
  });

  it('suspended membership -> redirect to /suspended', () => {
    const result = evaluateRouteGuard({ hasSession: true, hasProfile: true, membershipStatus: 'suspended' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('membership_suspended');
  });

  it('removed membership -> redirect to /removed', () => {
    const result = evaluateRouteGuard({ hasSession: true, hasProfile: true, membershipStatus: 'removed' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('membership_removed');
  });

  it('active membership, sufficient role -> allowed', () => {
    const result = evaluateRouteGuard({
      hasSession: true,
      hasProfile: true,
      membershipStatus: 'active',
      userRole: 'broker_admin',
      requiredRoles: ['coordinator'],
    });
    expect(result.allowed).toBe(true);
  });

  it('active membership, insufficient role -> redirect to dashboard', () => {
    const result = evaluateRouteGuard({
      hasSession: true,
      hasProfile: true,
      membershipStatus: 'active',
      userRole: 'agent',
      requiredRoles: ['coordinator'],
    });
    expect(result.allowed).toBe(false);
    expect(result.redirect).toBe('/dashboard');
  });

  it('active membership, no role requirement -> allowed', () => {
    const result = evaluateRouteGuard({
      hasSession: true,
      hasProfile: true,
      membershipStatus: 'active',
      userRole: 'agent',
    });
    expect(result.allowed).toBe(true);
  });
});

// ===================================================================
// 6. Org Switching Validation
// ===================================================================
describe('Org Switching Validation', () => {
  type MembershipStatus = 'active' | 'suspended' | 'removed';

  interface OrgMembership {
    orgId: string;
    status: MembershipStatus;
    role: string;
  }

  function canSwitchToOrg(
    memberships: OrgMembership[],
    targetOrgId: string,
  ): { allowed: boolean; reason?: string } {
    const membership = memberships.find((m) => m.orgId === targetOrgId);
    if (!membership) return { allowed: false, reason: 'not_a_member' };
    if (membership.status !== 'active') return { allowed: false, reason: 'membership_not_active' };
    return { allowed: true };
  }

  it('can switch to org with active membership', () => {
    const result = canSwitchToOrg([{ orgId: 'org-1', status: 'active', role: 'agent' }], 'org-1');
    expect(result.allowed).toBe(true);
  });

  it('cannot switch to org without membership', () => {
    const result = canSwitchToOrg([{ orgId: 'org-1', status: 'active', role: 'agent' }], 'org-2');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not_a_member');
  });

  it('cannot switch to org with suspended membership', () => {
    const result = canSwitchToOrg([{ orgId: 'org-1', status: 'suspended', role: 'agent' }], 'org-1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('membership_not_active');
  });

  it('cannot switch to org with removed membership', () => {
    const result = canSwitchToOrg([{ orgId: 'org-1', status: 'removed', role: 'agent' }], 'org-1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('membership_not_active');
  });

  it('picks correct org from multiple memberships', () => {
    const memberships: OrgMembership[] = [
      { orgId: 'org-1', status: 'active', role: 'agent' },
      { orgId: 'org-2', status: 'suspended', role: 'coordinator' },
      { orgId: 'org-3', status: 'active', role: 'broker_admin' },
    ];
    expect(canSwitchToOrg(memberships, 'org-1').allowed).toBe(true);
    expect(canSwitchToOrg(memberships, 'org-2').allowed).toBe(false);
    expect(canSwitchToOrg(memberships, 'org-3').allowed).toBe(true);
  });
});
