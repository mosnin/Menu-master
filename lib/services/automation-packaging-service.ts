import * as packagingRepo from '@/lib/repositories/automation-packaging';

export type CapabilityKey =
  | 'advanced_authoring'
  | 'nl_workflow_creation'
  | 'simulation'
  | 'template_libraries'
  | 'playbook_generation'
  | 'risky_automation'
  | 'advanced_governance'
  | 'advanced_roi';

export type BundleInstallMode = 'draft_only' | 'template_only' | 'library_copy';

export function hasEntitlement(entitlements: Array<{ feature_key: string; enabled: boolean }>, featureKey: CapabilityKey) {
  return entitlements.some((entitlement) => entitlement.feature_key === featureKey && entitlement.enabled);
}

export function resolveFlagVariant(flags: Array<{ feature_key: string; flag_variant: 'on' | 'off' | 'beta'; scope_type?: string | null }>, featureKey: CapabilityKey) {
  const scoped = flags.find((flag) => flag.feature_key === featureKey && flag.scope_type !== 'global');
  if (scoped) return scoped.flag_variant;
  const global = flags.find((flag) => flag.feature_key === featureKey);
  return global?.flag_variant ?? 'on';
}

export function isCapabilityEnabled(input: {
  featureKey: CapabilityKey;
  planTier: 'starter' | 'growth' | 'enterprise';
  entitlements: Array<{ feature_key: string; enabled: boolean }>;
  flags: Array<{ feature_key: string; flag_variant: 'on' | 'off' | 'beta'; scope_type?: string | null }>;
  betaAccess?: boolean;
}) {
  const entitled = hasEntitlement(input.entitlements, input.featureKey);
  const variant = resolveFlagVariant(input.flags, input.featureKey);

  if (!entitled) {
    return { enabled: false, reason: 'missing_entitlement', variant } as const;
  }

  if (variant === 'off') {
    return { enabled: false, reason: 'feature_flag_off', variant } as const;
  }

  if (variant === 'beta' && !input.betaAccess && input.planTier !== 'enterprise') {
    return { enabled: false, reason: 'beta_not_enabled_for_scope', variant } as const;
  }

  return { enabled: true, reason: null, variant } as const;
}

export function runCompatibilityChecks(input: {
  requiredTools: string[];
  availableTools: string[];
  requiredNodes: string[];
  deprecatedNodes: string[];
  riskyActions: string[];
  policyAllowedRisk: 'safe' | 'medium_risk' | 'high_risk';
  requiredEntitlements: string[];
  orgEntitlements: string[];
  requiresSimulationEvidence: boolean;
  orgHasSimulationEvidence: boolean;
}) {
  const missingTools = input.requiredTools.filter((tool) => !input.availableTools.includes(tool));
  const deprecated = input.requiredNodes.filter((node) => input.deprecatedNodes.includes(node));
  const unsupportedRiskyActions = input.policyAllowedRisk === 'safe' ? input.riskyActions : [];
  const missingEntitlements = input.requiredEntitlements.filter((entitlement) => !input.orgEntitlements.includes(entitlement));

  const missingEvidence = input.requiresSimulationEvidence && !input.orgHasSimulationEvidence
    ? ['simulation_evidence_required_by_policy']
    : [];

  const issues = [
    ...missingTools.map((value) => `missing_tool:${value}`),
    ...deprecated.map((value) => `deprecated_node:${value}`),
    ...unsupportedRiskyActions.map((value) => `unsupported_risky_action:${value}`),
    ...missingEntitlements.map((value) => `missing_entitlement:${value}`),
    ...missingEvidence,
  ];

  const compatibilityState: 'pass' | 'warn' | 'fail' =
    missingTools.length > 0 || missingEntitlements.length > 0 || unsupportedRiskyActions.length > 0 || missingEvidence.length > 0
      ? 'fail'
      : deprecated.length > 0
        ? 'warn'
        : 'pass';

  const remediation = issues.map((issue) => ({
    issue,
    action: issue.includes('missing_tool')
      ? 'Install or map required tool before import.'
      : issue.includes('deprecated_node')
        ? 'Replace deprecated nodes with supported versions.'
        : issue.includes('missing_entitlement')
          ? 'Grant entitlement or downgrade package feature usage.'
          : issue.includes('simulation_evidence')
            ? 'Run required simulation and attach evidence before install.'
            : 'Adjust policy/risk scope or remove risky action.',
  }));

  return {
    compatibilityState,
    missingTools,
    deprecatedNodes: deprecated,
    unsupportedRiskyActions,
    missingEntitlements,
    issues,
    remediation,
  };
}

export function sanitizeBundleForExport(bundle: Record<string, unknown>) {
  const clone = JSON.parse(JSON.stringify(bundle)) as Record<string, unknown>;
  delete clone.secrets;
  delete clone.environment;
  delete clone.complianceEvidence;
  return clone;
}

export function parseImportBundle(rawBundle: string): {
  valid: boolean;
  error?: string;
  manifest?: Record<string, unknown>;
} {
  try {
    const parsed = JSON.parse(rawBundle) as Record<string, unknown>;
    if (!parsed.packageKey || !parsed.version || !Array.isArray(parsed.assets)) {
      return { valid: false, error: 'Bundle missing required manifest fields (packageKey/version/assets).' };
    }
    return { valid: true, manifest: parsed };
  } catch {
    return { valid: false, error: 'Bundle is not valid JSON.' };
  }
}

export async function getPackagingOverview(orgId: string) {
  const [packages, versions, imports, exports, installations, entitlements, flags] = await Promise.all([
    packagingRepo.listPackages(orgId),
    packagingRepo.listPackageVersions(orgId),
    packagingRepo.listImports(orgId),
    packagingRepo.listExports(orgId),
    packagingRepo.listInstallations(orgId),
    packagingRepo.listEntitlements(orgId),
    packagingRepo.listFeatureFlags(orgId),
  ]);

  return {
    summary: {
      totalPackages: packages.length,
      publishedVersions: versions.filter((version) => version.status === 'published').length,
      blockedImports: imports.filter((entry) => entry.install_state === 'blocked').length,
      exportEvents: exports.length,
      activeInstallations: installations.filter((entry) => entry.status === 'active').length,
    },
    packages,
    versions,
    imports,
    exports,
    installations,
    entitlements,
    flags,
  };
}

export async function recordCompatibilityReport(input: {
  orgId: string;
  packageVersionId: string;
  actorUserId: string;
  report: ReturnType<typeof runCompatibilityChecks>;
}) {
  return packagingRepo.createCompatibilityReport({
    organization_id: input.orgId,
    package_version_id: input.packageVersionId,
    checker_version: 'v1',
    compatibility_state: input.report.compatibilityState,
    missing_tools: input.report.missingTools,
    deprecated_nodes: input.report.deprecatedNodes,
    unsupported_risky_actions: input.report.unsupportedRiskyActions,
    missing_entitlements: input.report.missingEntitlements,
    remediation_json: input.report.remediation,
    report_json: { issues: input.report.issues },
    created_by_user_id: input.actorUserId,
  });
}

export async function exportPackageBundle(input: {
  orgId: string;
  packageVersionId: string;
  actorUserId: string;
  bundle: Record<string, unknown>;
  requiresGovernanceApproval: boolean;
  governanceApproved: boolean;
}) {
  const sanitized = sanitizeBundleForExport(input.bundle);
  await packagingRepo.createExportEvent({
    organization_id: input.orgId,
    package_version_id: input.packageVersionId,
    exported_by_user_id: input.actorUserId,
    governance_required: input.requiresGovernanceApproval,
    governance_approved: input.governanceApproved,
    metadata_json: {
      bundleSize: JSON.stringify(sanitized).length,
      includedAssets: Array.isArray(sanitized.assets) ? sanitized.assets.length : 0,
    },
  });
  return sanitized;
}

export async function importBundle(input: {
  orgId: string;
  actorUserId: string;
  sourceType: 'upload' | 'external_org' | 'system';
  sourceOrgId?: string;
  installMode: BundleInstallMode;
  trustState: 'trusted' | 'untrusted' | 'restricted';
  packageKey: string;
  manifest: Record<string, unknown>;
  compatibility: ReturnType<typeof runCompatibilityChecks>;
}) {
  const blocked = input.compatibility.compatibilityState === 'fail' || input.trustState === 'restricted';
  const packageVersionId = String(input.manifest.packageVersionId ?? input.manifest.versionId ?? '');
  const canPersistInstallations = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(packageVersionId);

  const importEvent = await packagingRepo.createImportEvent({
    organization_id: input.orgId,
    source_type: input.sourceType,
    source_org_id: input.sourceOrgId ?? null,
    package_key: input.packageKey,
    requested_mode: input.installMode,
    trust_state: input.trustState,
    compatibility_state: input.compatibility.compatibilityState,
    install_state: blocked ? 'blocked' : 'installed',
    blocking_reasons: blocked ? input.compatibility.issues : [],
    import_manifest_json: input.manifest,
    requested_by_user_id: input.actorUserId,
    reviewed_by_user_id: null,
  });

  if (!blocked && canPersistInstallations && Array.isArray(input.manifest.assets)) {
    for (const asset of input.manifest.assets as Array<{ type?: string; ref?: string }>) {
      if (!asset.type || !asset.ref) continue;
      if (!['workflow_template', 'playbook', 'workflow_graph'].includes(asset.type)) continue;

      await packagingRepo.createInstallation({
        organization_id: input.orgId,
        package_version_id: packageVersionId,
        import_id: importEvent.id,
        installation_mode: input.installMode,
        installed_asset_type: asset.type as 'workflow_template' | 'playbook' | 'workflow_graph',
        installed_asset_ref: asset.ref,
        installed_by_user_id: input.actorUserId,
      });
    }
  }

  return {
    blocked,
    importEvent,
  };
}
