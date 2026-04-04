-- PRODUCT_EVENTS: Core analytics event log
CREATE TABLE product_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_category TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    session_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_events_org ON product_events(organization_id);
CREATE INDEX idx_product_events_user ON product_events(user_id);
CREATE INDEX idx_product_events_name ON product_events(event_name);
CREATE INDEX idx_product_events_category ON product_events(event_category);
CREATE INDEX idx_product_events_created ON product_events(created_at);

-- ACTIVATION_MILESTONES: Tracks first-time events per org/user
CREATE TABLE activation_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    milestone TEXT NOT NULL,
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(organization_id, user_id, milestone)
);
CREATE INDEX idx_activation_milestones_org ON activation_milestones(organization_id);

-- FEEDBACK: Lightweight in-product feedback
CREATE TABLE product_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'text', 'issue_report')),
    feature_area TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    rating SMALLINT CHECK (rating BETWEEN -1 AND 1),
    body TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_feedback_org ON product_feedback(organization_id);
CREATE INDEX idx_product_feedback_feature ON product_feedback(feature_area);

-- DAILY_METRICS: Pre-computed daily rollups for dashboard queries
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL DEFAULT 0,
    dimensions JSONB DEFAULT '{}'::jsonb,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, metric_date, metric_name, dimensions)
);
CREATE INDEX idx_daily_metrics_org_date ON daily_metrics(organization_id, metric_date);
CREATE INDEX idx_daily_metrics_name ON daily_metrics(metric_name);
