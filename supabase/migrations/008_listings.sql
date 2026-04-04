-- =============================================================================
-- Migration 008: Listings, Offers, and Seller Workflow
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Listings table: seller-side workflow entity
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  property_id UUID REFERENCES properties(id),
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  title TEXT NOT NULL,
  listing_stage TEXT NOT NULL DEFAULT 'intake'
    CHECK (listing_stage IN (
      'intake', 'preparing', 'ready_for_review', 'ready_to_launch',
      'live', 'paused', 'under_contract', 'closed', 'withdrawn', 'archived'
    )),
  listing_type TEXT NOT NULL DEFAULT 'residential'
    CHECK (listing_type IN ('residential', 'commercial', 'land', 'multi_family')),
  list_price NUMERIC(14, 2),
  listing_description TEXT,
  target_launch_date DATE,
  actual_launch_date DATE,
  mls_number TEXT,
  -- Seller info snapshot
  seller_name TEXT,
  seller_email TEXT,
  seller_phone TEXT,
  -- Readiness scoring
  readiness_score INTEGER DEFAULT 0,
  readiness_state TEXT DEFAULT 'not_ready'
    CHECK (readiness_state IN ('not_ready', 'needs_attention', 'nearly_ready', 'ready')),
  -- Link to transaction after accepted offer
  converted_transaction_id UUID REFERENCES transactions(id),
  converted_at TIMESTAMPTZ,
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_org ON listings(organization_id);
CREATE INDEX idx_listings_stage ON listings(listing_stage);
CREATE INDEX idx_listings_property ON listings(property_id);
CREATE INDEX idx_listings_created_by ON listings(created_by_user_id);

-- -----------------------------------------------------------------------------
-- Listing contacts: seller and listing-specific contacts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  role TEXT NOT NULL DEFAULT 'seller'
    CHECK (role IN ('seller', 'co_seller', 'listing_agent', 'co_listing_agent',
                    'photographer', 'stager', 'inspector', 'other')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_contacts_listing ON listing_contacts(listing_id);
CREATE INDEX idx_listing_contacts_contact ON listing_contacts(contact_id);

-- -----------------------------------------------------------------------------
-- Listing checklist items: pre-listing tasks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'property_details', 'disclosures', 'photography', 'staging',
      'pricing', 'listing_description', 'mls_readiness', 'documents',
      'marketing', 'general'
    )),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'blocked')),
  assigned_to_user_id UUID REFERENCES user_profiles(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES user_profiles(id),
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  blocker_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_checklist_listing ON listing_checklist_items(listing_id);
CREATE INDEX idx_listing_checklist_status ON listing_checklist_items(status);
CREATE INDEX idx_listing_checklist_assigned ON listing_checklist_items(assigned_to_user_id);

-- -----------------------------------------------------------------------------
-- Listing stage transitions: audit trail for listing lifecycle
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_stage_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  triggered_by_user_id UUID REFERENCES user_profiles(id),
  trigger_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'automatic', 'policy', 'system')),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_stage_trans_listing ON listing_stage_transitions(listing_id);
CREATE INDEX idx_listing_stage_trans_org ON listing_stage_transitions(organization_id);

-- -----------------------------------------------------------------------------
-- Listing timeline events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'in_progress', 'completed', 'overdue', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('system', 'manual', 'ai_generated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_timeline_listing ON listing_timeline_events(listing_id);

-- -----------------------------------------------------------------------------
-- Listing exceptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'open'
    CHECK (resolution_status IN ('open', 'acknowledged', 'resolved')),
  resolved_by_user_id UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_exceptions_listing ON listing_exceptions(listing_id);
CREATE INDEX idx_listing_exceptions_status ON listing_exceptions(resolution_status);

-- -----------------------------------------------------------------------------
-- Offers: structured offer tracking for a listing
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  -- Buyer info
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_agent_name TEXT,
  buyer_agent_email TEXT,
  -- Financial
  offer_amount NUMERIC(14, 2) NOT NULL,
  earnest_money NUMERIC(14, 2),
  financing_type TEXT NOT NULL DEFAULT 'conventional'
    CHECK (financing_type IN ('conventional', 'fha', 'va', 'cash', 'usda', 'other')),
  -- Terms
  contingencies TEXT[] DEFAULT '{}',
  closing_timeline_days INTEGER,
  proposed_closing_date DATE,
  concessions_amount NUMERIC(14, 2),
  concessions_notes TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'under_review', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired')),
  offer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  -- Decision tracking
  seller_notes TEXT,
  decision_notes TEXT,
  decided_by_user_id UUID REFERENCES user_profiles(id),
  decided_at TIMESTAMPTZ,
  -- Counter offer
  counter_amount NUMERIC(14, 2),
  counter_notes TEXT,
  -- Metadata
  submitted_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offers_listing ON offers(listing_id);
CREATE INDEX idx_offers_org ON offers(organization_id);
CREATE INDEX idx_offers_status ON offers(status);

-- -----------------------------------------------------------------------------
-- Seller portal access: token-based access for sellers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seller_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  seller_email TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"view_progress": true, "upload_documents": true, "view_offers_summary": false}'::jsonb,
  last_accessed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  invited_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seller_portal_listing ON seller_portal_access(listing_id);
CREATE INDEX idx_seller_portal_token ON seller_portal_access(access_token);
CREATE INDEX idx_seller_portal_email ON seller_portal_access(seller_email);

-- -----------------------------------------------------------------------------
-- Seller document requests: docs needed from seller
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seller_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  requested_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  document_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'viewed', 'uploaded', 'expired', 'cancelled')),
  seller_portal_access_id UUID REFERENCES seller_portal_access(id),
  uploaded_document_id UUID REFERENCES documents(id),
  due_date DATE,
  viewed_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seller_doc_req_listing ON seller_document_requests(listing_id);
CREATE INDEX idx_seller_doc_req_status ON seller_document_requests(status);

-- -----------------------------------------------------------------------------
-- Listing handoff events: tracks conversion from listing to transaction
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_handoff_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id),
  offer_id UUID NOT NULL REFERENCES offers(id),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  handed_off_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  documents_transferred INTEGER DEFAULT 0,
  contacts_transferred INTEGER DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_handoff_listing ON listing_handoff_events(listing_id);
CREATE INDEX idx_handoff_transaction ON listing_handoff_events(transaction_id);

-- -----------------------------------------------------------------------------
-- Listing documents: link documents to listings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id),
  document_category TEXT NOT NULL DEFAULT 'general'
    CHECK (document_category IN (
      'disclosure', 'inspection', 'photography', 'marketing',
      'pricing', 'contract', 'addendum', 'general'
    )),
  uploaded_by_seller BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_docs_listing ON listing_documents(listing_id);
CREATE INDEX idx_listing_docs_document ON listing_documents(document_id);

-- -----------------------------------------------------------------------------
-- Add listing_id to search vectors for full-text search
-- -----------------------------------------------------------------------------
-- Extend search_vectors with listing support
ALTER TABLE recent_searches ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id);
