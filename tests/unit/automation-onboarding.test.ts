import { describe, expect, it } from 'vitest';
import {
  classifyAdoptionHealth,
  computeActivationReadiness,
  deriveSetupLifecycleState,
  deriveMilestones,
  getRolloutGuidance,
  isValidSetupStateTransition,
  recommendPackages,
} from '@/lib/services/automation-onboarding-service';

describe('automation onboarding and managed success', () => {
  it('recommends packages with explainable reasons and entitlement blocking', () => {
    const recommendations = recommendPackages({
      packages: [
        { id: 'safe-lib', display_name: 'Safe Starter Library', asset_family: 'workflow_library', risk_classification: 'safe', trust_state: 'trusted' },
        { id: 'risky-pack', display_name: 'Risky Pack', asset_family: 'playbook_bundle', risk_classification: 'high_risk', trust_state: 'trusted' },
      ],
      enabledEntitlements: ['template_libraries'],
      profile: {
        lifecycleFocus: ['compliance'],
        transactionVolumeBucket: 'high',
        teamSizeBucket: 'small',
      },
    });

    expect(recommendations[0]?.packageId).toBe('safe-lib');
    expect(recommendations.find((item) => item.packageId === 'risky-pack')?.blocked).toBe(true);
  });

  it('computes readiness and missing checklist items deterministically', () => {
    const readiness = computeActivationReadiness({
      packageInstalled: true,
      entitlementsSatisfied: false,
      configurationComplete: true,
      ownerAssigned: true,
      reviewerAssigned: false,
      simulationCompleted: true,
      validationPassed: true,
      releaseReviewComplete: false,
      rolloutScopeChosen: true,
      activationCompleted: false,
    });

    expect(readiness.state).toBe('blocked');
    expect(readiness.missing).toContain('entitlementsSatisfied');
    expect(readiness.missing).toContain('reviewerAssigned');
  });

  it('tracks first-value milestones from real setup and usage signals', () => {
    const milestones = deriveMilestones({
      packageInstalled: true,
      simulationCompleted: true,
      releaseCompleted: true,
      safeAutomatedRunCount: 2,
      netMinutesSaved: 12,
      officeRolloutCount: 0,
    });

    expect(milestones.filter((m) => m.achieved).length).toBe(5);
    expect(milestones.find((m) => m.key === 'first_office_rollout')?.achieved).toBe(false);
  });

  it('classifies underperforming adoption and returns intervention cues', () => {
    const health = classifyAdoptionHealth({
      packageInstalled: true,
      activationCompleted: true,
      runCount: 4,
      overrideRate: 0.5,
      simulationCompleted: true,
      rolloutStalled: true,
      lowRoi: true,
      officeRolloutComplete: false,
    });

    expect(health.adoptionState).toBe('underperforming');
    expect(health.interventions.length).toBeGreaterThan(0);
  });

  it('returns staged rollout guidance based on readiness and activation state', () => {
    const blocked = getRolloutGuidance({ readinessState: 'blocked', activationCompleted: false, officeRolloutCount: 0 });
    const orgWide = getRolloutGuidance({ readinessState: 'ready', activationCompleted: true, officeRolloutCount: 3 });

    expect(blocked.stage).toBe('single_office_pilot');
    expect(orgWide.stage).toBe('org_wide_rollout');
  });

  it('hardens setup lifecycle transitions for pilot safety', () => {
    const next = deriveSetupLifecycleState({
      readinessState: 'ready',
      activationCompleted: true,
      lowRoi: false,
      officeRolloutCount: 0,
    });

    expect(next).toBe('pilot_active');
    expect(isValidSetupStateTransition('ready_for_activation', 'pilot_active')).toBe(true);
    expect(isValidSetupStateTransition('setup_blocked', 'broadly_adopted')).toBe(false);
  });
});
