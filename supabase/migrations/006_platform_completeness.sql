-- =============================================================================
-- 006_platform_completeness.sql
-- Global search, notifications, inbox, stage machine, bulk actions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Canonical Transaction Stages
-- ---------------------------------------------------------------------------
-- Add stage column to transactions (coexists with existing status field)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'intake'
  CHECK (stage IN (
    'intake', 'under_contract', 'due_diligence', 'financing',
    'appraisal', 'title_and_escrow', 'closing_prep', 'closed',
    'fell_through', 'archived'
  ));

CREATE INDEX IF NOT EXISTS idx_transactions_stage ON transactions(stage);

-- Stage transition audit log
CREATE TABLE IF NOT EXISTS stage_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  triggered_by_user_id UUID REFERENCES user_profiles(id),
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'automatic', 'policy', 'system')),
  reason TEXT,
  blocked_by_policy_rule_id UUID REFERENCES policy_rules(id),
  override_id UUID REFERENCES policy_overrides(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stage_transitions_transaction ON stage_transitions(transaction_id);
CREATE INDEX idx_stage_transitions_org ON stage_transitions(organization_id);
CREATE INDEX idx_stage_transitions_created ON stage_transitions(created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'approval_assigned', 'mention', 'overdue_item', 'blocked_transaction',
    'external_upload', 'compliance_issue', 'processing_failure',
    'exception_raised', 'stage_changed', 'document_request_fulfilled',
    'policy_override_needed', 'closing_approaching', 'general'
  )),
  title TEXT NOT NULL,
  body TEXT,
  -- Deep link target
  entity_type TEXT, -- 'transaction', 'approval', 'document', 'checklist_item', etc.
  entity_id UUID,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  -- Link URL for quick navigation
  action_url TEXT,
  -- State
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  -- Priority
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  -- Deduplication
  dedup_key TEXT,
  -- Metadata
  actor_user_id UUID REFERENCES user_profiles(id),
  actor_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_dedup ON notifications(dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX idx_notifications_transaction ON notifications(transaction_id) WHERE transaction_id IS NOT NULL;

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Per-category toggles
  approval_assigned BOOLEAN NOT NULL DEFAULT true,
  mention BOOLEAN NOT NULL DEFAULT true,
  overdue_item BOOLEAN NOT NULL DEFAULT true,
  blocked_transaction BOOLEAN NOT NULL DEFAULT true,
  external_upload BOOLEAN NOT NULL DEFAULT true,
  compliance_issue BOOLEAN NOT NULL DEFAULT true,
  processing_failure BOOLEAN NOT NULL DEFAULT true,
  exception_raised BOOLEAN NOT NULL DEFAULT true,
  stage_changed BOOLEAN NOT NULL DEFAULT true,
  document_request_fulfilled BOOLEAN NOT NULL DEFAULT true,
  policy_override_needed BOOLEAN NOT NULL DEFAULT true,
  closing_approaching BOOLEAN NOT NULL DEFAULT true,
  general BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

-- ---------------------------------------------------------------------------
-- 3. Search support — GIN indexes for full-text search
-- ---------------------------------------------------------------------------
-- Add tsvector columns for searchable entities
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_transactions_search ON transactions USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_comments_search ON comments USING GIN(search_vector);

-- Trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for partial/fuzzy matching on key text fields
CREATE INDEX IF NOT EXISTS idx_transactions_title_trgm ON transactions USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm ON contacts USING GIN(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_address_trgm ON properties USING GIN(address_line_1 gin_trgm_ops);

-- Search vector update functions
CREATE OR REPLACE FUNCTION update_transaction_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.status, '') || ' ' ||
    coalesce(NEW.stage, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_contact_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.full_name, '') || ' ' ||
    coalesce(NEW.email, '') || ' ' ||
    coalesce(NEW.phone, '') || ' ' ||
    coalesce(NEW.contact_type, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_document_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.file_name, '') || ' ' ||
    coalesce(NEW.document_type, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_comment_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.body, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update search vectors
CREATE TRIGGER trg_transactions_search BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_transaction_search_vector();

CREATE TRIGGER trg_contacts_search BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_contact_search_vector();

CREATE TRIGGER trg_documents_search BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_document_search_vector();

CREATE TRIGGER trg_comments_search BEFORE INSERT OR UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_search_vector();

-- Recent searches per user
CREATE TABLE IF NOT EXISTS recent_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_entity_type TEXT,
  result_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recent_searches_user ON recent_searches(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Bulk Actions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bulk_action_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  initiated_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'assign_owner', 'assign_reviewer', 'request_review',
    'mark_reviewed', 'send_reminder', 'archive',
    'change_stage', 'bulk_approve'
  )),
  target_entity_type TEXT NOT NULL, -- 'checklist_item', 'approval', 'transaction', etc.
  target_entity_ids UUID[] NOT NULL,
  action_params JSONB DEFAULT '{}'::jsonb,
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'partial_failure', 'failed')),
  total_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  -- Results
  results JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bulk_action_jobs_org ON bulk_action_jobs(organization_id);
CREATE INDEX idx_bulk_action_jobs_user ON bulk_action_jobs(initiated_by_user_id);
CREATE INDEX idx_bulk_action_jobs_status ON bulk_action_jobs(status);
CREATE INDEX idx_bulk_action_jobs_created ON bulk_action_jobs(created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Backfill existing data
-- ---------------------------------------------------------------------------
-- Set initial stage values based on current status
UPDATE transactions SET stage = CASE
  WHEN status = 'draft' THEN 'intake'
  WHEN status = 'active' THEN 'under_contract'
  WHEN status = 'pending_closing' THEN 'closing_prep'
  WHEN status = 'closed' THEN 'closed'
  WHEN status = 'cancelled' THEN 'fell_through'
  ELSE 'intake'
END
WHERE stage IS NULL OR stage = 'intake';

-- Backfill search vectors for existing data
UPDATE transactions SET title = title WHERE search_vector IS NULL;
UPDATE contacts SET full_name = full_name WHERE search_vector IS NULL;
UPDATE documents SET file_name = file_name WHERE search_vector IS NULL;
UPDATE comments SET body = body WHERE search_vector IS NULL;
