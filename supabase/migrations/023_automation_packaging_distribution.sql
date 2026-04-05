-- Enterprise packaging, entitlements, and controlled distribution for automation assets.

create table if not exists automation_entitlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  scope_type text not null check (scope_type in ('organization','office','team')),
  scope_ref text not null,
  plan_tier text not null check (plan_tier in ('starter','growth','enterprise')),
  feature_key text not null,
  enabled boolean not null default true,
  metadata_json jsonb not null default '{}'::jsonb,
  granted_by_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, scope_type, scope_ref, feature_key)
);
create index if not exists idx_automation_entitlements_org_scope on automation_entitlements (organization_id, scope_type, scope_ref);
create index if not exists idx_automation_entitlements_feature on automation_entitlements (organization_id, feature_key, enabled);

create table if not exists automation_feature_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  scope_type text check (scope_type in ('global','organization','office','team')),
  scope_ref text,
  feature_key text not null,
  flag_variant text not null default 'on' check (flag_variant in ('on','off','beta')),
  active boolean not null default true,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_feature_flags_lookup on automation_feature_flags (feature_key, active, organization_id, scope_type, scope_ref);

create table if not exists automation_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  package_key text not null,
  display_name text not null,
  description text,
  asset_family text not null check (asset_family in ('template_bundle','playbook_bundle','workflow_library')),
  source_type text not null check (source_type in ('local','system','external_org')),
  source_org_id uuid references organizations(id) on delete set null,
  risk_classification text not null default 'safe' check (risk_classification in ('safe','medium_risk','high_risk')),
  owner_user_id uuid references user_profiles(id) on delete set null,
  trust_state text not null default 'internal' check (trust_state in ('internal','trusted','restricted')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, package_key)
);
create index if not exists idx_automation_packages_org on automation_packages (organization_id, asset_family, risk_classification, active);

create table if not exists automation_package_versions (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references automation_packages(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  semver text not null,
  status text not null default 'draft' check (status in ('draft','published','deprecated')),
  bundle_manifest_json jsonb not null default '{}'::jsonb,
  compatibility_notes text,
  entitlement_requirements_json jsonb not null default '[]'::jsonb,
  simulation_guidance text,
  operator_guidance text,
  documentation_summary text,
  created_by_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (package_id, semver)
);
create index if not exists idx_automation_package_versions_org on automation_package_versions (organization_id, status, created_at desc);

create table if not exists automation_package_assets (
  id uuid primary key default gen_random_uuid(),
  package_version_id uuid not null references automation_package_versions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  asset_type text not null check (asset_type in ('workflow_template','playbook','workflow_graph','simulation_scenario','documentation')),
  asset_ref text not null,
  title text,
  payload_json jsonb not null default '{}'::jsonb,
  policy_sensitivity text not null default 'safe' check (policy_sensitivity in ('safe','requires_review','restricted')),
  validation_status text not null default 'unknown' check (validation_status in ('valid','invalid','unknown')),
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_package_assets_version on automation_package_assets (package_version_id, asset_type);

create table if not exists automation_package_compatibility_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  package_version_id uuid not null references automation_package_versions(id) on delete cascade,
  checker_version text not null,
  compatibility_state text not null check (compatibility_state in ('pass','warn','fail')),
  missing_tools text[] not null default '{}',
  deprecated_nodes text[] not null default '{}',
  unsupported_risky_actions text[] not null default '{}',
  missing_entitlements text[] not null default '{}',
  remediation_json jsonb not null default '[]'::jsonb,
  report_json jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_package_compatibility_reports_version on automation_package_compatibility_reports (organization_id, package_version_id, created_at desc);

create table if not exists automation_package_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  package_version_id uuid not null references automation_package_versions(id) on delete cascade,
  export_format text not null default 'json_bundle',
  exported_by_user_id uuid references user_profiles(id) on delete set null,
  governance_required boolean not null default false,
  governance_approved boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_package_exports_org on automation_package_exports (organization_id, created_at desc);

create table if not exists automation_package_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_type text not null check (source_type in ('upload','external_org','system')),
  source_org_id uuid references organizations(id) on delete set null,
  package_key text not null,
  requested_mode text not null check (requested_mode in ('draft_only','template_only','library_copy')),
  trust_state text not null default 'untrusted' check (trust_state in ('trusted','untrusted','restricted')),
  compatibility_state text not null check (compatibility_state in ('pass','warn','fail')),
  install_state text not null default 'pending' check (install_state in ('pending','blocked','installed','rolled_back')),
  blocking_reasons text[] not null default '{}',
  import_manifest_json jsonb not null default '{}'::jsonb,
  requested_by_user_id uuid references user_profiles(id) on delete set null,
  reviewed_by_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_package_imports_org on automation_package_imports (organization_id, created_at desc);

create table if not exists automation_library_installations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  package_version_id uuid not null references automation_package_versions(id) on delete cascade,
  import_id uuid references automation_package_imports(id) on delete set null,
  installation_mode text not null check (installation_mode in ('draft_only','template_only','library_copy')),
  installed_asset_type text not null check (installed_asset_type in ('workflow_template','playbook','workflow_graph')),
  installed_asset_ref text not null,
  status text not null default 'active' check (status in ('active','inactive','rolled_back')),
  installed_by_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_library_installations_org on automation_library_installations (organization_id, status, created_at desc);

create table if not exists automation_package_distribution_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  package_version_id uuid not null references automation_package_versions(id) on delete cascade,
  distribution_scope text not null check (distribution_scope in ('organization','office','team','external_org')),
  target_scope_ref text not null,
  target_org_id uuid references organizations(id) on delete set null,
  event_type text not null check (event_type in ('distribution_requested','distribution_approved','distribution_rejected','distribution_revoked')),
  reviewer_note text,
  actor_user_id uuid references user_profiles(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_package_distribution_events_org on automation_package_distribution_events (organization_id, distribution_scope, created_at desc);
