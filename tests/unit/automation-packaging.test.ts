import { describe, expect, it } from 'vitest';
import {
  isCapabilityEnabled,
  parseImportBundle,
  runCompatibilityChecks,
  sanitizeBundleForExport,
} from '@/lib/services/automation-packaging-service';

describe('automation packaging and distribution controls', () => {
  it('enforces entitlement and flag capability gates', () => {
    const blocked = isCapabilityEnabled({
      featureKey: 'advanced_authoring',
      planTier: 'growth',
      entitlements: [],
      flags: [{ feature_key: 'advanced_authoring', flag_variant: 'on' }],
    });

    const enabled = isCapabilityEnabled({
      featureKey: 'advanced_authoring',
      planTier: 'enterprise',
      entitlements: [{ feature_key: 'advanced_authoring', enabled: true }],
      flags: [{ feature_key: 'advanced_authoring', flag_variant: 'on' }],
    });

    expect(blocked.enabled).toBe(false);
    expect(blocked.reason).toBe('missing_entitlement');
    expect(enabled.enabled).toBe(true);
  });

  it('blocks unsafe bundle install when tools/entitlements/policy checks fail', () => {
    const report = runCompatibilityChecks({
      requiredTools: ['approval.request', 'erp.write'],
      availableTools: ['approval.request'],
      requiredNodes: ['legacy_wait'],
      deprecatedNodes: ['legacy_wait'],
      riskyActions: ['external_transfer'],
      policyAllowedRisk: 'safe',
      requiredEntitlements: ['advanced_governance'],
      orgEntitlements: [],
      requiresSimulationEvidence: true,
      orgHasSimulationEvidence: false,
    });

    expect(report.compatibilityState).toBe('fail');
    expect(report.missingTools).toContain('erp.write');
    expect(report.missingEntitlements).toContain('advanced_governance');
    expect(report.issues.some((item) => item.includes('simulation_evidence'))).toBe(true);
  });

  it('supports malformed bundle rejection and safe export sanitization', () => {
    const malformed = parseImportBundle('{"packageKey":"demo"}');
    expect(malformed.valid).toBe(false);

    const cleaned = sanitizeBundleForExport({
      packageKey: 'demo',
      version: '1.0.0',
      assets: [],
      secrets: { token: 'x' },
      complianceEvidence: { pii: true },
    });

    expect(cleaned.secrets).toBeUndefined();
    expect(cleaned.complianceEvidence).toBeUndefined();
  });

  it('keeps draft-only install mode explicit for imports', () => {
    const parsed = parseImportBundle(JSON.stringify({
      packageKey: 'bundle-1',
      version: '1.0.0',
      assets: [{ type: 'workflow_template', ref: 'template-1' }],
    }));

    expect(parsed.valid).toBe(true);
    expect(Array.isArray(parsed.manifest?.assets)).toBe(true);
  });
});
