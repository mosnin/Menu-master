-- 005_brokerage_economics.sql
-- Deal Desk - Phase 5: Brokerage Economics, Compliance, and Management Reporting
-- Adds tables for offices, teams, commission tracking, revenue forecasting,
-- compliance review, policy enforcement, and management reporting.

-- ============================================================================
-- 1. OFFICES
-- ============================================================================
CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    managing_broker_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offices_org ON offices (organization_id);

CREATE TRIGGER trg_offices_updated_at
    BEFORE UPDATE ON offices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. TEAMS
-- ============================================================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    office_id UUID REFERENCES offices (id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    team_lead_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_org ON teams (organization_id);
CREATE INDEX idx_teams_office ON teams (office_id);

CREATE TRIGGER trg_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. OFFICE MEMBERSHIPS
-- ============================================================================
CREATE TABLE office_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES offices (id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams (id) ON DELETE SET NULL,
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'team_lead', 'office_manager', 'managing_broker')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, office_id)
);

CREATE INDEX idx_office_memberships_user ON office_memberships (user_id);
CREATE INDEX idx_office_memberships_office ON office_memberships (office_id);
CREATE INDEX idx_office_memberships_team ON office_memberships (team_id);

CREATE TRIGGER trg_office_memberships_updated_at
    BEFORE UPDATE ON office_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. TRANSACTION ECONOMICS
-- ============================================================================
CREATE TABLE transaction_economics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    -- Purchase details
    purchase_price DECIMAL(14, 2),
    -- Commission details
    commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'flat')),
    commission_rate DECIMAL(6, 4),
    commission_amount DECIMAL(12, 2),
    gross_commission DECIMAL(12, 2),
    -- Side
    representation_side TEXT NOT NULL DEFAULT 'buyer' CHECK (representation_side IN ('buyer', 'seller', 'dual')),
    -- Brokerage split
    brokerage_split_pct DECIMAL(6, 4) NOT NULL DEFAULT 0.30,
    brokerage_share DECIMAL(12, 2),
    agent_share DECIMAL(12, 2),
    -- Referral
    has_referral BOOLEAN NOT NULL DEFAULT false,
    referral_fee_pct DECIMAL(6, 4),
    referral_fee_amount DECIMAL(12, 2),
    referral_party_name TEXT,
    -- Net
    net_brokerage_revenue DECIMAL(12, 2),
    -- Status
    is_projected BOOLEAN NOT NULL DEFAULT true,
    is_finalized BOOLEAN NOT NULL DEFAULT false,
    finalized_at TIMESTAMPTZ,
    finalized_by_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    -- Close probability for forecast weighting
    close_probability DECIMAL(5, 4) DEFAULT 0.50,
    expected_close_date DATE,
    -- Notes
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_economics_transaction ON transaction_economics (transaction_id);
CREATE INDEX idx_transaction_economics_org ON transaction_economics (organization_id);
CREATE INDEX idx_transaction_economics_close_date ON transaction_economics (expected_close_date);

CREATE TRIGGER trg_transaction_economics_updated_at
    BEFORE UPDATE ON transaction_economics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. COMMISSION SPLITS
-- ============================================================================
CREATE TABLE commission_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    economics_id UUID NOT NULL REFERENCES transaction_economics (id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('agent', 'co_agent', 'team_lead', 'brokerage', 'referral', 'other')),
    recipient_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    recipient_name TEXT NOT NULL,
    split_pct DECIMAL(6, 4),
    split_amount DECIMAL(12, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_splits_economics ON commission_splits (economics_id);

-- ============================================================================
-- 6. COMPLIANCE ISSUES
-- ============================================================================
CREATE TABLE compliance_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'missing_document', 'missing_approval', 'risky_communication',
        'stage_block', 'unresolved_exception', 'missing_economics',
        'readiness_inconsistency', 'policy_violation', 'other'
    )),
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open', 'under_review', 'blocked', 'resolved', 'overridden'
    )),
    assigned_to_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    resolved_by_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    policy_rule_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_issues_org ON compliance_issues (organization_id);
CREATE INDEX idx_compliance_issues_transaction ON compliance_issues (transaction_id);
CREATE INDEX idx_compliance_issues_status ON compliance_issues (status);
CREATE INDEX idx_compliance_issues_category ON compliance_issues (category);
CREATE INDEX idx_compliance_issues_severity ON compliance_issues (severity);

CREATE TRIGGER trg_compliance_issues_updated_at
    BEFORE UPDATE ON compliance_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. COMPLIANCE ISSUE COMMENTS
-- ============================================================================
CREATE TABLE compliance_issue_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES compliance_issues (id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE RESTRICT,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_issue_comments_issue ON compliance_issue_comments (issue_id);

-- ============================================================================
-- 8. POLICY RULES
-- ============================================================================
CREATE TABLE policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    office_id UUID REFERENCES offices (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'required_document', 'required_approval', 'required_economics',
        'stage_gate', 'compliance_signoff', 'correction_review'
    )),
    enforcement_mode TEXT NOT NULL DEFAULT 'warn' CHECK (enforcement_mode IN ('warn', 'block', 'require_override')),
    rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    applies_to_transaction_types JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_policy_rules_org ON policy_rules (organization_id);
CREATE INDEX idx_policy_rules_office ON policy_rules (office_id);
CREATE INDEX idx_policy_rules_category ON policy_rules (category);
CREATE INDEX idx_policy_rules_active ON policy_rules (is_active);

CREATE TRIGGER trg_policy_rules_updated_at
    BEFORE UPDATE ON policy_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. POLICY OVERRIDES
-- ============================================================================
CREATE TABLE policy_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_rule_id UUID NOT NULL REFERENCES policy_rules (id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    override_reason TEXT NOT NULL,
    overridden_by_user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE RESTRICT,
    approved_by_user_id UUID REFERENCES user_profiles (id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_policy_overrides_rule ON policy_overrides (policy_rule_id);
CREATE INDEX idx_policy_overrides_transaction ON policy_overrides (transaction_id);
CREATE INDEX idx_policy_overrides_org ON policy_overrides (organization_id);
CREATE INDEX idx_policy_overrides_status ON policy_overrides (status);

CREATE TRIGGER trg_policy_overrides_updated_at
    BEFORE UPDATE ON policy_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. CLOSE FORECAST SNAPSHOTS
-- ============================================================================
CREATE TABLE close_forecast_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    forecast_month DATE NOT NULL,
    total_projected DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total_weighted DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total_closed DECIMAL(14, 2) NOT NULL DEFAULT 0,
    transaction_count INT NOT NULL DEFAULT 0,
    at_risk_count INT NOT NULL DEFAULT 0,
    details JSONB NOT NULL DEFAULT '[]'::jsonb,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, snapshot_date, forecast_month)
);

CREATE INDEX idx_close_forecast_org_date ON close_forecast_snapshots (organization_id, snapshot_date);
CREATE INDEX idx_close_forecast_month ON close_forecast_snapshots (forecast_month);

-- ============================================================================
-- 11. Link transactions to offices
-- ============================================================================
ALTER TABLE transactions
    ADD COLUMN office_id UUID REFERENCES offices (id) ON DELETE SET NULL,
    ADD COLUMN team_id UUID REFERENCES teams (id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_office ON transactions (office_id);
CREATE INDEX idx_transactions_team ON transactions (team_id);
