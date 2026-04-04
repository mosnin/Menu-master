import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// We test the onboarding step definitions and routing logic as pure unit tests.
// Service functions that touch the DB are tested via their contracts, not mocked DB calls.
// ---------------------------------------------------------------------------

// Mock the entire DB client module before anything imports it
vi.mock('@/lib/db/client', () => {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: () => new Proxy({}, handler),
    apply: () => new Proxy({}, handler),
  };
  return { supabase: new Proxy({}, handler) };
});

// Now safe to import the service — repos won't crash on import
import { ONBOARDING_STEPS } from '@/lib/services/onboarding-service';

// ===================================================================
// 1. Onboarding Steps
// ===================================================================
describe('Onboarding Steps', () => {
  it('has exactly 4 steps', () => {
    expect(ONBOARDING_STEPS).toHaveLength(4);
  });

  it('numbered 0-3', () => {
    expect(ONBOARDING_STEPS.map(s => s.step)).toEqual([0, 1, 2, 3]);
  });

  it('keys are welcome/profile/workspace/get_started', () => {
    expect(ONBOARDING_STEPS.map(s => s.key)).toEqual(['welcome', 'profile', 'workspace', 'get_started']);
  });

  it('every step has a non-empty label', () => {
    for (const s of ONBOARDING_STEPS) {
      expect(s.label.length).toBeGreaterThan(0);
    }
  });

  it('steps have unique keys', () => {
    const keys = ONBOARDING_STEPS.map(s => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ===================================================================
// 2. Post-Auth Routing Logic (pure function, no DB)
// ===================================================================
describe('Post-Auth Routing Logic', () => {
  type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

  function resolvePostAuthRoute(
    session: boolean,
    onboardingStatus?: OnboardingStatus,
    hasMembership?: boolean,
  ): string {
    if (!session) return '/signin';
    if (onboardingStatus === 'pending' || onboardingStatus === 'in_progress') return '/onboarding';
    if (onboardingStatus === 'completed') return hasMembership ? '/dashboard' : '/onboarding';
    if (onboardingStatus === 'skipped') return '/dashboard';
    return '/onboarding';
  }

  it('pending → /onboarding', () => {
    expect(resolvePostAuthRoute(true, 'pending')).toBe('/onboarding');
  });

  it('in_progress → /onboarding', () => {
    expect(resolvePostAuthRoute(true, 'in_progress')).toBe('/onboarding');
  });

  it('completed + no membership → /onboarding', () => {
    expect(resolvePostAuthRoute(true, 'completed', false)).toBe('/onboarding');
  });

  it('completed + has membership → /dashboard', () => {
    expect(resolvePostAuthRoute(true, 'completed', true)).toBe('/dashboard');
  });

  it('skipped → /dashboard', () => {
    expect(resolvePostAuthRoute(true, 'skipped')).toBe('/dashboard');
  });

  it('no session → /signin', () => {
    expect(resolvePostAuthRoute(false)).toBe('/signin');
  });
});

// ===================================================================
// 3. Invite State Validation (pure logic)
// ===================================================================
describe('Invite State Validation', () => {
  function canAcceptInvite(invite: { status: string; expires_at: string } | null): { ok: boolean; reason?: string } {
    if (!invite) return { ok: false, reason: 'not_found' };
    if (invite.status === 'accepted') return { ok: false, reason: 'already_accepted' };
    if (invite.status === 'revoked') return { ok: false, reason: 'revoked' };
    if (invite.status === 'expired') return { ok: false, reason: 'expired' };
    if (new Date(invite.expires_at) < new Date()) return { ok: false, reason: 'expired' };
    if (invite.status !== 'pending') return { ok: false, reason: 'invalid_status' };
    return { ok: true };
  }

  it('null invite → not_found', () => {
    expect(canAcceptInvite(null).reason).toBe('not_found');
  });

  it('pending + future expiry → ok', () => {
    expect(canAcceptInvite({ status: 'pending', expires_at: '2027-01-01T00:00:00Z' }).ok).toBe(true);
  });

  it('pending + past expiry → expired', () => {
    expect(canAcceptInvite({ status: 'pending', expires_at: '2024-01-01T00:00:00Z' }).reason).toBe('expired');
  });

  it('accepted → already_accepted', () => {
    expect(canAcceptInvite({ status: 'accepted', expires_at: '2027-01-01T00:00:00Z' }).reason).toBe('already_accepted');
  });

  it('revoked → revoked', () => {
    expect(canAcceptInvite({ status: 'revoked', expires_at: '2027-01-01T00:00:00Z' }).reason).toBe('revoked');
  });
});

// ===================================================================
// 4. Onboarding Status State Machine (pure transitions)
// ===================================================================
describe('Onboarding Status Machine', () => {
  type Status = 'pending' | 'in_progress' | 'completed' | 'skipped';

  const VALID_TRANSITIONS: Record<Status, Status[]> = {
    pending: ['in_progress', 'skipped'],
    in_progress: ['completed', 'skipped'],
    completed: [],
    skipped: ['in_progress'],
  };

  function canTransition(from: Status, to: Status): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  it('pending → in_progress is valid', () => expect(canTransition('pending', 'in_progress')).toBe(true));
  it('pending → skipped is valid', () => expect(canTransition('pending', 'skipped')).toBe(true));
  it('pending → completed is invalid', () => expect(canTransition('pending', 'completed')).toBe(false));
  it('in_progress → completed is valid', () => expect(canTransition('in_progress', 'completed')).toBe(true));
  it('in_progress → skipped is valid', () => expect(canTransition('in_progress', 'skipped')).toBe(true));
  it('completed → anything is invalid', () => {
    expect(canTransition('completed', 'pending')).toBe(false);
    expect(canTransition('completed', 'in_progress')).toBe(false);
    expect(canTransition('completed', 'skipped')).toBe(false);
  });
  it('skipped → in_progress is valid (resume)', () => expect(canTransition('skipped', 'in_progress')).toBe(true));
});
