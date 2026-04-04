-- =============================================================================
-- 007_import_diagnostics.sql
-- Import flows, duplicate detection, diagnostics, retry/recompute controls
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CSV Import Jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  import_type TEXT NOT NULL CHECK (import_type IN ('contacts', 'transactions', 'properties')),
  file_name TEXT NOT NULL,
  file_size INTEGER,
  storage_path TEXT,
  -- Field mapping: { csv_column -> db_field }
  field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'validating', 'validated', 'importing', 'completed',
    'completed_with_errors', 'failed', 'cancelled'
  )),
  -- Counts
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  -- Options
  skip_duplicates BOOLEAN NOT NULL DEFAULT true,
  update_existing BOOLEAN NOT NULL DEFAULT false,
  dry_run BOOLEAN NOT NULL DEFAULT false,
  -- Validation
  validation_errors JSONB DEFAULT '[]'::jsonb,
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_jobs_org ON import_jobs(organization_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created ON import_jobs(created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Import Rows (individual row tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  mapped_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'valid', 'invalid', 'imported', 'skipped', 'duplicate', 'error'
  )),
  error_message TEXT,
  duplicate_of_id UUID, -- references the existing record this is a duplicate of
  created_entity_type TEXT, -- 'contact', 'transaction', 'property'
  created_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_rows_job ON import_rows(import_job_id);
CREATE INDEX idx_import_rows_status ON import_rows(status);

-- ---------------------------------------------------------------------------
-- 3. Duplicate Detection Results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duplicate_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'transaction', 'property')),
  entity_a_id UUID NOT NULL,
  entity_b_id UUID NOT NULL,
  similarity_score DECIMAL(5,4) NOT NULL, -- 0.0000 to 1.0000
  match_fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- which fields matched
  resolution TEXT CHECK (resolution IN ('pending', 'merged', 'not_duplicate', 'ignored')),
  resolved_by_user_id UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_a_id, entity_b_id)
);

CREATE INDEX idx_duplicate_candidates_org ON duplicate_candidates(organization_id);
CREATE INDEX idx_duplicate_candidates_resolution ON duplicate_candidates(resolution);
CREATE INDEX idx_duplicate_candidates_entity ON duplicate_candidates(entity_type, entity_a_id);

-- ---------------------------------------------------------------------------
-- 4. Document Import Batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'uploading', 'classifying', 'processing', 'completed',
    'completed_with_errors', 'failed'
  )),
  -- Counts
  total_files INTEGER NOT NULL DEFAULT 0,
  uploaded_files INTEGER NOT NULL DEFAULT 0,
  classified_files INTEGER NOT NULL DEFAULT 0,
  processed_files INTEGER NOT NULL DEFAULT 0,
  failed_files INTEGER NOT NULL DEFAULT 0,
  -- Results
  results JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_import_batches_org ON document_import_batches(organization_id);
CREATE INDEX idx_doc_import_batches_status ON document_import_batches(status);

-- ---------------------------------------------------------------------------
-- 5. Recompute Jobs (retry/recompute controls)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recompute_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  initiated_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  job_type TEXT NOT NULL CHECK (job_type IN (
    'reextract_document', 'recompute_completeness', 'recompute_health_score',
    'recompute_closing_readiness', 'recompute_forecast', 'rerun_classification',
    'recompute_compliance', 'rebuild_search_index'
  )),
  -- Target
  target_entity_type TEXT, -- 'document', 'transaction', 'organization'
  target_entity_id UUID,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed'
  )),
  -- Results
  result_summary JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recompute_jobs_org ON recompute_jobs(organization_id);
CREATE INDEX idx_recompute_jobs_status ON recompute_jobs(status);
CREATE INDEX idx_recompute_jobs_created ON recompute_jobs(created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. System Diagnostics Snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN (
    'processing_backlog', 'extraction_health', 'search_index_status',
    'notification_delivery', 'storage_usage', 'data_integrity'
  )),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_diagnostics_org ON system_diagnostics(organization_id);
CREATE INDEX idx_system_diagnostics_check ON system_diagnostics(check_type);
CREATE INDEX idx_system_diagnostics_checked ON system_diagnostics(checked_at DESC);
