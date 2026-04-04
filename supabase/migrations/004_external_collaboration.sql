-- 004_external_collaboration.sql
-- Deal Desk - Phase 4: External Collaboration & Closing Coordination
-- Adds tables for external collaborators, document requests, closing readiness,
-- deal health scoring, counterparty responsiveness, daily digests, and audit exports.

-- ============================================================================
-- 1. EXTERNAL COLLABORATOR INVITES
-- ============================================================================
CREATE TABLE collaborator_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE RESTRICT,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN (
        'lender', 'title_agent', 'escrow_officer', 'attorney', 'inspector', 'appraiser', 'other'
    )),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'declined', 'revoked', 'expired'
    )),
    access_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    linked_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    permissions JSONB NOT NULL DEFAULT '{"can_view_documents": true, "can_upload_documents": true, "can_update_status": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collaborator_invites_org ON collaborator_invites (organization_id);
CREATE INDEX idx_collaborator_invites_transaction ON collaborator_invites (transaction_id);
CREATE INDEX idx_collaborator_invites_email ON collaborator_invites (email);
CREATE INDEX idx_collaborator_invites_token ON collaborator_invites (access_token);
CREATE INDEX idx_collaborator_invites_status ON collaborator_invites (status);

CREATE TRIGGER trg_collaborator_invites_updated_at
    BEFORE UPDATE ON collaborator_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. DOCUMENT REQUESTS
-- ============================================================================
CREATE TABLE document_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    requested_by_user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE RESTRICT,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
        'sent', 'viewed', 'uploaded', 'expired', 'cancelled'
    )),
    access_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    viewed_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    reminder_count INT NOT NULL DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_requests_org ON document_requests (organization_id);
CREATE INDEX idx_document_requests_transaction ON document_requests (transaction_id);
CREATE INDEX idx_document_requests_token ON document_requests (access_token);
CREATE INDEX idx_document_requests_status ON document_requests (status);

CREATE TRIGGER trg_document_requests_updated_at
    BEFORE UPDATE ON document_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. DOCUMENT REQUEST UPLOADS
-- ============================================================================
CREATE TABLE document_request_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_request_id UUID NOT NULL REFERENCES document_requests (id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    uploader_email TEXT NOT NULL,
    uploader_name TEXT,
    file_name TEXT NOT NULL,
    file_size INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_request_uploads_request ON document_request_uploads (document_request_id);

-- ============================================================================
-- 4. LENDER STATUS UPDATES
-- ============================================================================
CREATE TABLE lender_status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    submitted_by_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    submitted_by_email TEXT,
    milestone TEXT NOT NULL CHECK (milestone IN (
        'pre_approval_received', 'underwriting_started', 'appraisal_ordered',
        'appraisal_received', 'conditional_approval', 'clear_to_close', 'funding_confirmed'
    )),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress', 'blocked')),
    notes TEXT,
    evidence_document_id UUID REFERENCES documents (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lender_status_updates_transaction ON lender_status_updates (transaction_id);
CREATE INDEX idx_lender_status_updates_milestone ON lender_status_updates (milestone);

-- ============================================================================
-- 5. TITLE STATUS UPDATES
-- ============================================================================
CREATE TABLE title_status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    submitted_by_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    submitted_by_email TEXT,
    milestone TEXT NOT NULL CHECK (milestone IN (
        'title_search_started', 'title_search_completed', 'title_commitment_issued',
        'title_issues_found', 'title_issues_cleared', 'escrow_opened',
        'earnest_money_received', 'closing_disclosure_sent', 'closing_scheduled',
        'closing_completed', 'recording_completed', 'disbursement_completed'
    )),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress', 'blocked', 'issue_flagged')),
    notes TEXT,
    evidence_document_id UUID REFERENCES documents (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_title_status_updates_transaction ON title_status_updates (transaction_id);
CREATE INDEX idx_title_status_updates_milestone ON title_status_updates (milestone);

-- ============================================================================
-- 6. CLOSING READINESS
-- ============================================================================
CREATE TABLE closing_readiness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions (id) ON DELETE CASCADE,
    readiness_state TEXT NOT NULL DEFAULT 'not_ready' CHECK (readiness_state IN (
        'not_ready', 'at_risk', 'nearly_ready', 'ready_for_closing'
    )),
    overall_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    -- Category scores
    document_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    financing_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    title_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    checklist_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    approval_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    -- Blockers
    unresolved_blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    pending_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Closing info
    target_closing_date DATE,
    days_until_closing INT,
    -- Computation
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_closing_readiness_transaction ON closing_readiness (transaction_id);
CREATE INDEX idx_closing_readiness_state ON closing_readiness (readiness_state);

CREATE TRIGGER trg_closing_readiness_updated_at
    BEFORE UPDATE ON closing_readiness
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. DEAL HEALTH SCORES
-- ============================================================================
CREATE TABLE deal_health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    overall_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    rating TEXT NOT NULL DEFAULT 'unknown' CHECK (rating IN (
        'healthy', 'watch', 'at_risk', 'critical', 'unknown'
    )),
    -- Factor scores (0-100)
    completeness_factor DECIMAL(5, 2) NOT NULL DEFAULT 0,
    timeliness_factor DECIMAL(5, 2) NOT NULL DEFAULT 0,
    responsiveness_factor DECIMAL(5, 2) NOT NULL DEFAULT 0,
    compliance_factor DECIMAL(5, 2) NOT NULL DEFAULT 0,
    financing_factor DECIMAL(5, 2) NOT NULL DEFAULT 0,
    -- Explanations
    risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    positive_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Previous score for trend
    previous_score DECIMAL(5, 2),
    score_trend TEXT CHECK (score_trend IN ('improving', 'stable', 'declining')),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_health_scores_transaction ON deal_health_scores (transaction_id);
CREATE INDEX idx_deal_health_scores_org ON deal_health_scores (organization_id);
CREATE INDEX idx_deal_health_scores_rating ON deal_health_scores (rating);
CREATE INDEX idx_deal_health_scores_computed ON deal_health_scores (computed_at);

-- ============================================================================
-- 8. RESPONSE OBLIGATIONS
-- ============================================================================
CREATE TABLE response_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    party_type TEXT NOT NULL CHECK (party_type IN (
        'buyer', 'seller', 'lender', 'title', 'escrow', 'attorney', 'inspector', 'appraiser', 'other'
    )),
    party_email TEXT,
    party_name TEXT NOT NULL,
    obligation_type TEXT NOT NULL,
    description TEXT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expected_by TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN (
        'waiting', 'responded', 'overdue', 'escalated', 'cancelled'
    )),
    source_type TEXT,
    source_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_response_obligations_transaction ON response_obligations (transaction_id);
CREATE INDEX idx_response_obligations_status ON response_obligations (status);
CREATE INDEX idx_response_obligations_party ON response_obligations (party_type);

CREATE TRIGGER trg_response_obligations_updated_at
    BEFORE UPDATE ON response_obligations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. DAILY DIGEST PREFERENCES
-- ============================================================================
CREATE TABLE daily_digest_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES user_profiles (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    delivery_hour INT NOT NULL DEFAULT 8 CHECK (delivery_hour BETWEEN 0 AND 23),
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    include_health_risks BOOLEAN NOT NULL DEFAULT true,
    include_deadlines BOOLEAN NOT NULL DEFAULT true,
    include_pending_approvals BOOLEAN NOT NULL DEFAULT true,
    include_stale_responses BOOLEAN NOT NULL DEFAULT true,
    include_closing_soon BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_digest_prefs_user ON daily_digest_preferences (user_id);

CREATE TRIGGER trg_daily_digest_prefs_updated_at
    BEFORE UPDATE ON daily_digest_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. DAILY DIGESTS (sent history)
-- ============================================================================
CREATE TABLE daily_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    digest_date DATE NOT NULL,
    content_json JSONB NOT NULL,
    email_sent BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, digest_date)
);

CREATE INDEX idx_daily_digests_user_date ON daily_digests (user_id, digest_date);

-- ============================================================================
-- 11. AUDIT EXPORT JOBS
-- ============================================================================
CREATE TABLE audit_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    requested_by_user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    include_sections JSONB NOT NULL DEFAULT '["summary","timeline","approvals","documents","corrections","exceptions","closing_readiness"]'::jsonb,
    export_format TEXT NOT NULL DEFAULT 'json' CHECK (export_format IN ('json', 'pdf')),
    result_storage_path TEXT,
    result_metadata JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_export_jobs_org ON audit_export_jobs (organization_id);
CREATE INDEX idx_audit_export_jobs_transaction ON audit_export_jobs (transaction_id);
CREATE INDEX idx_audit_export_jobs_status ON audit_export_jobs (status);

CREATE TRIGGER trg_audit_export_jobs_updated_at
    BEFORE UPDATE ON audit_export_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
