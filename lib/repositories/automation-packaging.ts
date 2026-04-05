import { supabase } from '@/lib/db/client';

export async function listEntitlements(orgId: string) {
  const { data, error } = await supabase
    .from('automation_entitlements')
    .select('*')
    .eq('organization_id', orgId)
    .eq('enabled', true);
  if (error) throw error;
  return data ?? [];
}

export async function listFeatureFlags(orgId: string) {
  const { data, error } = await supabase
    .from('automation_feature_flags')
    .select('*')
    .eq('active', true)
    .or(`organization_id.is.null,organization_id.eq.${orgId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listPackages(orgId: string) {
  const { data, error } = await supabase
    .from('automation_packages')
    .select('*')
    .eq('organization_id', orgId)
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listPackageVersions(orgId: string, packageId?: string) {
  let query = supabase
    .from('automation_package_versions')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (packageId) query = query.eq('package_id', packageId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listPackageAssets(orgId: string, packageVersionId: string) {
  const { data, error } = await supabase
    .from('automation_package_assets')
    .select('*')
    .eq('organization_id', orgId)
    .eq('package_version_id', packageVersionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCompatibilityReport(input: {
  organization_id: string;
  package_version_id: string;
  checker_version: string;
  compatibility_state: 'pass' | 'warn' | 'fail';
  missing_tools: string[];
  deprecated_nodes: string[];
  unsupported_risky_actions: string[];
  missing_entitlements: string[];
  remediation_json: Array<{ issue: string; action: string }>;
  report_json: Record<string, unknown>;
  created_by_user_id: string;
}) {
  const { data, error } = await supabase
    .from('automation_package_compatibility_reports')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createExportEvent(input: {
  organization_id: string;
  package_version_id: string;
  exported_by_user_id: string;
  governance_required: boolean;
  governance_approved: boolean;
  metadata_json: Record<string, unknown>;
}) {
  const { data, error } = await supabase.from('automation_package_exports').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function createImportEvent(input: {
  organization_id: string;
  source_type: 'upload' | 'external_org' | 'system';
  source_org_id?: string | null;
  package_key: string;
  requested_mode: 'draft_only' | 'template_only' | 'library_copy';
  trust_state: 'trusted' | 'untrusted' | 'restricted';
  compatibility_state: 'pass' | 'warn' | 'fail';
  install_state: 'pending' | 'blocked' | 'installed' | 'rolled_back';
  blocking_reasons: string[];
  import_manifest_json: Record<string, unknown>;
  requested_by_user_id: string;
  reviewed_by_user_id?: string | null;
}) {
  const { data, error } = await supabase.from('automation_package_imports').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function createInstallation(input: {
  organization_id: string;
  package_version_id: string;
  import_id?: string | null;
  installation_mode: 'draft_only' | 'template_only' | 'library_copy';
  installed_asset_type: 'workflow_template' | 'playbook' | 'workflow_graph';
  installed_asset_ref: string;
  installed_by_user_id: string;
}) {
  const { data, error } = await supabase.from('automation_library_installations').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function createDistributionEvent(input: {
  organization_id: string;
  package_version_id: string;
  distribution_scope: 'organization' | 'office' | 'team' | 'external_org';
  target_scope_ref: string;
  target_org_id?: string | null;
  event_type: 'distribution_requested' | 'distribution_approved' | 'distribution_rejected' | 'distribution_revoked';
  reviewer_note?: string | null;
  actor_user_id: string;
  metadata_json?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.from('automation_package_distribution_events').insert({ ...input, metadata_json: input.metadata_json ?? {} }).select('*').single();
  if (error) throw error;
  return data;
}

export async function listImports(orgId: string) {
  const { data, error } = await supabase
    .from('automation_package_imports')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function listExports(orgId: string) {
  const { data, error } = await supabase
    .from('automation_package_exports')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function listInstallations(orgId: string) {
  const { data, error } = await supabase
    .from('automation_library_installations')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
