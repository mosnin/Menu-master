import * as packagingRepo from '@/lib/repositories/automation-packaging';
import * as onboardingRepo from '@/lib/repositories/automation-onboarding';
import * as economicsRepo from '@/lib/repositories/workflow-economics';

export type OnboardingChecklist = {
  packageInstalled: boolean;
  entitlementsSatisfied: boolean;
  configurationComplete: boolean;
  ownerAssigned: boolean;
  reviewerAssigned: boolean;
  simulationCompleted: boolean;
  validationPassed: boolean;
  releaseReviewComplete: boolean;
  rolloutScopeChosen: boolean;
  activationCompleted: boolean;
};

export type SetupLifecycleState =
  | 'onboarding'
  | 'setup_blocked'
  | 'ready_for_activation'
  | 'pilot_active'
  | 'broadly_adopted'
  | 'underperforming';

export function recommendPackages(input: {
  packages: Array<{ id: string; display_name: string; asset_family: string; risk_classification: string; trust_state: string }>;
  enabledEntitlements: string[];
  profile: {
    lifecycleFocus: string[];
    transactionVolumeBucket: 'low' | 'medium' | 'high';
    teamSizeBucket: 'small' | 'mid' | 'large';
  };
}) {
  return input.packages
    .map((pkg) => {
      const reasons: string[] = [];
      let score = 0;

      if (pkg.asset_family === 'workflow_library') {
        score += 2;
        reasons.push('Includes reusable workflow library assets for fast setup.');
      }
      if (pkg.asset_family === 'template_bundle' && input.profile.lifecycleFocus.includes('listings')) {
        score += 2;
        reasons.push('Aligned to listings-focused lifecycle operations.');
      }
      if (pkg.asset_family === 'playbook_bundle' && input.profile.lifecycleFocus.includes('compliance')) {
        score += 2;
        reasons.push('Supports compliance-focused operating playbooks.');
      }
      if (pkg.risk_classification === 'safe') {
        score += 1;
        reasons.push('Safe-risk package suitable for onboarding pilot.');
      }
      if (pkg.risk_classification === 'high_risk' && !input.enabledEntitlements.includes('risky_automation')) {
        score -= 5;
        reasons.push('Missing risky automation entitlement for this package risk profile.');
      }
      if (input.profile.transactionVolumeBucket === 'high') {
        score += 1;
        reasons.push('High transaction volume benefits from automation leverage.');
      }
      if (input.profile.teamSizeBucket === 'small' && pkg.risk_classification !== 'safe') {
        score -= 1;
        reasons.push('Smaller teams should start with safer package rollout.');
      }

      return {
        packageId: pkg.id,
        packageName: pkg.display_name,
        score,
        reasons,
        blocked: reasons.some((reason) => reason.includes('Missing risky automation entitlement')),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function computeActivationReadiness(checklist: OnboardingChecklist) {
  const missing = Object.entries(checklist)
    .filter(([, complete]) => !complete)
    .map(([key]) => key);

  const state: 'ready' | 'blocked' | 'in_progress' = missing.length === 0
    ? 'ready'
    : missing.includes('entitlementsSatisfied') || missing.includes('ownerAssigned') || missing.includes('reviewerAssigned')
      ? 'blocked'
      : 'in_progress';

  return {
    state,
    missing,
    completionRatio: (10 - missing.length) / 10,
  };
}

export function deriveSetupLifecycleState(input: {
  readinessState: 'in_progress' | 'blocked' | 'ready';
  activationCompleted: boolean;
  lowRoi: boolean;
  officeRolloutCount: number;
}): SetupLifecycleState {
  if (input.readinessState === 'blocked') return 'setup_blocked';
  if (!input.activationCompleted) return input.readinessState === 'ready' ? 'ready_for_activation' : 'onboarding';
  if (input.lowRoi) return 'underperforming';
  return input.officeRolloutCount > 1 ? 'broadly_adopted' : 'pilot_active';
}

const allowedTransitions: Record<SetupLifecycleState, SetupLifecycleState[]> = {
  onboarding: ['setup_blocked', 'ready_for_activation', 'pilot_active'],
  setup_blocked: ['onboarding', 'ready_for_activation'],
  ready_for_activation: ['pilot_active', 'setup_blocked'],
  pilot_active: ['broadly_adopted', 'underperforming', 'setup_blocked'],
  broadly_adopted: ['underperforming'],
  underperforming: ['pilot_active', 'setup_blocked'],
};

export function isValidSetupStateTransition(from: SetupLifecycleState, to: SetupLifecycleState) {
  if (from === to) return true;
  return allowedTransitions[from].includes(to);
}

export function deriveMilestones(input: {
  packageInstalled: boolean;
  simulationCompleted: boolean;
  releaseCompleted: boolean;
  safeAutomatedRunCount: number;
  netMinutesSaved: number;
  officeRolloutCount: number;
}) {
  return [
    { key: 'first_package_installed', achieved: input.packageInstalled },
    { key: 'first_workflow_simulated', achieved: input.simulationCompleted },
    { key: 'first_workflow_released', achieved: input.releaseCompleted },
    { key: 'first_safe_automated_run', achieved: input.safeAutomatedRunCount > 0 },
    { key: 'first_measured_time_saved', achieved: input.netMinutesSaved > 0 },
    { key: 'first_office_rollout', achieved: input.officeRolloutCount > 0 },
  ];
}

export function classifyAdoptionHealth(input: {
  packageInstalled: boolean;
  activationCompleted: boolean;
  runCount: number;
  overrideRate: number;
  simulationCompleted: boolean;
  rolloutStalled: boolean;
  lowRoi: boolean;
  officeRolloutComplete: boolean;
}) {
  const reasons: string[] = [];
  let score = 50;
  let adoptionState: 'onboarding' | 'setup_blocked' | 'ready_for_activation' | 'pilot_active' | 'broadly_adopted' | 'underperforming' = 'onboarding';

  if (!input.packageInstalled) {
    reasons.push('No package installed yet.');
    score -= 20;
    adoptionState = 'onboarding';
  }

  if (input.packageInstalled && !input.activationCompleted && input.simulationCompleted) {
    reasons.push('Simulation complete but activation is not finalized.');
    score -= 10;
    adoptionState = input.rolloutStalled ? 'setup_blocked' : 'ready_for_activation';
  }

  if (input.activationCompleted && input.runCount === 0) {
    reasons.push('Activated but no usage observed yet.');
    score -= 15;
    adoptionState = 'underperforming';
  }

  if (input.overrideRate > 0.35) {
    reasons.push('Repeated override burden observed after activation.');
    score -= 20;
    adoptionState = 'underperforming';
  }

  if (input.lowRoi) {
    reasons.push('Activated automation currently producing low ROI signal.');
    score -= 20;
    adoptionState = 'underperforming';
  }

  if (input.activationCompleted && input.runCount > 0 && !input.lowRoi && input.overrideRate <= 0.2) {
    reasons.push('Healthy active automation usage with acceptable override burden.');
    score += 20;
    adoptionState = input.officeRolloutComplete ? 'broadly_adopted' : 'pilot_active';
  }

  return {
    adoptionState,
    healthScore: Math.max(0, Math.min(100, score)),
    reasons,
    interventions: reasons.map((reason) => ({
      reason,
      action: reason.includes('Simulation complete')
        ? 'Submit release review and complete activation checklist.'
        : reason.includes('No package installed')
          ? 'Install recommended safe starter package in draft mode.'
          : reason.includes('override burden')
            ? 'Run governance and economics review before wider rollout.'
            : reason.includes('no usage observed')
              ? 'Run a guided pilot in a single office scope.'
              : reason.includes('low ROI')
                ? 'Tune automation or downgrade scope until value improves.'
                : 'Continue staged rollout using canary guidance.',
    })),
  };
}

export function getRolloutGuidance(input: {
  readinessState: 'in_progress' | 'blocked' | 'ready';
  activationCompleted: boolean;
  officeRolloutCount: number;
}) {
  if (input.readinessState === 'blocked') {
    return {
      stage: 'single_office_pilot' as const,
      guidanceText: 'Resolve blockers before pilot expansion.',
      nextAction: 'Assign owner/reviewer and satisfy entitlements.',
    };
  }

  if (!input.activationCompleted) {
    return {
      stage: 'small_team_canary' as const,
      guidanceText: 'Run a small team canary after simulation and release readiness checks.',
      nextAction: 'Complete release review and activate for one team.',
    };
  }

  if (input.officeRolloutCount <= 1) {
    return {
      stage: 'staged_office_rollout' as const,
      guidanceText: 'Pilot is active; expand rollout office-by-office with monitoring.',
      nextAction: 'Add next office and monitor override + ROI signals.',
    };
  }

  return {
    stage: 'org_wide_rollout' as const,
    guidanceText: 'Adoption is healthy; proceed to org-wide rollout under governance controls.',
    nextAction: 'Promote standardized package to default library set.',
  };
}

export async function getOnboardingDashboard(orgId: string) {
  const [packages, entitlements, setupStates, checklists, blockers, milestones, health, guidance, roi] = await Promise.all([
    packagingRepo.listPackages(orgId),
    packagingRepo.listEntitlements(orgId),
    onboardingRepo.listSetupStates(orgId),
    onboardingRepo.listChecklists(orgId),
    onboardingRepo.listBlockers(orgId),
    onboardingRepo.listMilestones(orgId),
    onboardingRepo.listHealthSummaries(orgId),
    onboardingRepo.listRolloutGuidance(orgId),
    economicsRepo.listRoiSummaries(orgId),
  ]);

  const recommendations = recommendPackages({
    packages,
    enabledEntitlements: entitlements.filter((entry) => entry.enabled).map((entry) => entry.feature_key),
    profile: {
      lifecycleFocus: ['listings', 'compliance'],
      transactionVolumeBucket: 'medium',
      teamSizeBucket: 'mid',
    },
  }).slice(0, 8);

  return {
    summary: {
      setupStates: setupStates.length,
      openBlockers: blockers.length,
      readyChecklists: checklists.filter((item) => item.checklist_state === 'ready' || item.checklist_state === 'completed').length,
      achievedMilestones: milestones.filter((item) => item.milestone_state === 'achieved').length,
      underperforming: health.filter((item) => item.adoption_state === 'underperforming').length,
      roiTrackedWorkflows: roi.length,
    },
    recommendations,
    setupStates,
    checklists,
    blockers,
    milestones,
    health,
    guidance,
  };
}
