-- =============================================================================
-- seed.sql - Demo data for Real Estate Deal Desk
-- =============================================================================
-- All UUIDs are fixed so foreign-key references remain consistent.

-- ---------------------------------------------------------------------------
-- Organization
-- ---------------------------------------------------------------------------
INSERT INTO organizations (id, name) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Realty Partners Group');

-- ---------------------------------------------------------------------------
-- User Profiles
-- ---------------------------------------------------------------------------
INSERT INTO user_profiles (id, auth0_user_id, email, full_name) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'auth0|usr_611a2c3d4e5f', 'maria.gonzalez@realtypartners.com', 'Maria Gonzalez'),
  ('b0000000-0000-4000-8000-000000000002', 'auth0|usr_722b3d4e5f60', 'james.whitfield@realtypartners.com', 'James Whitfield'),
  ('b0000000-0000-4000-8000-000000000003', 'auth0|usr_833c4e5f6071', 'sarah.chen@realtypartners.com', 'Sarah Chen');

-- ---------------------------------------------------------------------------
-- Memberships
-- ---------------------------------------------------------------------------
INSERT INTO memberships (id, organization_id, user_profile_id, role) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'broker_admin'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'agent'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'coordinator');

-- ---------------------------------------------------------------------------
-- Properties
-- ---------------------------------------------------------------------------
INSERT INTO properties (id, organization_id, address_line_1, address_line_2, city, state, postal_code) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   '742 Evergreen Terrace', NULL, 'Boulder', 'CO', '80302'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   '1580 Canyon Blvd', 'Unit 204', 'Denver', 'CO', '80202');

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
INSERT INTO transactions (id, organization_id, title, status, property_id, created_by_user_id) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Purchase - 742 Evergreen Terrace', 'active',
   'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'Purchase - 1580 Canyon Blvd #204', 'draft',
   'd0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002');

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------
INSERT INTO contacts (id, organization_id, full_name, email, phone, contact_type) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Daniel Kowalski', 'daniel.kowalski@email.com', '(303) 555-1234', 'buyer'),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'Patricia Hernandez', 'patricia.h@email.com', '(720) 555-5678', 'seller'),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'First National Mortgage', 'loans@firstnational.com', '(303) 555-9012', 'lender'),
  ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'Robert Tanaka', 'rtanaka.inspections@email.com', '(720) 555-3456', 'inspector');

-- ---------------------------------------------------------------------------
-- Transaction Parties
-- ---------------------------------------------------------------------------
INSERT INTO transaction_parties (id, transaction_id, contact_id, role) VALUES
  ('10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-000000000001', 'buyer'),
  ('10000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-000000000002', 'seller'),
  ('10000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-000000000003', 'lender'),
  ('10000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000002',
   'f0000000-0000-4000-8000-000000000001', 'buyer');

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------
INSERT INTO documents (id, organization_id, transaction_id, file_name, storage_path, mime_type, file_size, uploaded_by_user_id, processing_status, document_type) VALUES
  ('20000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   'purchase_agreement_742_evergreen.pdf',
   'orgs/a0000000-0000-4000-8000-000000000001/txns/e0000000-0000-4000-8000-000000000001/purchase_agreement_742_evergreen.pdf',
   'application/pdf', 245760,
   'b0000000-0000-4000-8000-000000000002', 'pending', 'purchase_agreement'),
  ('20000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   'pre_approval_letter_kowalski.pdf',
   'orgs/a0000000-0000-4000-8000-000000000001/txns/e0000000-0000-4000-8000-000000000001/pre_approval_letter_kowalski.pdf',
   'application/pdf', 102400,
   'b0000000-0000-4000-8000-000000000003', 'pending', 'pre_approval_letter');

-- ---------------------------------------------------------------------------
-- Checklist Template
-- ---------------------------------------------------------------------------
INSERT INTO checklist_templates (id, organization_id, name, description, items) VALUES
  ('30000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Default Buyer Purchase Checklist',
   'Standard checklist for residential buyer purchase transactions in Colorado.',
   '[
     {"title": "Pre-approval letter received", "description": "Obtain and verify buyer mortgage pre-approval."},
     {"title": "Purchase agreement signed", "description": "Both parties sign the purchase agreement."},
     {"title": "Earnest money deposited", "description": "Deposit earnest money into escrow within 3 business days."},
     {"title": "Home inspection scheduled", "description": "Schedule and complete a home inspection."},
     {"title": "Appraisal ordered", "description": "Lender orders property appraisal."},
     {"title": "Title search completed", "description": "Title company completes title search and issues commitment."},
     {"title": "Loan approval received", "description": "Final mortgage approval from lender."},
     {"title": "Closing documents prepared", "description": "Title company prepares closing documents."},
     {"title": "Final walkthrough completed", "description": "Buyer completes final walkthrough of the property."},
     {"title": "Closing", "description": "Sign closing documents and transfer funds."}
   ]'::jsonb);

-- ---------------------------------------------------------------------------
-- Checklist Items (8 across 2 transactions)
-- ---------------------------------------------------------------------------
INSERT INTO checklist_items (id, transaction_id, title, description, due_date, status, source, requires_review) VALUES
  ('40000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'Pre-approval letter received',
   'Obtain and verify buyer mortgage pre-approval from First National Mortgage.',
   '2026-04-10', 'completed', 'template', false),
  ('40000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001',
   'Purchase agreement signed',
   'Both Daniel Kowalski and Patricia Hernandez sign the purchase agreement.',
   '2026-04-15', 'in_progress', 'template', false),
  ('40000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001',
   'Earnest money deposited',
   'Deposit $15,000 earnest money into escrow within 3 business days of agreement.',
   '2026-04-18', 'pending', 'template', false),
  ('40000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000001',
   'Home inspection scheduled',
   'Schedule home inspection with Robert Tanaka at 742 Evergreen Terrace.',
   '2026-04-22', 'pending', 'template', false),
  ('40000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000001',
   'Appraisal ordered',
   'Lender orders property appraisal for 742 Evergreen Terrace.',
   '2026-04-25', 'pending', 'ai_generated', true),
  ('40000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000002',
   'Pre-approval letter received',
   'Obtain buyer pre-approval for 1580 Canyon Blvd Unit 204.',
   '2026-04-20', 'pending', 'template', false),
  ('40000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000002',
   'Purchase agreement drafted',
   'Draft purchase agreement for Canyon Blvd condo.',
   '2026-04-25', 'pending', 'manual', false),
  ('40000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000002',
   'HOA documents requested',
   'Request HOA disclosures and financials from Canyon Blvd HOA.',
   '2026-04-22', 'pending', 'ai_generated', true);

-- ---------------------------------------------------------------------------
-- Timeline Events (6 events)
-- ---------------------------------------------------------------------------
INSERT INTO timeline_events (id, transaction_id, event_type, title, description, event_date, status, source) VALUES
  ('50000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'offer_submitted', 'Offer submitted', 'Buyer offer of $525,000 submitted to seller.',
   '2026-04-02 14:00:00-06', 'completed', 'system'),
  ('50000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001',
   'offer_accepted', 'Offer accepted', 'Seller accepted buyer offer at $518,000.',
   '2026-04-05 10:30:00-06', 'completed', 'system'),
  ('50000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001',
   'inspection_period', 'Inspection period begins', 'Inspection contingency period: April 15 - April 25.',
   '2026-04-15 00:00:00-06', 'upcoming', 'ai_generated'),
  ('50000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000001',
   'closing_date', 'Closing date', 'Target closing date for 742 Evergreen Terrace.',
   '2026-05-15 10:00:00-06', 'upcoming', 'system'),
  ('50000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000002',
   'transaction_created', 'Transaction created', 'Draft transaction created for 1580 Canyon Blvd #204.',
   '2026-04-03 09:15:00-06', 'completed', 'system'),
  ('50000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000002',
   'document_request', 'HOA documents requested', 'Requested HOA financial statements and meeting minutes.',
   '2026-04-08 11:00:00-06', 'upcoming', 'manual');

-- ---------------------------------------------------------------------------
-- Approvals (1 pending, 1 approved)
-- ---------------------------------------------------------------------------
INSERT INTO approvals (id, organization_id, transaction_id, approval_type, status, requested_by_user_id, decided_by_user_id, payload_json, decision_notes, decided_at) VALUES
  ('60000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'outbound_email', 'pending',
   'b0000000-0000-4000-8000-000000000003', NULL,
   '{"recipient": "daniel.kowalski@email.com", "subject": "Earnest Money Reminder"}',
   NULL, NULL),
  ('60000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'extraction_review', 'approved',
   'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001',
   '{"document_id": "20000000-0000-4000-8000-000000000001", "extraction_id": null}',
   'Extraction looks correct. Purchase price and dates match the signed agreement.',
   '2026-04-04 16:45:00-06');

-- ---------------------------------------------------------------------------
-- Outbound Messages
-- ---------------------------------------------------------------------------
INSERT INTO outbound_messages (id, organization_id, transaction_id, recipient_name, recipient_email, subject, body, status, approval_id, send_after) VALUES
  ('70000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   'Daniel Kowalski', 'daniel.kowalski@email.com',
   'Earnest Money Deposit Reminder - 742 Evergreen Terrace',
   E'Hi Daniel,\n\nThis is a friendly reminder that the earnest money deposit of $15,000 is due by April 18, 2026. Please wire funds to the escrow account listed in the purchase agreement.\n\nLet us know if you have any questions.\n\nBest regards,\nRealty Partners Group',
   'pending_approval',
   '60000000-0000-4000-8000-000000000001',
   '2026-04-12 09:00:00-06'),
  ('70000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   'Robert Tanaka', 'rtanaka.inspections@email.com',
   'Inspection Scheduling - 742 Evergreen Terrace, Boulder',
   E'Hi Robert,\n\nWe would like to schedule a home inspection at 742 Evergreen Terrace, Boulder, CO 80302. The inspection window is April 15-25, 2026. Please let us know your earliest availability.\n\nThank you,\nRealty Partners Group',
   'draft', NULL, NULL);

-- ---------------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------------
INSERT INTO reminders (id, organization_id, transaction_id, checklist_item_id, timeline_event_id, reminder_type, scheduled_for, status, outbound_message_id) VALUES
  ('80000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   '40000000-0000-4000-8000-000000000003', NULL,
   'deadline_approaching', '2026-04-16 09:00:00-06', 'pending',
   '70000000-0000-4000-8000-000000000001'),
  ('80000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   NULL, '50000000-0000-4000-8000-000000000003',
   'action_required', '2026-04-14 09:00:00-06', 'pending', NULL);

-- ---------------------------------------------------------------------------
-- Audit Logs
-- ---------------------------------------------------------------------------
INSERT INTO audit_logs (id, organization_id, transaction_id, actor_type, actor_user_id, action, target_type, target_id, metadata_json) VALUES
  ('90000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'user', 'b0000000-0000-4000-8000-000000000002',
   'create', 'transaction', 'e0000000-0000-4000-8000-000000000001',
   '{"title": "Purchase - 742 Evergreen Terrace"}'),
  ('90000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'user', 'b0000000-0000-4000-8000-000000000002',
   'upload', 'document', '20000000-0000-4000-8000-000000000001',
   '{"file_name": "purchase_agreement_742_evergreen.pdf"}'),
  ('90000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'ai', NULL,
   'generate', 'checklist_item', '40000000-0000-4000-8000-000000000005',
   '{"source": "ai_generated", "model": "gpt-4o", "confidence": 0.92}'),
  ('90000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'user', 'b0000000-0000-4000-8000-000000000001',
   'approve', 'approval', '60000000-0000-4000-8000-000000000002',
   '{"approval_type": "extraction_review", "decision": "approved"}');
