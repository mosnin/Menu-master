-- Migration 011: Auth hardening
-- Adds membership status, invite constraints, and indexes

-- Add status to memberships
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'removed'));

CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);

-- Add unique constraint on team_invites to prevent duplicate pending invites
-- (same email + same org + pending status)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invites_unique_pending
  ON team_invites(organization_id, email) WHERE status = 'pending';
