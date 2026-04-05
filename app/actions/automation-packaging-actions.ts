'use server';

import { requireAuth, requireOrgMembership, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as packagingRepo from '@/lib/repositories/automation-packaging';
import {
  getPackagingOverview,
  importBundle,
  isCapabilityEnabled,
  parseImportBundle,
  recordCompatibilityReport,
  runCompatibilityChecks,
  type BundleInstallMode,
  type CapabilityKey,
} from '@/lib/services/automation-packaging-service';

const AVAILABLE_TOOLS = ['email.send', 'document.generate', 'approval.request', 'task.create'];
const DEPRECATED_NODES = ['legacy_wait', 'legacy_assignment'];

export async function getAutomationPackagingOverviewAction(orgId: string) {
  await requireAuth();
  await requireOrgMembership(orgId);

  try {
    const overview = await getPackagingOverview(orgId);
    return { overview };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load automation packaging overview' };
  }
}

export async function checkAutomationCapabilityAction(data: {
  orgId: string;
  featureKey: CapabilityKey;
  planTier: 'starter' | 'growth' | 'enterprise';
  betaAccess?: boolean;
}) {
  await requireAuth();
  await requireOrgMembership(data.orgId);

  try {
    const [entitlements, flags] = await Promise.all([
      packagingRepo.listEntitlements(data.orgId),
      packagingRepo.listFeatureFlags(data.orgId),
    ]);

    return {
      result: isCapabilityEnabled({
        featureKey: data.featureKey,
        planTier: data.planTier,
        entitlements,
        flags,
        betaAccess: data.betaAccess,
      }),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed capability check' };
  }
}

export async function exportAutomationPackageAction(data: {
  orgId: string;
  packageVersionId: string;
}) {
  await requireAuth();

  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await requireRole(data.orgId, ['broker_admin']);

    const versions = await packagingRepo.listPackageVersions(data.orgId);
    const version = versions.find((entry) => entry.id === data.packageVersionId);
    if (!version) return { error: 'Package version not found' };

    const assets = await packagingRepo.listPackageAssets(data.orgId, data.packageVersionId);
    const risky = assets.some((asset) => asset.policy_sensitivity !== 'safe');

    const bundle = {
      packageKey: version.package_id,
      version: version.semver,
      packageVersionId: version.id,
      entitlementRequirements: version.entitlement_requirements_json,
      compatibilityNotes: version.compatibility_notes,
      assets: assets.map((asset) => ({
        type: asset.asset_type,
        ref: asset.asset_ref,
        title: asset.title,
        payload: asset.payload_json,
        policySensitivity: asset.policy_sensitivity,
        validationStatus: asset.validation_status,
      })),
      secrets: { shouldNotExport: true },
    };

    const { exportPackageBundle } = await import('@/lib/services/automation-packaging-service');
    const sanitized = await exportPackageBundle({
      orgId: data.orgId,
      packageVersionId: data.packageVersionId,
      actorUserId: profile.id,
      bundle,
      requiresGovernanceApproval: risky,
      governanceApproved: !risky,
    });

    return { bundle: sanitized, governanceReviewRequired: risky };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to export package' };
  }
}

export async function importAutomationBundleAction(data: {
  orgId: string;
  installMode: BundleInstallMode;
  sourceType: 'upload' | 'external_org' | 'system';
  sourceOrgId?: string;
  trustState: 'trusted' | 'untrusted' | 'restricted';
  rawBundle: string;
}) {
  await requireAuth();

  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await requireRole(data.orgId, ['broker_admin']);

    const parsed = parseImportBundle(data.rawBundle);
    if (!parsed.valid || !parsed.manifest) {
      return { error: parsed.error ?? 'Invalid bundle.' };
    }

    const requiredTools = Array.isArray(parsed.manifest.requiredTools) ? parsed.manifest.requiredTools.map(String) : [];
    const requiredNodes = Array.isArray(parsed.manifest.requiredNodes) ? parsed.manifest.requiredNodes.map(String) : [];
    const riskyActions = Array.isArray(parsed.manifest.riskyActions) ? parsed.manifest.riskyActions.map(String) : [];
    const requiredEntitlements = Array.isArray(parsed.manifest.entitlementRequirements)
      ? parsed.manifest.entitlementRequirements.map(String)
      : [];

    const entitlements = await packagingRepo.listEntitlements(data.orgId);
    const compatibility = runCompatibilityChecks({
      requiredTools,
      availableTools: AVAILABLE_TOOLS,
      requiredNodes,
      deprecatedNodes: DEPRECATED_NODES,
      riskyActions,
      policyAllowedRisk: data.trustState === 'trusted' ? 'high_risk' : 'safe',
      requiredEntitlements,
      orgEntitlements: entitlements.filter((entry) => entry.enabled).map((entry) => entry.feature_key),
      requiresSimulationEvidence: Boolean(parsed.manifest.requiresSimulationEvidence),
      orgHasSimulationEvidence: false,
    });

    if (parsed.manifest.packageVersionId) {
      await recordCompatibilityReport({
        orgId: data.orgId,
        packageVersionId: String(parsed.manifest.packageVersionId),
        actorUserId: profile.id,
        report: compatibility,
      });
    }

    const result = await importBundle({
      orgId: data.orgId,
      actorUserId: profile.id,
      sourceType: data.sourceType,
      sourceOrgId: data.sourceOrgId,
      installMode: data.installMode,
      trustState: data.trustState,
      packageKey: String(parsed.manifest.packageKey),
      manifest: parsed.manifest,
      compatibility,
    });

    return {
      blocked: result.blocked,
      importId: result.importEvent.id,
      compatibility,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to import package bundle' };
  }
}
