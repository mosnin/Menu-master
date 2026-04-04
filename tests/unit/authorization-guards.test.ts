import { describe, it, expect } from 'vitest';
import {
  hasMinimumRole,
  canManageDocuments,
  canManageApprovals,
  canManageOrg,
  canCreateTransaction,
  canViewTransaction,
} from '@/lib/auth/roles';

describe('Role hierarchy', () => {
  it('agent has minimum agent role', () => {
    expect(hasMinimumRole('agent', 'agent')).toBe(true);
  });

  it('agent does not have coordinator role', () => {
    expect(hasMinimumRole('agent', 'coordinator')).toBe(false);
  });

  it('agent does not have broker_admin role', () => {
    expect(hasMinimumRole('agent', 'broker_admin')).toBe(false);
  });

  it('coordinator has minimum agent role', () => {
    expect(hasMinimumRole('coordinator', 'agent')).toBe(true);
  });

  it('coordinator has minimum coordinator role', () => {
    expect(hasMinimumRole('coordinator', 'coordinator')).toBe(true);
  });

  it('coordinator does not have broker_admin role', () => {
    expect(hasMinimumRole('coordinator', 'broker_admin')).toBe(false);
  });

  it('broker_admin has all roles', () => {
    expect(hasMinimumRole('broker_admin', 'agent')).toBe(true);
    expect(hasMinimumRole('broker_admin', 'coordinator')).toBe(true);
    expect(hasMinimumRole('broker_admin', 'broker_admin')).toBe(true);
  });

  it('unknown role has no permissions', () => {
    expect(hasMinimumRole('unknown', 'agent')).toBe(false);
  });
});

describe('Permission checks', () => {
  describe('canManageDocuments', () => {
    it('agent cannot manage documents', () => {
      expect(canManageDocuments('agent')).toBe(false);
    });

    it('coordinator can manage documents', () => {
      expect(canManageDocuments('coordinator')).toBe(true);
    });

    it('broker_admin can manage documents', () => {
      expect(canManageDocuments('broker_admin')).toBe(true);
    });
  });

  describe('canManageApprovals', () => {
    it('agent cannot manage approvals', () => {
      expect(canManageApprovals('agent')).toBe(false);
    });

    it('coordinator can manage approvals', () => {
      expect(canManageApprovals('coordinator')).toBe(true);
    });

    it('broker_admin can manage approvals', () => {
      expect(canManageApprovals('broker_admin')).toBe(true);
    });
  });

  describe('canManageOrg', () => {
    it('agent cannot manage org', () => {
      expect(canManageOrg('agent')).toBe(false);
    });

    it('coordinator cannot manage org', () => {
      expect(canManageOrg('coordinator')).toBe(false);
    });

    it('broker_admin can manage org', () => {
      expect(canManageOrg('broker_admin')).toBe(true);
    });
  });

  describe('canCreateTransaction', () => {
    it('agent can create transactions', () => {
      expect(canCreateTransaction('agent')).toBe(true);
    });

    it('coordinator can create transactions', () => {
      expect(canCreateTransaction('coordinator')).toBe(true);
    });

    it('broker_admin can create transactions', () => {
      expect(canCreateTransaction('broker_admin')).toBe(true);
    });
  });

  describe('canViewTransaction', () => {
    it('all roles can view transactions', () => {
      expect(canViewTransaction('agent')).toBe(true);
      expect(canViewTransaction('coordinator')).toBe(true);
      expect(canViewTransaction('broker_admin')).toBe(true);
    });
  });
});
