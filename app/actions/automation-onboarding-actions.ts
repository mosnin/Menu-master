'use server';

import { requireAuth, requireOrgMembership, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as onboardingRepo from '@/lib/repositories/automation-onboarding';
import {
  classifyAdoptionHealth,
  computeActivationReadiness,
  deriveSetupLifecycleState,
  deriveMilestones,
  getOnboardingDashboard,
  getRolloutGuidance,
  isValidSetupStateTransition,
  type OnboardingChecklist,
} from '@/lib/services/automation-onboarding-service';

export async function getAutomationOnboardingDashboardAction(orgId: string) {
  await requireAuth();
  await requireOrgMembership(orgId);

  try {
    const dashboard = await getOnboardingDashboard(orgId);
    return { dashboard };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load onboarding dashboard' };
  }
}

export async function createAutomationOnboardingSessionAction(data: {
  orgId: string;
  sessionName: string;
  scopeType: 'organization' | 'office' | 'team';
  scopeRef: string;
  setupMode: 'draft_only' | 'template_only' | 'library_copy';
  packageVersionId?: string;
  checklist: OnboardingChecklist;
}) {
  await requireAuth();

  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await requireRole(data.orgId, ['broker_admin']);

    const session = await onboardingRepo.createOnboardingSession({
      organization_id: data.orgId,
      office_id: data.scopeType === 'office' ? data.scopeRef : null,
      team_id: data.scopeType === 'team' ? data.scopeRef : null,
      session_name: data.sessionName,
      created_by_user_id: profile.id,
    });

    const readiness = computeActivationReadiness(data.checklist);

    const setupState = await onboardingRepo.createSetupState({
      organization_id: data.orgId,
      onboarding_session_id: session.id,
      package_version_id: data.packageVersionId ?? null,
      setup_mode: data.setupMode,
      scope_type: data.scopeType,
      scope_ref: data.scopeRef,
      status: readiness.state === 'blocked' ? 'setup_blocked' : readiness.state === 'ready' ? 'ready_for_activation' : 'onboarding',
      checklist_json: data.checklist,
      blockers_json: readiness.missing.map((missing) => ({ blocker: missing })),
      created_by_user_id: profile.id,
    });

    const checklistItems = Object.entries(data.checklist).map(([key, value]) => ({ key, complete: value }));
    await onboardingRepo.upsertActivationChecklist({
      organization_id: data.orgId,
      setup_state_id: setupState.id,
      package_version_id: data.packageVersionId ?? null,
      checklist_state: readiness.state,
      items_json: checklistItems,
      missing_items_json: readiness.missing,
      updated_by_user_id: profile.id,
    });

    if (readiness.missing.length > 0) {
      for (const missing of readiness.missing) {
        await onboardingRepo.createBlocker({
          organization_id: data.orgId,
          setup_state_id: setupState.id,
          blocker_type: missing,
          severity: missing.includes('entitlements') || missing.includes('reviewer') ? 'critical' : 'major',
          details: `Checklist requirement missing: ${missing}`,
          suggested_action: 'Complete onboarding setup wizard step before activation.',
        });
      }
    }

    await onboardingRepo.createActivationEvent({
      organization_id: data.orgId,
      setup_state_id: setupState.id,
      event_type: 'setup_started',
      actor_user_id: profile.id,
      metadata_json: {
        scopeType: data.scopeType,
        setupMode: data.setupMode,
      },
    });

    return { setupStateId: setupState.id, readiness };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create onboarding session' };
  }
}

export async function updateAutomationReadinessAction(data: {
  orgId: string;
  setupStateId: string;
  checklist: OnboardingChecklist;
  signals: {
    packageInstalled: boolean;
    simulationCompleted: boolean;
    releaseCompleted: boolean;
    safeAutomatedRunCount: number;
    netMinutesSaved: number;
    officeRolloutCount: number;
    runCount: number;
    overrideRate: number;
    rolloutStalled: boolean;
    lowRoi: boolean;
    activationCompleted: boolean;
  };
}) {
  await requireAuth();

  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await requireRole(data.orgId, ['broker_admin']);

    const currentSetup = await onboardingRepo.findSetupStateById(data.orgId, data.setupStateId);
    if (!currentSetup) return { error: 'Setup state not found' };

    const readiness = computeActivationReadiness(data.checklist);
    const checklistItems = Object.entries(data.checklist).map(([key, value]) => ({ key, complete: value }));
    const nextSetupState = deriveSetupLifecycleState({
      readinessState: readiness.state,
      activationCompleted: data.signals.activationCompleted,
      lowRoi: data.signals.lowRoi,
      officeRolloutCount: data.signals.officeRolloutCount,
    });

    if (!isValidSetupStateTransition(currentSetup.status, nextSetupState)) {
      return { error: `Invalid setup state transition from ${currentSetup.status} to ${nextSetupState}` };
    }

    await onboardingRepo.upsertActivationChecklist({
      organization_id: data.orgId,
      setup_state_id: data.setupStateId,
      checklist_state: readiness.state,
      items_json: checklistItems,
      missing_items_json: readiness.missing,
      updated_by_user_id: profile.id,
    });

    await onboardingRepo.updateSetupStateStatus({
      organization_id: data.orgId,
      id: data.setupStateId,
      status: nextSetupState,
      checklist_json: data.checklist,
      blockers_json: readiness.missing.map((missing) => ({ blocker: missing })),
    });

    const milestones = deriveMilestones(data.signals);
    for (const milestone of milestones) {
      await onboardingRepo.upsertMilestone({
        organization_id: data.orgId,
        setup_state_id: data.setupStateId,
        milestone_key: milestone.key,
        milestone_state: milestone.achieved ? 'achieved' : 'pending',
        achieved_at: milestone.achieved ? new Date().toISOString() : null,
        signal_json: data.signals,
      });
    }

    const health = classifyAdoptionHealth({
      packageInstalled: data.signals.packageInstalled,
      activationCompleted: data.signals.activationCompleted,
      runCount: data.signals.runCount,
      overrideRate: data.signals.overrideRate,
      simulationCompleted: data.signals.simulationCompleted,
      rolloutStalled: data.signals.rolloutStalled,
      lowRoi: data.signals.lowRoi,
      officeRolloutComplete: data.signals.officeRolloutCount > 1,
    });

    await onboardingRepo.createHealthSummary({
      organization_id: data.orgId,
      setup_state_id: data.setupStateId,
      adoption_state: health.adoptionState,
      health_score: health.healthScore,
      reasons: health.reasons,
      recommendations_json: health.interventions,
    });

    const guidance = getRolloutGuidance({
      readinessState: readiness.state,
      activationCompleted: data.signals.activationCompleted,
      officeRolloutCount: data.signals.officeRolloutCount,
    });

    await onboardingRepo.createRolloutGuidance({
      organization_id: data.orgId,
      setup_state_id: data.setupStateId,
      rollout_stage: guidance.stage,
      guidance_text: guidance.guidanceText,
      next_action: guidance.nextAction,
      created_by_user_id: profile.id,
    });

    await onboardingRepo.createActivationEvent({
      organization_id: data.orgId,
      setup_state_id: data.setupStateId,
      event_type: readiness.state === 'ready' ? 'ready_for_activation' : 'checklist_updated',
      actor_user_id: profile.id,
      metadata_json: {
        readiness: readiness.state,
        missing: readiness.missing,
      },
    });

    return { readiness, health, guidance };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update onboarding readiness' };
  }
}

export async function createAutomationSuccessNoteAction(data: {
  orgId: string;
  setupStateId?: string;
  noteType: 'support_note' | 'intervention' | 'handoff';
  visibility: 'internal' | 'customer_visible';
  noteText: string;
}) {
  await requireAuth();

  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await requireRole(data.orgId, ['broker_admin']);

    const note = await onboardingRepo.createSuccessNote({
      organization_id: data.orgId,
      setup_state_id: data.setupStateId ?? null,
      note_type: data.noteType,
      visibility: data.visibility,
      note_text: data.noteText,
      created_by_user_id: profile.id,
    });

    return { note };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create success note' };
  }
}

export async function getAutomationSuccessViewAction(orgId: string) {
  await requireAuth();
  await requireRole(orgId, ['broker_admin']);

  try {
    const [setupStates, blockers, health, notes] = await Promise.all([
      onboardingRepo.listSetupStates(orgId),
      onboardingRepo.listBlockers(orgId),
      onboardingRepo.listHealthSummaries(orgId),
      onboardingRepo.listSuccessNotes(orgId),
    ]);

    return {
      view: {
        setupStates,
        blockers,
        health,
        notes,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load success view' };
  }
}
