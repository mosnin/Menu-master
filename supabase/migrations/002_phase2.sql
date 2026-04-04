-- 002_phase2.sql
-- Real Estate Deal Desk - Phase 2 Schema
-- Adds 15 new tables and 2 ALTER statements for extraction review,
-- completeness tracking, exceptions, recommendations, assignments,
-- comments, communications, queue views, org config, and packet ingestion.

-- ============================================================================
-- ALTER EXISTING TABLES
-- ============================================================================

ALTER TABLE checklist_items
    ADD COLUMN assigned_to_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL;

ALTER TABLE approvals
    ADD COLUMN assigned_reviewer_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL;

-- ============================================================================
-- 1. EXTRACTED_FIELD_VALUES
-- ============================================================================
CREATE TABLE extracted_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    extraction_id UUID NOT NULL REFERENCES document_extractions (id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    extracted_value TEXT NOT NULL,
    corrected_value TEXT,
    corrected_by_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    corrected_at TIMESTAMPTZ,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    confidence_score DECIMAL(5, 4),
    source_page INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_extracted_field_values_document_id ON extracted_field_values (document_id);
CREATE INDEX idx_extracted_field_values_extraction_id ON extracted_field_values (extraction_id);

-- ============================================================================
-- 2. FIELD_CORRECTIONS
-- ============================================================================
CREATE TABLE field_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_value_id UUID NOT NULL REFERENCES extracted_field_values (id) ON DELETE CASCADE,
    previous_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    corrected_by_user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE RESTRICT,
    correction_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_field_corrections_field_value_id ON field_corrections (field_value_id);

-- ============================================================================
-- 3. TRANSACTION_COMPLETENESS
-- ============================================================================
CREATE TABLE transaction_completeness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions (id) ON DELETE CASCADE,
    readiness_state TEXT NOT NULL DEFAULT 'not_ready' CHECK (readiness_state IN (
        'not_ready', 'needs_attention', 'nearly_ready', 'ready'
    )),
    completeness_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    missing_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_signatures JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_financing JSONB NOT NULL DEFAULT '[]'::jsonb,
    unresolved_reviews INT NOT NULL DEFAULT 0,
    blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_completeness_transaction_id ON transaction_completeness (transaction_id);

CREATE TRIGGER trg_transaction_completeness_updated_at
    BEFORE UPDATE ON transaction_completeness
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. TRANSACTION_EXCEPTIONS
-- ============================================================================
CREATE TABLE transaction_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    exception_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN (
        'open', 'acknowledged', 'resolved'
    )),
    resolved_by_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_exceptions_transaction_id ON transaction_exceptions (transaction_id);
CREATE INDEX idx_transaction_exceptions_resolution_status ON transaction_exceptions (resolution_status);

CREATE TRIGGER trg_transaction_exceptions_updated_at
    BEFORE UPDATE ON transaction_exceptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. TRANSACTION_RECOMMENDATIONS
-- ============================================================================
CREATE TABLE transaction_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    reason TEXT NOT NULL,
    confidence DECIMAL(5, 4) NOT NULL,
    risk_level TEXT NOT NULL,
    source_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_owner_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'executed', 'dismissed'
    )),
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_recommendations_transaction_id ON transaction_recommendations (transaction_id);
CREATE INDEX idx_transaction_recommendations_status ON transaction_recommendations (status);

CREATE TRIGGER trg_transaction_recommendations_updated_at
    BEFORE UPDATE ON transaction_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. TRANSACTION_ASSIGNMENTS
-- ============================================================================
CREATE TABLE transaction_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions (id) ON DELETE CASCADE,
    primary_agent_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    coordinator_owner_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    broker_reviewer_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_assignments_transaction_id ON transaction_assignments (transaction_id);

CREATE TRIGGER trg_transaction_assignments_updated_at
    BEFORE UPDATE ON transaction_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments (id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE RESTRICT,
    body TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_by_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('transaction', 'document', 'approval')),
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_organization_id ON comments (organization_id);
CREATE INDEX idx_comments_transaction_id ON comments (transaction_id);
CREATE INDEX idx_comments_parent_comment_id ON comments (parent_comment_id);
CREATE INDEX idx_comments_entity_type_entity_id ON comments (entity_type, entity_id);

CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. MENTIONS
-- ============================================================================
CREATE TABLE mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments (id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentions_comment_id ON mentions (comment_id);
CREATE INDEX idx_mentions_mentioned_user_id ON mentions (mentioned_user_id);

-- ============================================================================
-- 9. COMMUNICATION_THREADS
-- ============================================================================
CREATE TABLE communication_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions (id) ON DELETE SET NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
    external_thread_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    participant_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_linked BOOLEAN NOT NULL DEFAULT false,
    linked_by TEXT CHECK (linked_by IN ('auto', 'manual')),
    link_confidence DECIMAL(5, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_communication_threads_organization_id ON communication_threads (organization_id);
CREATE INDEX idx_communication_threads_transaction_id ON communication_threads (transaction_id);

CREATE TRIGGER trg_communication_threads_updated_at
    BEFORE UPDATE ON communication_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. COMMUNICATION_MESSAGES
-- ============================================================================
CREATE TABLE communication_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES communication_threads (id) ON DELETE CASCADE,
    external_message_id TEXT UNIQUE NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    from_email TEXT NOT NULL,
    to_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    cc_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    sent_at TIMESTAMPTZ NOT NULL,
    has_attachments BOOLEAN NOT NULL DEFAULT false,
    attachment_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_communication_messages_thread_id ON communication_messages (thread_id);
CREATE INDEX idx_communication_messages_external_message_id ON communication_messages (external_message_id);

-- ============================================================================
-- 11. EMAIL_ACCOUNT_CONNECTIONS
-- ============================================================================
CREATE TABLE email_account_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
    email_address TEXT NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'active' CHECK (sync_status IN (
        'active', 'paused', 'error', 'disconnected'
    )),
    last_sync_at TIMESTAMPTZ,
    sync_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_account_connections_organization_id ON email_account_connections (organization_id);
CREATE INDEX idx_email_account_connections_user_id ON email_account_connections (user_id);

CREATE TRIGGER trg_email_account_connections_updated_at
    BEFORE UPDATE ON email_account_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 12. QUEUE_VIEWS
-- ============================================================================
CREATE TABLE queue_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    queue_type TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order JSONB,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_queue_views_organization_id ON queue_views (organization_id);
CREATE INDEX idx_queue_views_user_id ON queue_views (user_id);

CREATE TRIGGER trg_queue_views_updated_at
    BEFORE UPDATE ON queue_views
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 13. ORGANIZATION_RULES
-- ============================================================================
CREATE TABLE organization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,
    rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organization_rules_organization_id ON organization_rules (organization_id);

CREATE TRIGGER trg_organization_rules_updated_at
    BEFORE UPDATE ON organization_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 14. ORGANIZATION_TEMPLATES
-- ============================================================================
CREATE TABLE organization_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    template_type TEXT NOT NULL,
    transaction_type TEXT,
    name TEXT NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organization_templates_organization_id ON organization_templates (organization_id);

CREATE TRIGGER trg_organization_templates_updated_at
    BEFORE UPDATE ON organization_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 15. PACKET_INGESTIONS
-- ============================================================================
CREATE TABLE packet_ingestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions (id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'classifying', 'completed', 'failed'
    )),
    file_count INT NOT NULL DEFAULT 0,
    classification_results JSONB,
    created_by_user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE RESTRICT,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_packet_ingestions_organization_id ON packet_ingestions (organization_id);
CREATE INDEX idx_packet_ingestions_transaction_id ON packet_ingestions (transaction_id);
CREATE INDEX idx_packet_ingestions_status ON packet_ingestions (status);

CREATE TRIGGER trg_packet_ingestions_updated_at
    BEFORE UPDATE ON packet_ingestions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
