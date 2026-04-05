-- Customer-facing automation onboarding, activation readiness, and managed success tracking.

create table if not exists automation_recommendation_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_name text not null,
  organization_type text,
  team_size_bucket text,
  office_model text,
  transaction_volume_bucket text,
  lifecycle_focus text[] not null default '{}',
  profile_json jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, profile_name)
);
create index if not exists idx_automation_recommendation_profiles_org on automation_recommendation_profiles (organization_id, created_at desc);

create table if not exists automation_onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  office_id uuid references offices(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  session_name text not null,
  state text not null default 'active' check (state in ('active','paused','completed','cancelled')),
  recommendation_profile_id uuid references automation_recommendation_profiles(id) on delete set null,
  created_by_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_onboarding_sessions_org on automation_onboarding_sessions (organization_id, state, created_at desc);

create table if not exists automation_setup_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  onboarding_session_id uuid not null references automation_onboarding_sessions(id) on delete cascade,
  package_version_id uuid references automation_package_versions(id) on delete set null,
  setup_mode text not null check (setup_mode in ('draft_only','template_only','library_copy')),
  scope_type text not null check (scope_type in ('organization','office','team')),
  scope_ref text not null,
  status text not null default 'onboarding' check (status in ('onboarding','setup_blocked','ready_for_activation','pilot_active','broadly_adopted','underperforming')),
  checklist_json jsonb not null default '{}'::jsonb,
  blockers_json jsonb not null default '[]'::jsonb,
  created_by_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_setup_states_org on automation_setup_states (organization_id, status, created_at desc);

create table if not exists automation_activation_checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  setup_state_id uuid not null references automation_setup_states(id) on delete cascade,
  package_version_id uuid references automation_package_versions(id) on delete set null,
  checklist_type text not null default 'activation_readiness',
  checklist_state text not null default 'in_progress' check (checklist_state in ('in_progress','blocked','ready','completed')),
  items_json jsonb not null default '[]'::jsonb,
  missing_items_json jsonb not null default '[]'::jsonb,
  updated_by_user_id uuid references user_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_activation_checklists_org on automation_activation_checklists (organization_id, checklist_state, updated_at desc);

create table if not exists automation_setup_blockers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  setup_state_id uuid not null references automation_setup_states(id) on delete cascade,
  blocker_type text not null,
  severity text not null check (severity in ('warning','major','critical')),
  details text not null,
  suggested_action text,
  resolved boolean not null default false,
  resolved_by_user_id uuid references user_profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_setup_blockers_org on automation_setup_blockers (organization_id, resolved, severity, created_at desc);

create table if not exists automation_first_value_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  setup_state_id uuid references automation_setup_states(id) on delete set null,
  milestone_key text not null,
  milestone_state text not null check (milestone_state in ('pending','achieved')),
  achieved_at timestamptz,
  signal_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, setup_state_id, milestone_key)
);
create index if not exists idx_automation_first_value_milestones_org on automation_first_value_milestones (organization_id, milestone_state, created_at desc);

create table if not exists automation_adoption_health_summaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  setup_state_id uuid references automation_setup_states(id) on delete set null,
  adoption_state text not null check (adoption_state in ('onboarding','setup_blocked','ready_for_activation','pilot_active','broadly_adopted','underperforming')),
  health_score numeric(5,2) not null default 0,
  reasons text[] not null default '{}',
  recommendations_json jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_adoption_health_summaries_org on automation_adoption_health_summaries (organization_id, computed_at desc);

create table if not exists automation_rollout_guidance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  setup_state_id uuid references automation_setup_states(id) on delete set null,
  rollout_stage text not null check (rollout_stage in ('single_office_pilot','small_team_canary','staged_office_rollout','org_wide_rollout')),
  guidance_text text not null,
  next_action text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_rollout_guidance_records_org on automation_rollout_guidance_records (organization_id, created_at desc);

create table if not exists automation_activation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  setup_state_id uuid references automation_setup_states(id) on delete set null,
  event_type text not null check (event_type in ('setup_started','checklist_updated','ready_for_activation','activation_submitted','activation_completed','activation_rolled_back')),
  actor_user_id uuid references user_profiles(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_activation_events_org on automation_activation_events (organization_id, created_at desc);

create table if not exists automation_customer_success_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  setup_state_id uuid references automation_setup_states(id) on delete set null,
  note_type text not null check (note_type in ('support_note','intervention','handoff')),
  visibility text not null default 'internal' check (visibility in ('internal','customer_visible')),
  note_text text not null,
  created_by_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_customer_success_notes_org on automation_customer_success_notes (organization_id, created_at desc);
