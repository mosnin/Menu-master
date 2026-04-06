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
-- Third transaction: closed deal with complete history
-- ---------------------------------------------------------------------------
INSERT INTO properties (id, organization_id, address_line_1, address_line_2, city, state, postal_code) VALUES
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   '2200 Pearl St', NULL, 'Boulder', 'CO', '80302');

INSERT INTO transactions (id, organization_id, title, status, property_id, created_by_user_id) VALUES
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Purchase - 2200 Pearl St (Closed)', 'closed',
   'd0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002');

INSERT INTO contacts (id, organization_id, full_name, email, phone, contact_type) VALUES
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'Emily Torres', 'emily.torres@email.com', '(303) 555-7890', 'buyer');

INSERT INTO transaction_parties (id, transaction_id, contact_id, role) VALUES
  ('10000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000003',
   'f0000000-0000-4000-8000-000000000005', 'buyer'),
  ('10000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000003',
   'f0000000-0000-4000-8000-000000000002', 'seller');

-- Document with completed extraction
INSERT INTO documents (id, organization_id, transaction_id, file_name, storage_path, mime_type, file_size, uploaded_by_user_id, processing_status, document_type) VALUES
  ('20000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000003',
   'purchase_agreement_2200_pearl.pdf',
   'orgs/a0000000-0000-4000-8000-000000000001/txns/e0000000-0000-4000-8000-000000000003/purchase_agreement_2200_pearl.pdf',
   'application/pdf', 312000,
   'b0000000-0000-4000-8000-000000000002', 'completed', 'purchase_agreement');

-- Document with failed extraction (edge case)
INSERT INTO documents (id, organization_id, transaction_id, file_name, storage_path, mime_type, file_size, uploaded_by_user_id, processing_status, document_type) VALUES
  ('20000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   'scanned_disclosure_form.pdf',
   'orgs/a0000000-0000-4000-8000-000000000001/txns/e0000000-0000-4000-8000-000000000001/scanned_disclosure_form.pdf',
   'application/pdf', 1540000,
   'b0000000-0000-4000-8000-000000000002', 'manual_review', NULL);

-- Extraction for completed document (high confidence)
INSERT INTO document_extractions (id, document_id, extraction_version, raw_model_output_json, normalized_data_json, confidence_score, extracted_at) VALUES
  ('25000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 1,
   '{"buyer_name": "Emily Torres", "seller_name": "Patricia Hernandez", "property_address": "2200 Pearl St, Boulder, CO 80302", "purchase_price": 475000, "earnest_money": 12000, "closing_date": "2026-03-15", "confidence": 0.96}'::jsonb,
   '{"buyer_name": "Emily Torres", "seller_name": "Patricia Hernandez", "property_address": "2200 Pearl St, Boulder, CO 80302", "purchase_price": 475000, "earnest_money": 12000, "closing_date": "2026-03-15", "confidence": 0.96}'::jsonb,
   0.96, '2026-03-02 14:30:00-07');

-- Extraction for failed document (low confidence, edge case)
INSERT INTO document_extractions (id, document_id, extraction_version, raw_model_output_json, normalized_data_json, confidence_score, extracted_at) VALUES
  ('25000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', 1,
   '{"error": "Text extraction yielded mostly garbled output from scanned image", "text_length": 47}'::jsonb,
   NULL,
   0.12, '2026-04-04 11:15:00-06');

-- Overdue checklist item (edge case)
INSERT INTO checklist_items (id, transaction_id, title, description, due_date, status, source, requires_review) VALUES
  ('40000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000001',
   'Submit seller disclosures',
   'Seller must provide all required property disclosures. OVERDUE.',
   '2026-03-28', 'pending', 'template', false);

-- Completed checklist items for closed transaction
INSERT INTO checklist_items (id, transaction_id, title, description, due_date, status, source, requires_review, completed_at) VALUES
  ('40000000-0000-4000-8000-000000000010', 'e0000000-0000-4000-8000-000000000003',
   'Earnest money deposited', 'Deposited $12,000 to escrow.',
   '2026-02-20', 'completed', 'template', false, '2026-02-19 10:00:00-07'),
  ('40000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000003',
   'Home inspection completed', 'Inspection passed with minor findings.',
   '2026-02-28', 'completed', 'template', false, '2026-02-27 14:30:00-07'),
  ('40000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000003',
   'Closing completed', 'All documents signed and funds transferred.',
   '2026-03-15', 'completed', 'template', false, '2026-03-15 11:00:00-07');

-- Timeline events for closed transaction
INSERT INTO timeline_events (id, transaction_id, event_type, title, description, event_date, status, source) VALUES
  ('50000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000003',
   'offer_submitted', 'Offer submitted', 'Buyer offer of $480,000 submitted.',
   '2026-02-10 09:00:00-07', 'completed', 'system'),
  ('50000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000003',
   'offer_accepted', 'Offer accepted', 'Seller accepted at $475,000.',
   '2026-02-12 16:00:00-07', 'completed', 'system'),
  ('50000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000003',
   'closing_date', 'Closing completed', 'Transaction closed successfully.',
   '2026-03-15 11:00:00-07', 'completed', 'system');

-- Sent outbound message (for closed transaction — shows completed workflow)
INSERT INTO approvals (id, organization_id, transaction_id, approval_type, status, requested_by_user_id, decided_by_user_id, payload_json, decision_notes, decided_at) VALUES
  ('60000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000003', 'outbound_email', 'approved',
   'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001',
   '{"message_id": "70000000-0000-4000-8000-000000000003", "recipient_email": "emily.torres@email.com", "subject": "Closing Confirmation"}',
   'Confirmed and approved for sending.',
   '2026-03-16 09:00:00-07');

INSERT INTO outbound_messages (id, organization_id, transaction_id, recipient_name, recipient_email, subject, body, status, approval_id, send_after, sent_at) VALUES
  ('70000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000003',
   'Emily Torres', 'emily.torres@email.com',
   'Closing Confirmation - 2200 Pearl St',
   E'Hi Emily,\n\nCongratulations! Your purchase of 2200 Pearl St, Boulder, CO 80302 has closed successfully. All documents have been recorded and keys will be available for pickup tomorrow.\n\nWelcome to your new home!\n\nBest regards,\nRealty Partners Group',
   'sent',
   '60000000-0000-4000-8000-000000000003',
   NULL, '2026-03-16 09:05:00-07');

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
   '{"approval_type": "extraction_review", "decision": "approved"}'),
  ('90000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'system', NULL,
   'document.processing_failed', 'document', '20000000-0000-4000-8000-000000000004',
   '{"file_name": "scanned_disclosure_form.pdf", "stage": "extraction", "reason": "Text extraction yielded mostly garbled output from scanned image"}'),
  ('90000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'ai', NULL,
   'extraction.low_confidence', 'document', '20000000-0000-4000-8000-000000000004',
   '{"document_type": null, "confidence": 0.12, "reason": "Confidence below 0.7 threshold"}'),
  ('90000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000003', 'user', 'b0000000-0000-4000-8000-000000000002',
   'create', 'transaction', 'e0000000-0000-4000-8000-000000000003',
   '{"title": "Purchase - 2200 Pearl St (Closed)"}'),
  ('90000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000003', 'system', NULL,
   'message.sent', 'outbound_message', '70000000-0000-4000-8000-000000000003',
   '{"recipient_email": "emily.torres@email.com", "subject": "Closing Confirmation - 2200 Pearl St"}'),
  ('90000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000003', 'user', 'b0000000-0000-4000-8000-000000000001',
   'transaction.status_changed', 'transaction', 'e0000000-0000-4000-8000-000000000003',
   '{"new_status": "closed"}');

-- ===========================================================================
-- Phase 4: External Collaboration & Closing Coordination seed data
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Fourth transaction: near closing (pending_closing) with high readiness
-- but one blocker (missing closing disclosure)
-- ---------------------------------------------------------------------------
INSERT INTO properties (id, organization_id, address_line_1, address_line_2, city, state, postal_code) VALUES
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   '900 Baseline Rd', 'Suite 100', 'Boulder', 'CO', '80302');

INSERT INTO transactions (id, organization_id, title, status, property_id, created_by_user_id) VALUES
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'Purchase - 900 Baseline Rd (Near Closing)', 'pending_closing',
   'd0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002');

INSERT INTO transaction_parties (id, transaction_id, contact_id, role) VALUES
  ('10000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000004',
   'f0000000-0000-4000-8000-000000000001', 'buyer'),
  ('10000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000004',
   'f0000000-0000-4000-8000-000000000002', 'seller');

-- Documents for near-closing transaction (4 of 5 required — missing closing_disclosure)
INSERT INTO documents (id, organization_id, transaction_id, file_name, storage_path, mime_type, file_size, uploaded_by_user_id, processing_status, document_type) VALUES
  ('20000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000004',
   'purchase_agreement_baseline.pdf',
   'orgs/a0000000-0000-4000-8000-000000000001/txns/e0000000-0000-4000-8000-000000000004/purchase_agreement_baseline.pdf',
   'application/pdf', 220000,
   'b0000000-0000-4000-8000-000000000002', 'completed', 'purchase_agreement'),
  ('20000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000004',
   'disclosure_baseline.pdf',
   'orgs/a0000000-0000-4000-8000-000000000001/txns/e0000000-0000-4000-8000-000000000004/disclosure_baseline.pdf',
   'application/pdf', 180000,
   'b0000000-0000-4000-8000-000000000002', 'completed', 'disclosure'),
  ('20000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000004',
   'title_commitment_baseline.pdf',
   'orgs/a0000000-0000-4000-8000-000000000001/txns/e0000000-0000-4000-8000-000000000004/title_commitment_baseline.pdf',
   'application/pdf', 150000,
   'b0000000-0000-4000-8000-000000000003', 'completed', 'title_commitment'),
  ('20000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000004',
   'proof_of_insurance_baseline.pdf',
   'orgs/a0000000-0000-4000-8000-000000000001/txns/e0000000-0000-4000-8000-000000000004/proof_of_insurance_baseline.pdf',
   'application/pdf', 95000,
   'b0000000-0000-4000-8000-000000000002', 'completed', 'proof_of_insurance');

-- Checklist items — most completed for the near-closing transaction
INSERT INTO checklist_items (id, transaction_id, title, description, due_date, status, source, requires_review, completed_at) VALUES
  ('40000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000004',
   'Purchase agreement signed', 'Signed by both parties.',
   '2026-03-15', 'completed', 'template', false, '2026-03-14 10:00:00-06'),
  ('40000000-0000-4000-8000-000000000014', 'e0000000-0000-4000-8000-000000000004',
   'Earnest money deposited', 'Deposited $20,000 to escrow.',
   '2026-03-18', 'completed', 'template', false, '2026-03-17 09:00:00-06'),
  ('40000000-0000-4000-8000-000000000015', 'e0000000-0000-4000-8000-000000000004',
   'Home inspection completed', 'Inspection passed.',
   '2026-03-25', 'completed', 'template', false, '2026-03-24 14:00:00-06'),
  ('40000000-0000-4000-8000-000000000016', 'e0000000-0000-4000-8000-000000000004',
   'Closing disclosure signed', 'Waiting for closing disclosure from title company.',
   '2026-04-08', 'pending', 'template', false, NULL);

-- Timeline event: closing date
INSERT INTO timeline_events (id, transaction_id, event_type, title, description, event_date, status, source) VALUES
  ('50000000-0000-4000-8000-000000000010', 'e0000000-0000-4000-8000-000000000004',
   'closing_date', 'Closing date', 'Target closing for 900 Baseline Rd.',
   '2026-04-10 10:00:00-06', 'upcoming', 'system');

-- ---------------------------------------------------------------------------
-- Collaborator invite: lender — accepted, with lender status updates
-- showing progress through milestones
-- ---------------------------------------------------------------------------
INSERT INTO collaborator_invites (
  id, organization_id, transaction_id, invited_by_user_id,
  email, full_name, role, status, access_token,
  expires_at, accepted_at, revoked_at, linked_user_id, permissions
) VALUES (
  'a1000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000004',
  'b0000000-0000-4000-8000-000000000003',
  'loans@firstnational.com',
  'First National Mortgage',
  'lender',
  'accepted',
  'collab-token-lender-001',
  '2026-05-03 00:00:00-06',
  '2026-03-10 11:00:00-06',
  NULL,
  NULL,
  '{"can_view_documents": true, "can_upload_documents": true, "can_update_status": true}'::jsonb
);

-- Lender status updates showing progress through milestones
INSERT INTO lender_status_updates (id, transaction_id, organization_id, submitted_by_email, milestone, status, notes) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'loans@firstnational.com',
   'pre_approval_received', 'completed', 'Buyer pre-approved for $600,000.'),
  ('a2000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'loans@firstnational.com',
   'underwriting_started', 'completed', 'Underwriting began March 12.'),
  ('a2000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'loans@firstnational.com',
   'appraisal_ordered', 'completed', 'Appraisal ordered March 18.'),
  ('a2000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'loans@firstnational.com',
   'appraisal_received', 'completed', 'Appraised at $560,000. No issues.'),
  ('a2000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'loans@firstnational.com',
   'conditional_approval', 'completed', 'Conditional approval received. Pending final docs.');

-- ---------------------------------------------------------------------------
-- Document request: waiting on buyer upload (status: sent, 5 days old)
-- ---------------------------------------------------------------------------
INSERT INTO document_requests (
  id, organization_id, transaction_id, requested_by_user_id,
  recipient_email, recipient_name, document_type, description,
  status, access_token, expires_at, viewed_at, uploaded_at, cancelled_at,
  reminder_count, last_reminder_at
) VALUES (
  'a3000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000004',
  'b0000000-0000-4000-8000-000000000003',
  'daniel.kowalski@email.com',
  'Daniel Kowalski',
  'proof_of_insurance',
  'Please upload proof of homeowner insurance for 900 Baseline Rd closing.',
  'sent',
  'docreq-token-buyer-001',
  '2026-04-14 00:00:00-06',
  NULL,
  NULL,
  NULL,
  0,
  NULL
);

-- ---------------------------------------------------------------------------
-- Title status updates: title search completed + escrow opened
-- ---------------------------------------------------------------------------
INSERT INTO title_status_updates (id, transaction_id, organization_id, submitted_by_email, milestone, status, notes) VALUES
  ('a4000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'title@bouldertitle.com',
   'title_search_started', 'completed', 'Title search initiated March 15.'),
  ('a4000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'title@bouldertitle.com',
   'title_search_completed', 'completed', 'Title search completed. Clean title found.'),
  ('a4000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'title@bouldertitle.com',
   'title_commitment_issued', 'completed', 'Title commitment issued March 22.'),
  ('a4000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'title@bouldertitle.com',
   'escrow_opened', 'completed', 'Escrow account opened. Earnest money received.'),
  ('a4000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'title@bouldertitle.com',
   'earnest_money_received', 'completed', 'Earnest money of $20,000 confirmed in escrow.');

-- ---------------------------------------------------------------------------
-- Closing readiness: nearly_ready with missing closing disclosure
-- ---------------------------------------------------------------------------
INSERT INTO closing_readiness (
  id, transaction_id, readiness_state, overall_score,
  document_score, financing_score, title_score, checklist_score, approval_score,
  unresolved_blockers, missing_documents, pending_items,
  target_closing_date, days_until_closing, computed_at
) VALUES (
  'a5000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000004',
  'nearly_ready',
  74,
  80, 75, 50, 75, 100,
  '[]'::jsonb,
  '[{"document_type": "closing_disclosure"}]'::jsonb,
  '[{"checklist_item_id": "40000000-0000-4000-8000-000000000016", "title": "Closing disclosure signed", "status": "pending", "due_date": "2026-04-08"}]'::jsonb,
  '2026-04-10',
  6,
  '2026-04-04 08:00:00-06'
);

-- ---------------------------------------------------------------------------
-- Deal health score: watch rating with responsiveness risk factor
-- ---------------------------------------------------------------------------
INSERT INTO deal_health_scores (
  id, transaction_id, organization_id,
  overall_score, rating,
  completeness_factor, timeliness_factor, responsiveness_factor, compliance_factor, financing_factor,
  risk_factors, positive_signals,
  previous_score, score_trend, computed_at
) VALUES (
  'a6000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000001',
  65, 'watch',
  80, 85, 40, 90, 70,
  '[{"factor": "responsiveness", "description": "Party responsiveness is low at 40%", "impact": 60}]'::jsonb,
  '[{"factor": "compliance", "description": "Compliance (exceptions) is strong at 90%"}, {"factor": "timeliness", "description": "Checklist timeliness is strong at 85%"}]'::jsonb,
  60,
  'improving',
  '2026-04-04 08:00:00-06'
);

-- ---------------------------------------------------------------------------
-- Response obligation: overdue from seller (3 days past expected_by)
-- ---------------------------------------------------------------------------
INSERT INTO response_obligations (
  id, transaction_id, organization_id,
  party_type, party_name, party_email,
  obligation_type, description,
  requested_at, expected_by, responded_at,
  status, source_type, source_id
) VALUES (
  'a7000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000001',
  'seller',
  'Patricia Hernandez',
  'patricia.h@email.com',
  'disclosure',
  'Provide signed seller disclosures for 900 Baseline Rd.',
  '2026-03-28 10:00:00-06',
  '2026-04-01 17:00:00-06',
  NULL,
  'overdue',
  NULL,
  NULL
);

-- A responded obligation (for reporting)
INSERT INTO response_obligations (
  id, transaction_id, organization_id,
  party_type, party_name, party_email,
  obligation_type, description,
  requested_at, expected_by, responded_at,
  status, source_type, source_id
) VALUES (
  'a7000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000001',
  'lender',
  'First National Mortgage',
  'loans@firstnational.com',
  'appraisal_status',
  'Provide appraisal status update.',
  '2026-03-18 09:00:00-06',
  '2026-03-22 17:00:00-06',
  '2026-03-20 14:00:00-06',
  'responded',
  NULL,
  NULL
);

-- ---------------------------------------------------------------------------
-- Daily digest preference for the demo user (Maria Gonzalez)
-- ---------------------------------------------------------------------------
INSERT INTO daily_digest_preferences (
  id, user_id, organization_id,
  is_enabled, delivery_hour, timezone,
  include_health_risks, include_deadlines, include_pending_approvals,
  include_stale_responses, include_closing_soon
) VALUES (
  'a8000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  true, 8, 'America/Denver',
  true, true, true,
  true, true
);

-- ---------------------------------------------------------------------------
-- Audit export job: completed status
-- ---------------------------------------------------------------------------
INSERT INTO audit_export_jobs (
  id, organization_id, transaction_id, requested_by_user_id,
  status, include_sections, export_format,
  result_storage_path, result_metadata, error_message,
  started_at, completed_at
) VALUES (
  'a9000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000004',
  'b0000000-0000-4000-8000-000000000001',
  'completed',
  '["summary", "timeline", "approvals", "documents", "corrections", "exceptions", "closing_readiness", "communications_metadata"]'::jsonb,
  'json',
  'exports/a0000000-0000-4000-8000-000000000001/e0000000-0000-4000-8000-000000000004/a9000000-0000-4000-8000-000000000001.json',
  '{"sections_included": ["summary","timeline","approvals","documents","corrections","exceptions","closing_readiness","communications_metadata"], "export_size_estimate": 45200}'::jsonb,
  NULL,
  '2026-04-04 07:00:00-06',
  '2026-04-04 07:02:00-06'
);

-- ===========================================================================
-- Phase 5: Brokerage Economics, Compliance, and Management Reporting seed data
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Office: Main Office for demo org
-- ---------------------------------------------------------------------------
INSERT INTO offices (id, organization_id, name, address, city, state, postal_code, is_active, managing_broker_id) VALUES
  ('ab000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Main Office', '100 Main St', 'Boulder', 'CO', '80302',
   true, 'b0000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Team: Alpha Team under Main Office
-- ---------------------------------------------------------------------------
INSERT INTO teams (id, organization_id, office_id, name, team_lead_id, is_active) VALUES
  ('ac000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'ab000000-0000-4000-8000-000000000001',
   'Alpha Team', 'b0000000-0000-4000-8000-000000000003', true);

-- ---------------------------------------------------------------------------
-- Office memberships: link demo users to Main Office / Alpha Team
-- ---------------------------------------------------------------------------
INSERT INTO office_memberships (id, user_id, office_id, team_id, role, is_primary) VALUES
  ('ad000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001',
   'ab000000-0000-4000-8000-000000000001',
   NULL, 'managing_broker', true),
  ('ad000000-0000-4000-8000-000000000002',
   'b0000000-0000-4000-8000-000000000002',
   'ab000000-0000-4000-8000-000000000001',
   'ac000000-0000-4000-8000-000000000001', 'agent', true),
  ('ad000000-0000-4000-8000-000000000003',
   'b0000000-0000-4000-8000-000000000003',
   'ab000000-0000-4000-8000-000000000001',
   'ac000000-0000-4000-8000-000000000001', 'team_lead', true);

-- ---------------------------------------------------------------------------
-- Transaction Economics
-- ---------------------------------------------------------------------------

-- Transaction 1: $425,000 purchase, 3% commission, buyer side, 70/30 split, 80% close prob
INSERT INTO transaction_economics (
  id, transaction_id, organization_id,
  purchase_price, commission_type, commission_rate, commission_amount,
  gross_commission, representation_side,
  brokerage_split_pct, brokerage_share, agent_share,
  has_referral, referral_fee_pct, referral_fee_amount, referral_party_name,
  net_brokerage_revenue,
  is_projected, is_finalized, finalized_at, finalized_by_user_id,
  close_probability, expected_close_date, notes
) VALUES (
  'ae000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  425000.00, 'percentage', 3.0000, NULL,
  12750.00, 'buyer',
  30.0000, 3825.00, 8925.00,
  false, NULL, NULL, NULL,
  3825.00,
  true, false, NULL, NULL,
  0.8000, '2026-05-15', 'Standard buyer purchase commission'
);

-- Transaction 2: $650,000, 2.5% commission, seller side, 65/35 split, 25% referral, 60% close prob
INSERT INTO transaction_economics (
  id, transaction_id, organization_id,
  purchase_price, commission_type, commission_rate, commission_amount,
  gross_commission, representation_side,
  brokerage_split_pct, brokerage_share, agent_share,
  has_referral, referral_fee_pct, referral_fee_amount, referral_party_name,
  net_brokerage_revenue,
  is_projected, is_finalized, finalized_at, finalized_by_user_id,
  close_probability, expected_close_date, notes
) VALUES (
  'ae000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  650000.00, 'percentage', 2.5000, NULL,
  16250.00, 'seller',
  35.0000, 5687.50, 10562.50,
  true, 25.0000, 4062.50, 'Colorado Referral Network',
  1625.00,
  true, false, NULL, NULL,
  0.6000, '2026-05-20', 'Seller listing with referral fee'
);

-- Transaction 3 (closed): $380,000, 3%, finalized economics
INSERT INTO transaction_economics (
  id, transaction_id, organization_id,
  purchase_price, commission_type, commission_rate, commission_amount,
  gross_commission, representation_side,
  brokerage_split_pct, brokerage_share, agent_share,
  has_referral, referral_fee_pct, referral_fee_amount, referral_party_name,
  net_brokerage_revenue,
  is_projected, is_finalized, finalized_at, finalized_by_user_id,
  close_probability, expected_close_date, notes
) VALUES (
  'ae000000-0000-4000-8000-000000000003',
  'e0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000001',
  380000.00, 'percentage', 3.0000, NULL,
  11400.00, 'buyer',
  30.0000, 3420.00, 7980.00,
  false, NULL, NULL, NULL,
  3420.00,
  false, true, '2026-03-15 12:00:00-06', 'b0000000-0000-4000-8000-000000000001',
  1.0000, '2026-03-15', 'Finalized at closing'
);

-- Transaction 4 (pending_closing): $525,000, 2.75%, 90% close prob, nearly ready
INSERT INTO transaction_economics (
  id, transaction_id, organization_id,
  purchase_price, commission_type, commission_rate, commission_amount,
  gross_commission, representation_side,
  brokerage_split_pct, brokerage_share, agent_share,
  has_referral, referral_fee_pct, referral_fee_amount, referral_party_name,
  net_brokerage_revenue,
  is_projected, is_finalized, finalized_at, finalized_by_user_id,
  close_probability, expected_close_date, notes
) VALUES (
  'ae000000-0000-4000-8000-000000000004',
  'e0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000001',
  525000.00, 'percentage', 2.7500, NULL,
  14437.50, 'buyer',
  30.0000, 4331.25, 10106.25,
  false, NULL, NULL, NULL,
  4331.25,
  true, false, NULL, NULL,
  0.9000, '2026-04-10', 'Pending closing — nearly ready'
);

-- ---------------------------------------------------------------------------
-- Commission Splits for Transaction 1 (agent 70%, brokerage 30%)
-- ---------------------------------------------------------------------------
INSERT INTO commission_splits (id, economics_id, recipient_type, recipient_user_id, recipient_name, split_pct, split_amount, notes) VALUES
  ('af000000-0000-4000-8000-000000000001',
   'ae000000-0000-4000-8000-000000000001',
   'agent', 'b0000000-0000-4000-8000-000000000002', 'James Whitfield',
   70.0000, 8925.00, 'Agent share — 70% of gross'),
  ('af000000-0000-4000-8000-000000000002',
   'ae000000-0000-4000-8000-000000000001',
   'brokerage', NULL, 'Realty Partners Group',
   30.0000, 3825.00, 'Brokerage share — 30% of gross');

-- ---------------------------------------------------------------------------
-- Policy Rules
-- ---------------------------------------------------------------------------

-- Rule 1: Required purchase agreement before active status (enforcement: block)
INSERT INTO policy_rules (
  id, organization_id, office_id, name, description,
  category, enforcement_mode, rule_config, applies_to_transaction_types,
  is_active, created_by_user_id
) VALUES (
  'b0100000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  NULL,
  'Required purchase agreement before active status',
  'All transactions must have a signed purchase agreement uploaded before transitioning to active status.',
  'required_document', 'block',
  '{"document_type": "purchase_agreement"}'::jsonb,
  '[]'::jsonb,
  true, 'b0000000-0000-4000-8000-000000000001'
);

-- Rule 2: Required economics before pending_closing (enforcement: warn)
INSERT INTO policy_rules (
  id, organization_id, office_id, name, description,
  category, enforcement_mode, rule_config, applies_to_transaction_types,
  is_active, created_by_user_id
) VALUES (
  'b0100000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  NULL,
  'Required economics before pending_closing',
  'Transaction economics with gross commission must be entered before a transaction moves to pending_closing status.',
  'required_economics', 'warn',
  '{"require_gross_commission": true}'::jsonb,
  '[]'::jsonb,
  true, 'b0000000-0000-4000-8000-000000000001'
);

-- ---------------------------------------------------------------------------
-- Compliance Issues
-- ---------------------------------------------------------------------------

-- Issue on Transaction 2: Missing title commitment (open, warning)
INSERT INTO compliance_issues (
  id, organization_id, transaction_id,
  category, severity, title, description,
  status, assigned_to_user_id,
  resolved_by_user_id, resolved_at, resolution_notes,
  policy_rule_id, metadata
) VALUES (
  'b0200000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000002',
  'missing_document', 'warning',
  'Missing title commitment',
  'Transaction draft for 1580 Canyon Blvd is missing a title commitment document.',
  'open', NULL,
  NULL, NULL, NULL,
  NULL,
  '{"document_type": "title_commitment"}'::jsonb
);

-- Issue on Transaction 1: resolved missing document issue
INSERT INTO compliance_issues (
  id, organization_id, transaction_id,
  category, severity, title, description,
  status, assigned_to_user_id,
  resolved_by_user_id, resolved_at, resolution_notes,
  policy_rule_id, metadata
) VALUES (
  'b0200000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  'missing_document', 'warning',
  'Missing pre-approval letter',
  'Pre-approval letter was initially missing from the transaction.',
  'resolved', 'b0000000-0000-4000-8000-000000000003',
  'b0000000-0000-4000-8000-000000000003', '2026-04-03 14:00:00-06',
  'Pre-approval letter uploaded and verified by Sarah Chen.',
  NULL,
  '{"document_type": "pre_approval_letter"}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Policy Override: pending approval for missing economics rule on Transaction 2
-- ---------------------------------------------------------------------------
INSERT INTO policy_overrides (
  id, policy_rule_id, transaction_id, organization_id,
  override_reason, overridden_by_user_id, approved_by_user_id,
  status, expires_at
) VALUES (
  'b0300000-0000-4000-8000-000000000001',
  'b0100000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'Transaction is still in draft — economics will be added once offer is accepted.',
  'b0000000-0000-4000-8000-000000000003', NULL,
  'pending', NULL
);

-- ---------------------------------------------------------------------------
-- Close Forecast Snapshot for current month (April 2026)
-- ---------------------------------------------------------------------------
INSERT INTO close_forecast_snapshots (
  id, organization_id, snapshot_date, forecast_month,
  total_projected, total_weighted, total_closed,
  transaction_count, at_risk_count,
  details, computed_at
) VALUES (
  'b0400000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '2026-04-04', '2026-04-01',
  14437.50, 12993.75, 0,
  1, 0,
  '[{"transaction_id": "e0000000-0000-4000-8000-000000000004", "gross_commission": 14437.50, "close_probability": 90, "weighted_amount": 12993.75, "status": "pending_closing", "expected_close_date": "2026-04-10"}]'::jsonb,
  '2026-04-04 08:30:00-06'
);

-- =============================================================================
-- Platform Completeness & Import/Diagnostics Seed Data
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Backfill stage column on transactions
-- ---------------------------------------------------------------------------
UPDATE transactions SET stage = 'due_diligence' WHERE id = 'e0000000-0000-4000-8000-000000000001';
UPDATE transactions SET stage = 'intake' WHERE id = 'e0000000-0000-4000-8000-000000000002';
UPDATE transactions SET stage = 'closed' WHERE id = 'e0000000-0000-4000-8000-000000000003';
UPDATE transactions SET stage = 'closing_prep' WHERE id = 'e0000000-0000-4000-8000-000000000004';

-- ---------------------------------------------------------------------------
-- Stage Transitions (audit trail for TX1 and TX4)
-- ---------------------------------------------------------------------------
INSERT INTO stage_transitions (id, transaction_id, organization_id, from_stage, to_stage, triggered_by_user_id, trigger_type, reason) VALUES
  ('c1000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'intake', 'under_contract', 'b0000000-0000-4000-8000-000000000003', 'manual',
   'Offer accepted by seller'),
  ('c1000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'under_contract', 'due_diligence', 'b0000000-0000-4000-8000-000000000003', 'manual',
   'Inspection period started'),
  ('c1000000-0000-4000-8000-000000000003',
   'e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'intake', 'under_contract', 'b0000000-0000-4000-8000-000000000003', 'manual', NULL),
  ('c1000000-0000-4000-8000-000000000004',
   'e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'under_contract', 'due_diligence', 'b0000000-0000-4000-8000-000000000003', 'manual', NULL),
  ('c1000000-0000-4000-8000-000000000005',
   'e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'due_diligence', 'financing', 'b0000000-0000-4000-8000-000000000003', 'manual', NULL),
  ('c1000000-0000-4000-8000-000000000006',
   'e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'financing', 'appraisal', 'b0000000-0000-4000-8000-000000000003', 'manual', NULL),
  ('c1000000-0000-4000-8000-000000000007',
   'e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'appraisal', 'title_and_escrow', 'b0000000-0000-4000-8000-000000000003', 'manual', NULL),
  ('c1000000-0000-4000-8000-000000000008',
   'e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'title_and_escrow', 'closing_prep', 'b0000000-0000-4000-8000-000000000003', 'manual',
   'Clear to close received from lender');

-- ---------------------------------------------------------------------------
-- Transaction Assignments
-- ---------------------------------------------------------------------------
INSERT INTO transaction_assignments (id, transaction_id, primary_agent_id, coordinator_owner_id, broker_reviewer_id) VALUES
  ('c2000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001'),
  ('c2000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000002',
   'b0000000-0000-4000-8000-000000000002', NULL, NULL),
  ('c2000000-0000-4000-8000-000000000003',
   'e0000000-0000-4000-8000-000000000003',
   'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001'),
  ('c2000000-0000-4000-8000-000000000004',
   'e0000000-0000-4000-8000-000000000004',
   'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Deal Health Scores for TX1, TX2, TX3 (TX4 already seeded)
-- ---------------------------------------------------------------------------
INSERT INTO deal_health_scores (
  id, transaction_id, organization_id, overall_score, rating,
  completeness_factor, timeliness_factor, responsiveness_factor,
  compliance_factor, financing_factor,
  risk_factors, positive_signals,
  previous_score, score_trend, computed_at
) VALUES
  -- TX1: 742 Evergreen — watch (overdue item, failed extraction)
  ('c3000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   68, 'watch',
   75, 70, 60, 80, 55,
   '[{"type": "overdue_checklist_item", "description": "Home inspection report overdue"}, {"type": "failed_extraction", "description": "Disclosure document extraction failed"}]'::jsonb,
   '[{"type": "active_agent", "description": "Agent responding within 24h"}]'::jsonb,
   72, 'declining', '2026-04-04 08:00:00-06'),
  -- TX2: Canyon Blvd — at_risk (draft with minimal data)
  ('c3000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   42, 'at_risk',
   30, 50, 40, 60, 30,
   '[{"type": "missing_documents", "description": "No documents uploaded"}, {"type": "missing_economics", "description": "Economics not configured"}]'::jsonb,
   '[]'::jsonb,
   NULL, NULL, '2026-04-04 08:00:00-06'),
  -- TX3: Pearl St — healthy (closed deal)
  ('c3000000-0000-4000-8000-000000000003',
   'e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   95, 'healthy',
   100, 100, 90, 95, 90,
   '[]'::jsonb,
   '[{"type": "deal_closed", "description": "Successfully closed"}, {"type": "all_documents_complete", "description": "All required documents on file"}]'::jsonb,
   92, 'improving', '2026-04-04 08:00:00-06');

-- ---------------------------------------------------------------------------
-- Closing Readiness for TX1, TX2 (TX3 closed, TX4 already seeded)
-- ---------------------------------------------------------------------------
INSERT INTO closing_readiness (
  id, transaction_id, readiness_state, overall_score,
  document_score, financing_score, title_score, checklist_score, approval_score,
  unresolved_blockers, missing_documents, pending_items,
  target_closing_date, days_until_closing, computed_at
) VALUES
  -- TX1: 742 Evergreen — at_risk
  ('c4000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   'at_risk', 52,
   60, 40, 30, 65, 70,
   '[{"type": "missing_financing", "description": "Appraisal not yet ordered"}]'::jsonb,
   '[{"type": "seller_disclosures"}, {"type": "preliminary_title_report"}]'::jsonb,
   '[{"type": "home_inspection", "due_date": "2026-04-01"}]'::jsonb,
   '2026-05-15', 41, '2026-04-04 08:00:00-06'),
  -- TX2: Canyon Blvd — not_ready (draft)
  ('c4000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000002',
   'not_ready', 15,
   0, 0, 0, 20, 50,
   '[{"type": "no_documents", "description": "No documents uploaded yet"}]'::jsonb,
   '[{"type": "purchase_agreement"}, {"type": "seller_disclosures"}, {"type": "pre_approval_letter"}]'::jsonb,
   '[]'::jsonb,
   NULL, NULL, '2026-04-04 08:00:00-06');

-- ---------------------------------------------------------------------------
-- Comments (team collaboration)
-- ---------------------------------------------------------------------------
INSERT INTO comments (
  id, organization_id, transaction_id, parent_comment_id,
  author_user_id, body, is_resolved, entity_type, entity_id
) VALUES
  -- TX1: Discussion about overdue inspection
  ('c5000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', NULL,
   'b0000000-0000-4000-8000-000000000003',
   'The home inspection report is overdue by 3 days. @James, can you follow up with the inspector?',
   false, 'transaction', 'e0000000-0000-4000-8000-000000000001'),
  -- Reply from James
  ('c5000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'c5000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000002',
   'Just spoke with Robert Tanaka — he had a scheduling conflict. Report will be delivered by EOD tomorrow.',
   false, 'transaction', 'e0000000-0000-4000-8000-000000000001'),
  -- TX1: Note on failed extraction
  ('c5000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', NULL,
   'b0000000-0000-4000-8000-000000000003',
   'AI extraction failed on the seller disclosure. The PDF appears to be a scanned image. Flagging for manual review.',
   false, 'document', '20000000-0000-4000-8000-000000000002'),
  -- TX4: Closing coordination
  ('c5000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004', NULL,
   'b0000000-0000-4000-8000-000000000001',
   'Clear to close received from First National. @Sarah, please schedule the closing for next week and send closing disclosure to all parties.',
   false, 'transaction', 'e0000000-0000-4000-8000-000000000004'),
  ('c5000000-0000-4000-8000-000000000005',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004',
   'c5000000-0000-4000-8000-000000000004',
   'b0000000-0000-4000-8000-000000000003',
   'Closing scheduled for April 10 at 2pm. Sending disclosure now. Still waiting on final title commitment.',
   false, 'transaction', 'e0000000-0000-4000-8000-000000000004'),
  -- TX3: Resolved note on closed deal
  ('c5000000-0000-4000-8000-000000000006',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003', NULL,
   'b0000000-0000-4000-8000-000000000001',
   'Commission disbursement confirmed. Deal fully closed. Great work team.',
   true, 'transaction', 'e0000000-0000-4000-8000-000000000003');

-- ---------------------------------------------------------------------------
-- Mentions (from comments above)
-- ---------------------------------------------------------------------------
INSERT INTO mentions (id, comment_id, mentioned_user_id, is_read) VALUES
  ('c6000000-0000-4000-8000-000000000001',
   'c5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', false),
  ('c6000000-0000-4000-8000-000000000002',
   'c5000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', true);

-- ---------------------------------------------------------------------------
-- Notifications (sample notifications for demo)
-- ---------------------------------------------------------------------------
INSERT INTO notifications (
  id, organization_id, user_id, category, title, body,
  entity_type, entity_id, transaction_id, action_url,
  is_read, priority, actor_user_id, actor_name
) VALUES
  -- Unread: Overdue item for Sarah
  ('c7000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003',
   'overdue_item', 'Checklist item overdue',
   'Home inspection report is 3 days past due on 742 Evergreen Terrace.',
   'checklist_item', '30000000-0000-4000-8000-000000000004',
   'e0000000-0000-4000-8000-000000000001',
   '/transactions/e0000000-0000-4000-8000-000000000001/checklist',
   false, 'high', NULL, NULL),
  -- Unread: Approval needed for Maria
  ('c7000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'approval_assigned', 'Approval pending',
   'Outbound email to Daniel Kowalski requires your review.',
   'approval', '40000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   '/transactions/e0000000-0000-4000-8000-000000000001/approvals',
   false, 'high', 'b0000000-0000-4000-8000-000000000003', 'Sarah Chen'),
  -- Unread: Stage changed for James
  ('c7000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
   'stage_changed', '900 Baseline Rd moved to Closing Prep',
   'Transaction moved from Title & Escrow to Closing Prep by Sarah Chen.',
   'transaction', 'e0000000-0000-4000-8000-000000000004',
   'e0000000-0000-4000-8000-000000000004',
   '/transactions/e0000000-0000-4000-8000-000000000004/overview',
   false, 'normal', 'b0000000-0000-4000-8000-000000000003', 'Sarah Chen'),
  -- Unread: Closing approaching for Sarah
  ('c7000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003',
   'closing_approaching', 'Closing in 6 days',
   '900 Baseline Rd closing scheduled for April 10. Missing: closing disclosure.',
   'transaction', 'e0000000-0000-4000-8000-000000000004',
   'e0000000-0000-4000-8000-000000000004',
   '/transactions/e0000000-0000-4000-8000-000000000004/closing',
   false, 'urgent', NULL, NULL),
  -- Read: Processing failure for Sarah
  ('c7000000-0000-4000-8000-000000000005',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003',
   'processing_failure', 'Document extraction failed',
   'AI extraction failed on seller_disclosure_742.pdf. Manual review required.',
   'document', '20000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000001',
   '/transactions/e0000000-0000-4000-8000-000000000001/documents',
   true, 'normal', NULL, NULL),
  -- Read: Mention notification for James
  ('c7000000-0000-4000-8000-000000000006',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
   'mention', 'Sarah Chen mentioned you',
   'The home inspection report is overdue by 3 days. @James, can you follow up...',
   'comment', 'c5000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   '/transactions/e0000000-0000-4000-8000-000000000001/overview',
   false, 'normal', 'b0000000-0000-4000-8000-000000000003', 'Sarah Chen');

-- ---------------------------------------------------------------------------
-- Transaction Completeness for TX1, TX2
-- ---------------------------------------------------------------------------
INSERT INTO transaction_completeness (
  id, transaction_id, readiness_state, completeness_score,
  missing_documents, missing_signatures, missing_dates,
  missing_financing, unresolved_reviews, blockers, computed_at
) VALUES
  ('c8000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   'needs_attention', 55,
   '[{"type": "seller_disclosures"}, {"type": "preliminary_title_report"}]'::jsonb,
   '[{"party": "seller", "document": "purchase_agreement"}]'::jsonb,
   '[{"date_type": "inspection_deadline", "status": "overdue"}]'::jsonb,
   '[{"type": "appraisal", "status": "not_ordered"}]'::jsonb,
   1,
   '[{"type": "overdue_inspection", "severity": "warning"}]'::jsonb,
   '2026-04-04 08:00:00-06'),
  ('c8000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000002',
   'not_ready', 10,
   '[{"type": "purchase_agreement"}, {"type": "seller_disclosures"}, {"type": "pre_approval_letter"}]'::jsonb,
   '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0,
   '[{"type": "no_documents", "severity": "critical"}]'::jsonb,
   '2026-04-04 08:00:00-06');

-- ---------------------------------------------------------------------------
-- Transaction Exceptions (one for TX1)
-- ---------------------------------------------------------------------------
INSERT INTO transaction_exceptions (
  id, transaction_id, exception_type, severity, title, description,
  resolution_status, metadata
) VALUES
  ('c9000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001',
   'counterparty_unresponsive', 'warning',
   'Inspector not responding',
   'Robert Tanaka has not delivered the inspection report. Report was due April 1.',
   'open',
   '{"contact_name": "Robert Tanaka", "days_overdue": 3}'::jsonb);

-- ---------------------------------------------------------------------------
-- Additional Collaborator Invites (pending + expired)
-- ---------------------------------------------------------------------------
INSERT INTO collaborator_invites (
  id, organization_id, transaction_id, invited_by_user_id,
  email, full_name, role, status, access_token, expires_at, permissions
) VALUES
  -- Pending invite for title company on TX4
  ('ca000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004',
   'b0000000-0000-4000-8000-000000000003',
   'escrow@mountainescrow.com', 'Mountain Escrow Services',
   'escrow_officer', 'pending',
   'tkn_pending_escrow_900baseline',
   '2026-04-15 00:00:00-06',
   '{"view_documents": true, "upload_documents": true, "view_checklist": false}'::jsonb),
  -- Expired invite for appraiser on TX1
  ('ca000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000003',
   'appraisals@rockymtn.com', 'Rocky Mountain Appraisals',
   'appraiser', 'expired',
   'tkn_expired_appraiser_742',
   '2026-03-20 00:00:00-06',
   '{"view_documents": true, "upload_documents": true, "view_checklist": false}'::jsonb);

-- =============================================================================
-- Phase 8: Listings, Offers, and Seller Workflow seed data
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
-- L1: In-prep listing (missing disclosures)
INSERT INTO listings (id, organization_id, property_id, created_by_user_id, title, listing_stage, listing_type,
  list_price, listing_description, target_launch_date, seller_name, seller_email, seller_phone,
  readiness_score, readiness_state) VALUES
('d1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
 '742 Evergreen Terrace', 'preparing', 'residential',
 485000, 'Charming 3BR/2BA in desirable Evergreen neighborhood', '2026-04-20',
 'Robert Williams', 'robert.williams@email.com', '(512) 555-7742',
 35, 'needs_attention');

-- L2: Ready-to-launch listing
INSERT INTO listings (id, organization_id, property_id, created_by_user_id, title, listing_stage, listing_type,
  list_price, listing_description, target_launch_date, seller_name, seller_email,
  readiness_score, readiness_state) VALUES
('d1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002',
 '1200 Summit View Drive', 'ready_to_launch', 'residential',
 725000, 'Stunning 4BR/3BA with panoramic mountain views', '2026-04-10',
 'Patricia Henderson', 'patricia.h@email.com',
 92, 'ready');

-- L3: Live listing with multiple offers
INSERT INTO listings (id, organization_id, property_id, created_by_user_id, title, listing_stage, listing_type,
  list_price, listing_description, actual_launch_date, seller_name, seller_email,
  readiness_score, readiness_state, mls_number) VALUES
('d1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003',
 '89 Copper Ridge Lane', 'live', 'residential',
 550000, 'Move-in ready 3BR townhome in Copper Ridge community', '2026-03-25',
 'David & Karen Martinez', 'martinez.dk@email.com',
 100, 'ready', 'MLS-2026-4489');

-- L4: Under contract listing (accepted offer, converted)
INSERT INTO listings (id, organization_id, property_id, created_by_user_id, title, listing_stage, listing_type,
  list_price, seller_name, seller_email,
  readiness_score, readiness_state, converted_transaction_id, converted_at) VALUES
('d1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
 'c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001',
 '456 Maple Court', 'under_contract', 'residential',
 390000, 'Thomas Anderson', 'tanderson@email.com',
 100, 'ready', 'e0000000-0000-4000-8000-000000000004', '2026-03-28 14:30:00-06');

-- ---------------------------------------------------------------------------
-- Listing checklist items for L1 (preparing, with gaps)
-- ---------------------------------------------------------------------------
INSERT INTO listing_checklist_items (id, listing_id, title, category, status, is_required, sort_order, description) VALUES
('d2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
 'Review property details', 'property_details', 'completed', true, 1, 'Confirmed sq ft, rooms, lot size'),
('d2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001',
 'Gather seller disclosures', 'disclosures', 'pending', true, 2, 'Waiting on seller for lead paint and property condition disclosures'),
('d2000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000001',
 'Schedule photography', 'photography', 'in_progress', true, 3, 'Photographer booked for April 12'),
('d2000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000001',
 'Complete pricing analysis', 'pricing', 'completed', true, 4, 'CMA completed, list price agreed with seller'),
('d2000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-000000000001',
 'Write listing description', 'listing_description', 'pending', true, 5, null),
('d2000000-0000-4000-8000-000000000006', 'd1000000-0000-4000-8000-000000000001',
 'Verify MLS readiness', 'mls_readiness', 'pending', true, 6, null),
('d2000000-0000-4000-8000-000000000007', 'd1000000-0000-4000-8000-000000000001',
 'Coordinate staging', 'staging', 'skipped', false, 7, 'Seller declined staging');

-- Checklist items for L2 (ready to launch, all required complete)
INSERT INTO listing_checklist_items (id, listing_id, title, category, status, is_required, sort_order) VALUES
('d2000000-0000-4000-8000-000000000010', 'd1000000-0000-4000-8000-000000000002',
 'Review property details', 'property_details', 'completed', true, 1),
('d2000000-0000-4000-8000-000000000011', 'd1000000-0000-4000-8000-000000000002',
 'Gather seller disclosures', 'disclosures', 'completed', true, 2),
('d2000000-0000-4000-8000-000000000012', 'd1000000-0000-4000-8000-000000000002',
 'Schedule photography', 'photography', 'completed', true, 3),
('d2000000-0000-4000-8000-000000000013', 'd1000000-0000-4000-8000-000000000002',
 'Complete pricing analysis', 'pricing', 'completed', true, 4),
('d2000000-0000-4000-8000-000000000014', 'd1000000-0000-4000-8000-000000000002',
 'Write listing description', 'listing_description', 'completed', true, 5),
('d2000000-0000-4000-8000-000000000015', 'd1000000-0000-4000-8000-000000000002',
 'Verify MLS readiness', 'mls_readiness', 'completed', true, 6);

-- ---------------------------------------------------------------------------
-- Listing stage transitions
-- ---------------------------------------------------------------------------
INSERT INTO listing_stage_transitions (id, listing_id, organization_id, from_stage, to_stage, triggered_by_user_id, trigger_type) VALUES
('d3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
 'a0000000-0000-4000-8000-000000000001', 'intake', 'preparing',
 'b0000000-0000-4000-8000-000000000001', 'manual'),
('d3000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002',
 'a0000000-0000-4000-8000-000000000001', 'intake', 'preparing',
 'b0000000-0000-4000-8000-000000000002', 'manual'),
('d3000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000002',
 'a0000000-0000-4000-8000-000000000001', 'preparing', 'ready_for_review',
 'b0000000-0000-4000-8000-000000000002', 'manual'),
('d3000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000002',
 'a0000000-0000-4000-8000-000000000001', 'ready_for_review', 'ready_to_launch',
 'b0000000-0000-4000-8000-000000000001', 'manual'),
('d3000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-000000000003',
 'a0000000-0000-4000-8000-000000000001', 'intake', 'preparing',
 'b0000000-0000-4000-8000-000000000003', 'manual'),
('d3000000-0000-4000-8000-000000000006', 'd1000000-0000-4000-8000-000000000003',
 'a0000000-0000-4000-8000-000000000001', 'preparing', 'ready_to_launch',
 'b0000000-0000-4000-8000-000000000003', 'manual'),
('d3000000-0000-4000-8000-000000000007', 'd1000000-0000-4000-8000-000000000003',
 'a0000000-0000-4000-8000-000000000001', 'ready_to_launch', 'live',
 'b0000000-0000-4000-8000-000000000003', 'manual');

-- ---------------------------------------------------------------------------
-- Listing exceptions for L1
-- ---------------------------------------------------------------------------
INSERT INTO listing_exceptions (id, listing_id, exception_type, severity, title, description, resolution_status) VALUES
('d4000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
 'missing_disclosures', 'critical', 'Seller disclosures overdue',
 'Lead paint and property condition disclosures not yet received from seller', 'open'),
('d4000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001',
 'photography_not_scheduled', 'warning', 'Photography not confirmed',
 'Photographer booked but not yet confirmed for April 12', 'acknowledged');

-- ---------------------------------------------------------------------------
-- Offers for L3 (live listing with 3 offers)
-- ---------------------------------------------------------------------------
INSERT INTO offers (id, listing_id, organization_id, buyer_name, buyer_email, buyer_agent_name,
  offer_amount, earnest_money, financing_type, contingencies, closing_timeline_days,
  concessions_amount, status, offer_date, submitted_by_user_id) VALUES
-- Offer 1: Strong cash offer
('d5000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003',
 'a0000000-0000-4000-8000-000000000001',
 'Jennifer Walsh', 'jwalsh@email.com', 'Mike Torres',
 565000, 15000, 'cash', '{}', 21, 0,
 'under_review', '2026-03-30', 'b0000000-0000-4000-8000-000000000003'),
-- Offer 2: FHA with concessions
('d5000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000003',
 'a0000000-0000-4000-8000-000000000001',
 'Marcus & Lisa Johnson', 'mjohnson@email.com', 'Amy Lin',
 540000, 10000, 'fha', '{"inspection", "appraisal", "financing"}', 45, 12000,
 'received', '2026-04-01', 'b0000000-0000-4000-8000-000000000003'),
-- Offer 3: Conventional, competitive
('d5000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000003',
 'a0000000-0000-4000-8000-000000000001',
 'Rachel Kim', 'rkim@email.com', null,
 555000, 12000, 'conventional', '{"inspection"}', 30, 5000,
 'received', '2026-04-02', 'b0000000-0000-4000-8000-000000000003');

-- Accepted offer for L4 (under contract)
INSERT INTO offers (id, listing_id, organization_id, buyer_name, buyer_email,
  offer_amount, earnest_money, financing_type, closing_timeline_days,
  status, offer_date, decided_by_user_id, decided_at, decision_notes,
  submitted_by_user_id) VALUES
('d5000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000004',
 'a0000000-0000-4000-8000-000000000001',
 'Brian & Sara Cooper', 'cooper.bs@email.com',
 395000, 10000, 'conventional', 35,
 'accepted', '2026-03-25',
 'b0000000-0000-4000-8000-000000000001', '2026-03-28 14:00:00-06',
 'Strong offer, minimal contingencies, quick close',
 'b0000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Seller portal access
-- ---------------------------------------------------------------------------
INSERT INTO seller_portal_access (id, listing_id, organization_id, seller_email, seller_name,
  access_token, is_active, invited_by_user_id, permissions) VALUES
-- Active access for L1 seller
('d6000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
 'a0000000-0000-4000-8000-000000000001',
 'robert.williams@email.com', 'Robert Williams',
 'sp_tkn_742evergreen_a1b2c3d4e5f6', true,
 'b0000000-0000-4000-8000-000000000001',
 '{"view_progress": true, "upload_documents": true, "view_offers_summary": false}'::jsonb),
-- Active access for L3 seller
('d6000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000003',
 'a0000000-0000-4000-8000-000000000001',
 'martinez.dk@email.com', 'David Martinez',
 'sp_tkn_89copper_g7h8i9j0k1l2', true,
 'b0000000-0000-4000-8000-000000000003',
 '{"view_progress": true, "upload_documents": true, "view_offers_summary": true}'::jsonb);

-- ---------------------------------------------------------------------------
-- Seller document requests
-- ---------------------------------------------------------------------------
INSERT INTO seller_document_requests (id, listing_id, organization_id, requested_by_user_id,
  document_type, description, status, seller_portal_access_id, due_date) VALUES
-- Pending disclosure for L1
('d7000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
 'Seller Property Disclosures', 'Lead paint disclosure and property condition report',
 'pending', 'd6000000-0000-4000-8000-000000000001', '2026-04-12'),
-- Uploaded HOA docs for L1
('d7000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001',
 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
 'HOA Documents', 'CC&Rs and HOA financial statements',
 'uploaded', 'd6000000-0000-4000-8000-000000000001', '2026-04-08');

-- ---------------------------------------------------------------------------
-- Listing handoff event for L4
-- ---------------------------------------------------------------------------
INSERT INTO listing_handoff_events (id, listing_id, offer_id, transaction_id, organization_id,
  handed_off_by_user_id, documents_transferred, contacts_transferred, notes) VALUES
('d8000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004',
 'd5000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004',
 'a0000000-0000-4000-8000-000000000001',
 'b0000000-0000-4000-8000-000000000001', 3, 2,
 'Clean handoff — all listing docs and seller contacts carried forward');

-- ===========================================================================
-- Workflow Builder Seed Data
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Workflow 1: "Completeness Check on Document Upload" (published)
-- ---------------------------------------------------------------------------
INSERT INTO workflows (id, organization_id, name, description, created_by_user_id, is_active) VALUES
('e1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
 'Completeness Check on Document Upload',
 'Evaluates transaction completeness whenever a document is uploaded. Notifies coordinator if score drops below 70%.',
 'b0000000-0000-4000-8000-000000000001', true);

-- Version 1 (archived)
INSERT INTO workflow_versions (id, workflow_id, version_number, status, graph_data,
  validation_errors, published_by_user_id, published_at, created_by_user_id) VALUES
('e2000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 1, 'archived',
 '{"nodes": [
    {"id": "start_1", "type": "start", "label": "Start", "config": {}, "position": {"x": 0, "y": 0}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "eval_1", "type": "evaluate_transaction_completeness", "label": "Evaluate Completeness", "config": {}, "position": {"x": 200, "y": 0}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "stop_1", "type": "stop", "label": "End", "config": {}, "position": {"x": 400, "y": 0}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null}
  ], "edges": [
    {"id": "e_start_eval", "source_node_id": "start_1", "target_node_id": "eval_1", "condition": null, "label": null, "order": 0},
    {"id": "e_eval_stop", "source_node_id": "eval_1", "target_node_id": "stop_1", "condition": null, "label": null, "order": 0}
  ], "triggers": []}'::jsonb,
 '[]'::jsonb,
 'b0000000-0000-4000-8000-000000000001', '2026-03-15 10:00:00-06',
 'b0000000-0000-4000-8000-000000000001');

-- Version 2 (published) — adds condition branch for low score notification
INSERT INTO workflow_versions (id, workflow_id, version_number, status, graph_data,
  validation_errors, published_by_user_id, published_at, created_by_user_id) VALUES
('e2000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001', 2, 'published',
 '{"nodes": [
    {"id": "start_1", "type": "start", "label": "Start", "config": {}, "position": {"x": 0, "y": 100}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "eval_1", "type": "evaluate_transaction_completeness", "label": "Evaluate Completeness", "config": {}, "position": {"x": 200, "y": 100}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "cond_1", "type": "condition", "label": "Score < 70?", "config": {"expression": "output.score < 70"}, "position": {"x": 400, "y": 100}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "notify_1", "type": "create_notification", "label": "Notify Low Score", "config": {"recipient_role": "coordinator", "severity": "warning", "template": "completeness_low"}, "position": {"x": 600, "y": 0}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "stop_1", "type": "stop", "label": "End (notified)", "config": {}, "position": {"x": 800, "y": 0}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "stop_2", "type": "stop", "label": "End (ok)", "config": {}, "position": {"x": 600, "y": 200}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null}
  ], "edges": [
    {"id": "e_start_eval", "source_node_id": "start_1", "target_node_id": "eval_1", "condition": null, "label": null, "order": 0},
    {"id": "e_eval_cond", "source_node_id": "eval_1", "target_node_id": "cond_1", "condition": null, "label": null, "order": 0},
    {"id": "e_cond_notify", "source_node_id": "cond_1", "target_node_id": "notify_1", "condition": "output.score < 70", "label": "Low score", "order": 0},
    {"id": "e_cond_stop2", "source_node_id": "cond_1", "target_node_id": "stop_2", "condition": "output.score >= 70", "label": "OK", "order": 1},
    {"id": "e_notify_stop1", "source_node_id": "notify_1", "target_node_id": "stop_1", "condition": null, "label": null, "order": 0}
  ], "triggers": [
    {"event_type": "document_uploaded", "event_filter": {}}
  ]}'::jsonb,
 '[]'::jsonb,
 'b0000000-0000-4000-8000-000000000001', '2026-03-20 14:00:00-06',
 'b0000000-0000-4000-8000-000000000001');

-- Trigger for Workflow 1
INSERT INTO workflow_triggers (id, workflow_id, workflow_version_id, event_type, event_filter, is_active) VALUES
('e3000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001',
 'e2000000-0000-4000-8000-000000000002', 'document_uploaded', '{}'::jsonb, true);

-- Completed run for Workflow 1
INSERT INTO workflow_runs (id, workflow_id, workflow_version_id, organization_id, status,
  trigger_event_type, trigger_payload, context_data, current_node_id,
  started_at, completed_at, entity_type, entity_id,
  initiated_by_user_id, total_steps, completed_steps) VALUES
('e4000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001',
 'e2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
 'completed', 'document_uploaded',
 '{"document_id": "c4000000-0000-4000-8000-000000000001"}'::jsonb,
 '{"transaction_id": "e0000000-0000-4000-8000-000000000001", "score": 62}'::jsonb,
 'stop_1',
 '2026-03-25 09:00:00-06', '2026-03-25 09:00:04-06',
 'transaction', 'e0000000-0000-4000-8000-000000000001',
 null, 4, 4);

-- 4 steps for the completed run (start → eval → condition → notify → stop)
INSERT INTO workflow_run_steps (id, run_id, node_id, node_type, node_label, step_number,
  status, input_data, output_data, started_at, completed_at, duration_ms) VALUES
('e5000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001',
 'start_1', 'start', 'Start', 1, 'completed',
 '{}'::jsonb, '{}'::jsonb,
 '2026-03-25 09:00:00-06', '2026-03-25 09:00:00-06', 5),
('e5000000-0000-4000-8000-000000000002', 'e4000000-0000-4000-8000-000000000001',
 'eval_1', 'evaluate_transaction_completeness', 'Evaluate Completeness', 2, 'completed',
 '{"transaction_id": "e0000000-0000-4000-8000-000000000001"}'::jsonb,
 '{"score": 62, "missing_items": ["seller_disclosure", "inspection_report"]}'::jsonb,
 '2026-03-25 09:00:00-06', '2026-03-25 09:00:02-06', 1850),
('e5000000-0000-4000-8000-000000000003', 'e4000000-0000-4000-8000-000000000001',
 'cond_1', 'condition', 'Score < 70?', 3, 'completed',
 '{"score": 62}'::jsonb, '{"branch": "low_score"}'::jsonb,
 '2026-03-25 09:00:02-06', '2026-03-25 09:00:02-06', 10),
('e5000000-0000-4000-8000-000000000004', 'e4000000-0000-4000-8000-000000000001',
 'notify_1', 'create_notification', 'Notify Low Score', 4, 'completed',
 '{"recipient_role": "coordinator", "severity": "warning"}'::jsonb,
 '{"notification_id": "generated-notif-001"}'::jsonb,
 '2026-03-25 09:00:02-06', '2026-03-25 09:00:04-06', 1500);

-- ---------------------------------------------------------------------------
-- Workflow 2: "Listing Launch Readiness" (draft, incomplete)
-- ---------------------------------------------------------------------------
INSERT INTO workflows (id, organization_id, name, description, created_by_user_id, is_active) VALUES
('e1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
 'Listing Launch Readiness',
 'Checks whether a listing is ready to go live. Work in progress — graph incomplete.',
 'b0000000-0000-4000-8000-000000000002', true);

-- Version 1 (draft, has validation errors)
INSERT INTO workflow_versions (id, workflow_id, version_number, status, graph_data,
  validation_errors, created_by_user_id) VALUES
('e2000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000002', 1, 'draft',
 '{"nodes": [
    {"id": "start_1", "type": "start", "label": "Start", "config": {}, "position": {"x": 0, "y": 0}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "eval_lr", "type": "evaluate_listing_readiness", "label": "Evaluate Listing Readiness", "config": {}, "position": {"x": 200, "y": 0}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null}
  ], "edges": [
    {"id": "e_start_eval", "source_node_id": "start_1", "target_node_id": "eval_lr", "condition": null, "label": null, "order": 0}
  ], "triggers": []}'::jsonb,
 '[{"code": "NO_STOP_NODE", "message": "Workflow must have at least one stop node"}]'::jsonb,
 'b0000000-0000-4000-8000-000000000002');

-- No triggers, no runs for Workflow 2

-- ---------------------------------------------------------------------------
-- Workflow 3: "Closing Prep Workflow" (published)
-- ---------------------------------------------------------------------------
INSERT INTO workflows (id, organization_id, name, description, created_by_user_id, is_active) VALUES
('e1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
 'Closing Prep Workflow',
 'Checks closing readiness on stage change. If ready, transitions stage. If not, creates checklist item and waits for human review.',
 'b0000000-0000-4000-8000-000000000001', true);

-- Version 1 (published)
INSERT INTO workflow_versions (id, workflow_id, version_number, status, graph_data,
  validation_errors, published_by_user_id, published_at, created_by_user_id) VALUES
('e2000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000003', 1, 'published',
 '{"nodes": [
    {"id": "start_1", "type": "start", "label": "Start", "config": {}, "position": {"x": 0, "y": 100}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "eval_cr", "type": "evaluate_closing_readiness", "label": "Evaluate Closing Readiness", "config": {}, "position": {"x": 200, "y": 100}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "cond_1", "type": "condition", "label": "Ready to Close?", "config": {"expression": "output.ready === true"}, "position": {"x": 400, "y": 100}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "transition_1", "type": "transition_transaction_stage", "label": "Advance to Closing", "config": {"target_stage": "closing"}, "position": {"x": 600, "y": 0}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "stop_1", "type": "stop", "label": "End (advanced)", "config": {}, "position": {"x": 800, "y": 0}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "checklist_1", "type": "create_checklist_item", "label": "Create Closing Checklist", "config": {"checklist_template": "closing_prep"}, "position": {"x": 600, "y": 200}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "hc_1", "type": "human_checkpoint", "label": "Coordinator Review", "config": {"assignee_role": "coordinator"}, "position": {"x": 800, "y": 200}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null},
    {"id": "stop_2", "type": "stop", "label": "End (needs work)", "config": {}, "position": {"x": 1000, "y": 200}, "input_mapping": {}, "output_contract": {}, "retry_policy": null, "timeout_ms": null}
  ], "edges": [
    {"id": "e_start_eval", "source_node_id": "start_1", "target_node_id": "eval_cr", "condition": null, "label": null, "order": 0},
    {"id": "e_eval_cond", "source_node_id": "eval_cr", "target_node_id": "cond_1", "condition": null, "label": null, "order": 0},
    {"id": "e_cond_transition", "source_node_id": "cond_1", "target_node_id": "transition_1", "condition": "output.ready === true", "label": "Ready", "order": 0},
    {"id": "e_cond_checklist", "source_node_id": "cond_1", "target_node_id": "checklist_1", "condition": "output.ready === false", "label": "Not ready", "order": 1},
    {"id": "e_transition_stop1", "source_node_id": "transition_1", "target_node_id": "stop_1", "condition": null, "label": null, "order": 0},
    {"id": "e_checklist_hc", "source_node_id": "checklist_1", "target_node_id": "hc_1", "condition": null, "label": null, "order": 0},
    {"id": "e_hc_stop2", "source_node_id": "hc_1", "target_node_id": "stop_2", "condition": null, "label": null, "order": 0}
  ], "triggers": [
    {"event_type": "stage_changed", "event_filter": {"to_stage": "pre_closing"}}
  ]}'::jsonb,
 '[]'::jsonb,
 'b0000000-0000-4000-8000-000000000001', '2026-03-28 16:00:00-06',
 'b0000000-0000-4000-8000-000000000001');

-- Trigger for Workflow 3
INSERT INTO workflow_triggers (id, workflow_id, workflow_version_id, event_type, event_filter, is_active) VALUES
('e3000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000003',
 'e2000000-0000-4000-8000-000000000004', 'stage_changed',
 '{"to_stage": "pre_closing"}'::jsonb, true);

-- Running run for Workflow 3 (currently waiting at human checkpoint)
INSERT INTO workflow_runs (id, workflow_id, workflow_version_id, organization_id, status,
  trigger_event_type, trigger_payload, context_data, current_node_id,
  started_at, entity_type, entity_id,
  initiated_by_user_id, total_steps, completed_steps) VALUES
('e4000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000003',
 'e2000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
 'waiting', 'stage_changed',
 '{"from_stage": "active", "to_stage": "pre_closing"}'::jsonb,
 '{"transaction_id": "e0000000-0000-4000-8000-000000000004", "ready": false}'::jsonb,
 'hc_1',
 '2026-04-01 11:00:00-06',
 'transaction', 'e0000000-0000-4000-8000-000000000004',
 null, 5, 3);

-- Steps for the running run (3 completed, 1 waiting)
INSERT INTO workflow_run_steps (id, run_id, node_id, node_type, node_label, step_number,
  status, input_data, output_data, started_at, completed_at, duration_ms) VALUES
('e5000000-0000-4000-8000-000000000005', 'e4000000-0000-4000-8000-000000000002',
 'start_1', 'start', 'Start', 1, 'completed',
 '{}'::jsonb, '{}'::jsonb,
 '2026-04-01 11:00:00-06', '2026-04-01 11:00:00-06', 4),
('e5000000-0000-4000-8000-000000000006', 'e4000000-0000-4000-8000-000000000002',
 'eval_cr', 'evaluate_closing_readiness', 'Evaluate Closing Readiness', 2, 'completed',
 '{"transaction_id": "e0000000-0000-4000-8000-000000000004"}'::jsonb,
 '{"ready": false, "blockers": ["title_search_pending", "final_walkthrough_not_scheduled"]}'::jsonb,
 '2026-04-01 11:00:00-06', '2026-04-01 11:00:03-06', 2800),
('e5000000-0000-4000-8000-000000000007', 'e4000000-0000-4000-8000-000000000002',
 'cond_1', 'condition', 'Ready to Close?', 3, 'completed',
 '{"ready": false}'::jsonb, '{"branch": "not_ready"}'::jsonb,
 '2026-04-01 11:00:03-06', '2026-04-01 11:00:03-06', 8),
('e5000000-0000-4000-8000-000000000008', 'e4000000-0000-4000-8000-000000000002',
 'checklist_1', 'create_checklist_item', 'Create Closing Checklist', 4, 'completed',
 '{"checklist_template": "closing_prep"}'::jsonb,
 '{"checklist_item_id": "generated-checklist-001"}'::jsonb,
 '2026-04-01 11:00:03-06', '2026-04-01 11:00:04-06', 950),
('e5000000-0000-4000-8000-000000000009', 'e4000000-0000-4000-8000-000000000002',
 'hc_1', 'human_checkpoint', 'Coordinator Review', 5, 'waiting',
 '{"assignee_role": "coordinator"}'::jsonb, '{}'::jsonb,
 '2026-04-01 11:00:04-06', null, null);

-- Failed run for Workflow 3 (error during evaluation)
INSERT INTO workflow_runs (id, workflow_id, workflow_version_id, organization_id, status,
  trigger_event_type, trigger_payload, context_data, current_node_id,
  started_at, completed_at, error_message, entity_type, entity_id,
  initiated_by_user_id, total_steps, completed_steps) VALUES
('e4000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000003',
 'e2000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
 'failed', 'stage_changed',
 '{"from_stage": "active", "to_stage": "pre_closing"}'::jsonb,
 '{"transaction_id": "e0000000-0000-4000-8000-000000000002"}'::jsonb,
 'eval_cr',
 '2026-03-30 15:00:00-06', '2026-03-30 15:00:03-06',
 'Error evaluating closing readiness: transaction e0000000-...-000000000002 missing required closing_date field',
 'transaction', 'e0000000-0000-4000-8000-000000000002',
 null, 2, 1);

-- Steps for the failed run
INSERT INTO workflow_run_steps (id, run_id, node_id, node_type, node_label, step_number,
  status, input_data, output_data, error_message, started_at, completed_at, duration_ms) VALUES
('e5000000-0000-4000-8000-000000000010', 'e4000000-0000-4000-8000-000000000003',
 'start_1', 'start', 'Start', 1, 'completed',
 '{}'::jsonb, '{}'::jsonb, null,
 '2026-03-30 15:00:00-06', '2026-03-30 15:00:00-06', 3),
('e5000000-0000-4000-8000-000000000011', 'e4000000-0000-4000-8000-000000000003',
 'eval_cr', 'evaluate_closing_readiness', 'Evaluate Closing Readiness', 2, 'failed',
 '{"transaction_id": "e0000000-0000-4000-8000-000000000002"}'::jsonb, '{}'::jsonb,
 'transaction e0000000-...-000000000002 missing required closing_date field',
 '2026-03-30 15:00:00-06', '2026-03-30 15:00:03-06', 2500);

-- ---------------------------------------------------------------------------
-- Onboarding: Update existing user profiles with onboarding fields
-- ---------------------------------------------------------------------------

-- Maria (broker_admin) - fully onboarded
UPDATE user_profiles SET
  onboarding_status = 'completed',
  onboarding_step = 3,
  onboarding_completed_at = '2025-06-01T10:00:00Z',
  phone = '(555) 123-4567',
  preferences = '{"default_landing": "dashboard", "email_notifications": true}'::jsonb
WHERE id = 'b0000000-0000-4000-8000-000000000001';

-- James (agent) - fully onboarded
UPDATE user_profiles SET
  onboarding_status = 'completed',
  onboarding_step = 3,
  onboarding_completed_at = '2025-06-02T14:30:00Z',
  phone = '(555) 234-5678',
  preferences = '{"default_landing": "transactions"}'::jsonb
WHERE id = 'b0000000-0000-4000-8000-000000000002';

-- Sarah (coordinator) - fully onboarded
UPDATE user_profiles SET
  onboarding_status = 'completed',
  onboarding_step = 3,
  onboarding_completed_at = '2025-06-03T09:15:00Z',
  preferences = '{}'::jsonb
WHERE id = 'b0000000-0000-4000-8000-000000000003';

-- ---------------------------------------------------------------------------
-- New user profile (not yet onboarded, for testing)
-- ---------------------------------------------------------------------------
INSERT INTO user_profiles (id, auth0_user_id, email, full_name, onboarding_status, onboarding_step) VALUES
  ('b0000000-0000-4000-8000-000000000004', 'auth0|usr_944d5f607182', 'alex.rivera@example.com', 'Alex Rivera', 'pending', 0);

-- ---------------------------------------------------------------------------
-- Team Invites
-- ---------------------------------------------------------------------------

-- Pending invite for a new user
INSERT INTO team_invites (id, organization_id, invited_by_user_id, email, role, status, invite_token, expires_at) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'alex.rivera@example.com', 'agent', 'pending', 'demo-invite-token-001', '2027-01-01T00:00:00Z'),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'newuser@example.com', 'coordinator', 'pending', 'demo-invite-token-002', '2027-01-01T00:00:00Z');

-- Expired invite (for testing)
INSERT INTO team_invites (id, organization_id, invited_by_user_id, email, role, status, invite_token, expires_at) VALUES
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'expired@example.com', 'agent', 'pending', 'demo-invite-expired', '2024-01-01T00:00:00Z');

-- ============================================================
-- Orchestrator Seed Data
-- ============================================================

-- ---------------------------------------------------------------------------
-- Deal Orchestrators — one per active transaction/listing
-- ---------------------------------------------------------------------------

-- TX1 (742 Evergreen): Active orchestrator with recent cycle, watch health
INSERT INTO deal_orchestrators (
  id, organization_id, entity_type, entity_id,
  status, priority, risk_summary, priority_summary,
  last_observed_at, last_planned_at, last_executed_at,
  cycle_count, config
) VALUES (
  'f1000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'transaction', 'e0000000-0000-4000-8000-000000000001',
  'active', 'high',
  '{"overdue_items": 1, "failed_extraction": 1, "health_rating": "watch"}'::jsonb,
  '{"top_concern": "Overdue inspection report", "urgency": "high"}'::jsonb,
  '2026-04-04 08:15:00-06', '2026-04-04 08:15:00-06', '2026-04-04 08:16:00-06',
  12, '{"cooldown_minutes": 30, "auto_execute_safe": true}'::jsonb
);

-- TX2 (Canyon Blvd): Active orchestrator, low completeness, at_risk
INSERT INTO deal_orchestrators (
  id, organization_id, entity_type, entity_id,
  status, priority, risk_summary, priority_summary,
  last_observed_at, last_planned_at, last_executed_at,
  cycle_count, config
) VALUES (
  'f1000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'transaction', 'e0000000-0000-4000-8000-000000000002',
  'active', 'normal',
  '{"health_rating": "at_risk", "completeness_score": 10}'::jsonb,
  '{"top_concern": "Very low completeness", "urgency": "critical"}'::jsonb,
  '2026-04-04 08:00:00-06', '2026-04-04 08:00:00-06', NULL,
  3, '{"cooldown_minutes": 60}'::jsonb
);

-- TX3 (Pearl St - Closed): Completed orchestrator
INSERT INTO deal_orchestrators (
  id, organization_id, entity_type, entity_id,
  status, priority, risk_summary, priority_summary,
  last_observed_at, last_planned_at, last_executed_at,
  cycle_count, config
) VALUES (
  'f1000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000001',
  'transaction', 'e0000000-0000-4000-8000-000000000003',
  'completed', 'low',
  '{"health_rating": "healthy"}'::jsonb,
  '{"top_concern": null, "urgency": "low"}'::jsonb,
  '2026-03-15 12:00:00-06', '2026-03-15 12:00:00-06', '2026-03-15 12:01:00-06',
  45, '{}'::jsonb
);

-- TX4 (900 Baseline - Near Closing): Active, urgent priority
INSERT INTO deal_orchestrators (
  id, organization_id, entity_type, entity_id,
  status, priority, risk_summary, priority_summary,
  last_observed_at, last_planned_at, last_executed_at,
  last_human_escalation_at, last_human_escalation_status,
  cycle_count, config
) VALUES (
  'f1000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000001',
  'transaction', 'e0000000-0000-4000-8000-000000000004',
  'active', 'urgent',
  '{"health_rating": "watch", "missing_closing_disclosure": true, "days_until_closing": 6}'::jsonb,
  '{"top_concern": "Missing closing disclosure with 6 days to close", "urgency": "critical"}'::jsonb,
  '2026-04-04 09:00:00-06', '2026-04-04 09:00:00-06', '2026-04-04 09:02:00-06',
  '2026-04-03 14:00:00-06', 'pending',
  28, '{"cooldown_minutes": 15, "auto_execute_safe": true}'::jsonb
);

-- ---------------------------------------------------------------------------
-- World State Snapshots
-- ---------------------------------------------------------------------------

-- Latest snapshot for TX1 orchestrator
INSERT INTO orchestrator_world_states (
  id, orchestrator_id, snapshot, state_hash, changed_since_last
) VALUES (
  'f2000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  '{"entity_type": "transaction", "entity_id": "e0000000-0000-4000-8000-000000000001", "stage": "due_diligence", "completeness_score": 55, "unresolved_exceptions": 1, "missing_docs": ["seller_disclosures", "preliminary_title_report"], "pending_approvals": 1, "overdue_obligations": 1, "compliance_flags": [], "health_score": 68}'::jsonb,
  'sha256_tx1_snapshot_v12',
  true
);

-- Latest snapshot for TX4 orchestrator
INSERT INTO orchestrator_world_states (
  id, orchestrator_id, snapshot, state_hash, changed_since_last
) VALUES (
  'f2000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000004',
  '{"entity_type": "transaction", "entity_id": "e0000000-0000-4000-8000-000000000004", "stage": "closing_prep", "completeness_score": 74, "unresolved_exceptions": 0, "missing_docs": ["closing_disclosure"], "pending_approvals": 0, "overdue_obligations": 1, "compliance_flags": [], "health_score": 65}'::jsonb,
  'sha256_tx4_snapshot_v28',
  true
);

-- ---------------------------------------------------------------------------
-- Memory Entries
-- ---------------------------------------------------------------------------

-- TX1: Unresolved blocker for missing inspection
INSERT INTO orchestrator_memory_entries (
  id, orchestrator_id, memory_type, summary, details, resolved
) VALUES (
  'f3000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'blocker', 'Home inspection report overdue by 3 days',
  '{"contact_name": "Robert Tanaka", "days_overdue": 3, "checklist_item_id": "40000000-0000-4000-8000-000000000004"}'::jsonb,
  false
);

-- TX1: Resolved action taken
INSERT INTO orchestrator_memory_entries (
  id, orchestrator_id, memory_type, summary, details, resolved, resolved_at
) VALUES (
  'f3000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000001',
  'action_taken', 'Sent notification about overdue inspection to coordinator',
  '{"tool_name": "create_notification", "recipient_user_id": "b0000000-0000-4000-8000-000000000003"}'::jsonb,
  true, '2026-04-03 10:00:00-06'
);

-- TX4: Escalation memory
INSERT INTO orchestrator_memory_entries (
  id, orchestrator_id, memory_type, summary, details, resolved
) VALUES (
  'f3000000-0000-4000-8000-000000000003',
  'f1000000-0000-4000-8000-000000000004',
  'escalation', 'Escalated missing closing disclosure to broker admin',
  '{"escalated_to": "b0000000-0000-4000-8000-000000000001", "reason": "6 days until closing, disclosure still missing"}'::jsonb,
  false
);

-- TX4: Obligation memory
INSERT INTO orchestrator_memory_entries (
  id, orchestrator_id, memory_type, summary, details, resolved
) VALUES (
  'f3000000-0000-4000-8000-000000000004',
  'f1000000-0000-4000-8000-000000000004',
  'obligation', 'Waiting on seller disclosures from Patricia Hernandez',
  '{"party_name": "Patricia Hernandez", "obligation_type": "disclosure", "days_overdue": 3}'::jsonb,
  false
);

-- ---------------------------------------------------------------------------
-- Orchestrator Cycles — recent cycles showing observe-plan-execute
-- ---------------------------------------------------------------------------

-- TX1: Most recent completed cycle (auto-executed safe actions)
INSERT INTO orchestrator_cycles (
  id, orchestrator_id, cycle_number, trigger_type, trigger_metadata,
  world_state_id, planner_output, critic_evaluation, selected_actions,
  execution_summary, duration_ms, status, completed_at
) VALUES (
  'f4000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  12, 'scheduled', '{}'::jsonb,
  'f2000000-0000-4000-8000-000000000001',
  '{"reasoning_summary": "Deal has overdue inspection and missing docs. Recompute scores and notify coordinator.", "proposed_actions": [{"tool_name": "recompute_completeness", "risk_class": "safe", "confidence": 0.95}, {"tool_name": "recompute_health_score", "risk_class": "safe", "confidence": 0.95}, {"tool_name": "create_notification", "risk_class": "safe", "confidence": 0.90}], "urgency_assessment": "high"}'::jsonb,
  '{"all_approved": true, "concerns": []}'::jsonb,
  '[{"tool_name": "recompute_completeness", "disposition": "auto_execute"}, {"tool_name": "recompute_health_score", "disposition": "auto_execute"}, {"tool_name": "create_notification", "disposition": "auto_execute"}]'::jsonb,
  '{"actions_executed": 3, "actions_succeeded": 3, "actions_failed": 0}'::jsonb,
  1250, 'completed', '2026-04-04 08:16:00-06'
);

-- TX4: Recent cycle with blocked high-risk action
INSERT INTO orchestrator_cycles (
  id, orchestrator_id, cycle_number, trigger_type, trigger_metadata,
  world_state_id, planner_output, critic_evaluation, selected_actions,
  execution_summary, duration_ms, status, completed_at
) VALUES (
  'f4000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000004',
  28, 'deadline_approaching',
  '{"deadline": "closing_date", "days_remaining": 6}'::jsonb,
  'f2000000-0000-4000-8000-000000000002',
  '{"reasoning_summary": "Closing in 6 days, missing closing disclosure. Considered stage transition but blocked. Recomputing scores and creating reminder draft.", "proposed_actions": [{"tool_name": "recompute_completeness", "risk_class": "safe", "confidence": 0.95}, {"tool_name": "suggest_stage_transition", "risk_class": "high_risk", "confidence": 0.6}, {"tool_name": "create_reminder_draft", "risk_class": "medium_risk", "confidence": 0.85}], "urgency_assessment": "critical"}'::jsonb,
  '{"all_approved": false, "concerns": ["Stage transition blocked — high risk", "Reminder draft created for review"]}'::jsonb,
  '[{"tool_name": "recompute_completeness", "disposition": "auto_execute"}, {"tool_name": "suggest_stage_transition", "disposition": "block", "reason": "high_risk_block"}, {"tool_name": "create_reminder_draft", "disposition": "create_draft"}]'::jsonb,
  '{"actions_executed": 1, "actions_drafted": 1, "actions_blocked": 1}'::jsonb,
  2100, 'completed', '2026-04-04 09:02:00-06'
);

-- TX2: Skipped cycle (within cooldown)
INSERT INTO orchestrator_cycles (
  id, orchestrator_id, cycle_number, trigger_type,
  status, skip_reason, completed_at
) VALUES (
  'f4000000-0000-4000-8000-000000000003',
  'f1000000-0000-4000-8000-000000000002',
  3, 'scheduled',
  'skipped', 'Within cooldown period (last observed 15 minutes ago)', '2026-04-04 08:15:00-06'
);

-- ---------------------------------------------------------------------------
-- Action Proposals
-- ---------------------------------------------------------------------------

-- TX1 cycle: safe proposals (all approved and executed)
INSERT INTO orchestrator_action_proposals (
  id, cycle_id, orchestrator_id,
  tool_name, tool_params, risk_class, confidence, reason,
  critic_approved, status
) VALUES
  ('f5000000-0000-4000-8000-000000000001',
   'f4000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001',
   'recompute_completeness', '{"transaction_id": "e0000000-0000-4000-8000-000000000001"}'::jsonb,
   'safe', 0.95, 'Completeness score may be stale after overdue item detection',
   true, 'executed'),
  ('f5000000-0000-4000-8000-000000000002',
   'f4000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001',
   'recompute_health_score', '{"transaction_id": "e0000000-0000-4000-8000-000000000001"}'::jsonb,
   'safe', 0.95, 'Health score refresh after state change',
   true, 'executed'),
  ('f5000000-0000-4000-8000-000000000003',
   'f4000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001',
   'create_notification', '{"user_id": "b0000000-0000-4000-8000-000000000003", "title": "Inspection report still overdue", "priority": "high"}'::jsonb,
   'safe', 0.90, 'Coordinator should be alerted about continued overdue inspection',
   true, 'executed');

-- TX4 cycle: mixed proposals (safe executed, high_risk blocked, medium_risk drafted)
INSERT INTO orchestrator_action_proposals (
  id, cycle_id, orchestrator_id,
  tool_name, tool_params, risk_class, confidence, reason,
  critic_approved, critic_notes, status, gated_reason
) VALUES
  ('f5000000-0000-4000-8000-000000000004',
   'f4000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000004',
   'recompute_completeness', '{"transaction_id": "e0000000-0000-4000-8000-000000000004"}'::jsonb,
   'safe', 0.95, 'Refresh completeness before closing assessment',
   true, NULL, 'executed', NULL),
  ('f5000000-0000-4000-8000-000000000005',
   'f4000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000004',
   'suggest_stage_transition', '{"transaction_id": "e0000000-0000-4000-8000-000000000004", "to_stage": "closing"}'::jsonb,
   'high_risk', 0.60, 'Deal may be ready for closing stage',
   false, 'Blocked: high-risk action, missing closing disclosure',
   'rejected', 'high_risk_block'),
  ('f5000000-0000-4000-8000-000000000006',
   'f4000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000004',
   'create_reminder_draft', '{"recipient_email": "patricia.h@email.com", "subject": "Seller disclosures needed urgently"}'::jsonb,
   'medium_risk', 0.85, 'Seller disclosures overdue, 6 days to closing',
   true, 'Draft created for human review', 'gated', 'create_draft');

-- ---------------------------------------------------------------------------
-- Action Executions (for safe auto-executed actions)
-- ---------------------------------------------------------------------------
INSERT INTO orchestrator_action_executions (
  id, proposal_id, orchestrator_id,
  tool_name, tool_params, result, success, duration_ms, idempotency_key
) VALUES
  ('f6000000-0000-4000-8000-000000000001',
   'f5000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001',
   'recompute_completeness',
   '{"transaction_id": "e0000000-0000-4000-8000-000000000001"}'::jsonb,
   '{"new_score": 55, "previous_score": 52}'::jsonb,
   true, 320,
   'tx1_recompute_completeness_20260404_0815'),
  ('f6000000-0000-4000-8000-000000000002',
   'f5000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001',
   'recompute_health_score',
   '{"transaction_id": "e0000000-0000-4000-8000-000000000001"}'::jsonb,
   '{"new_score": 68, "previous_score": 72, "trend": "declining"}'::jsonb,
   true, 280,
   'tx1_recompute_health_20260404_0815'),
  ('f6000000-0000-4000-8000-000000000003',
   'f5000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001',
   'create_notification',
   '{"user_id": "b0000000-0000-4000-8000-000000000003", "title": "Inspection report still overdue"}'::jsonb,
   '{"notification_id": "c7000000-0000-4000-8000-000000000001"}'::jsonb,
   true, 150,
   'tx1_notify_overdue_inspection_20260404_0815'),
  ('f6000000-0000-4000-8000-000000000004',
   'f5000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000004',
   'recompute_completeness',
   '{"transaction_id": "e0000000-0000-4000-8000-000000000004"}'::jsonb,
   '{"new_score": 74, "previous_score": 72}'::jsonb,
   true, 310,
   'tx4_recompute_completeness_20260404_0900');

-- ---------------------------------------------------------------------------
-- Next Actions (orchestrator output for UI)
-- ---------------------------------------------------------------------------

-- TX1: Primary next action — follow up on inspection
INSERT INTO orchestrator_next_actions (
  id, orchestrator_id, title, reason, urgency, risk_class,
  owner_user_id, owner_role, source_signals,
  auto_executable, tool_name, tool_params,
  is_primary, status, cycle_id
) VALUES (
  'f7000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'Follow up on overdue home inspection',
  'Robert Tanaka has not delivered the inspection report (3 days overdue). Closing timeline at risk.',
  'high', 'medium_risk',
  'b0000000-0000-4000-8000-000000000002', 'agent',
  '[{"type": "overdue_checklist_item", "item": "Home inspection"}, {"type": "health_declining", "trend": "declining"}]'::jsonb,
  false, 'create_reminder_draft',
  '{"recipient": "rtanaka.inspections@email.com", "subject": "Inspection Report Status"}'::jsonb,
  true, 'active',
  'f4000000-0000-4000-8000-000000000001'
);

-- TX4: Primary next action — obtain closing disclosure
INSERT INTO orchestrator_next_actions (
  id, orchestrator_id, title, reason, urgency, risk_class,
  owner_user_id, owner_role, source_signals,
  auto_executable, tool_name,
  is_primary, status, cycle_id
) VALUES (
  'f7000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000004',
  'Obtain closing disclosure from title company',
  'Closing in 6 days. Closing disclosure is the only missing document blocking readiness.',
  'critical', 'medium_risk',
  'b0000000-0000-4000-8000-000000000003', 'coordinator',
  '[{"type": "missing_document", "document": "closing_disclosure"}, {"type": "deadline_approaching", "days": 6}]'::jsonb,
  false, 'create_document_request',
  true, 'active',
  'f4000000-0000-4000-8000-000000000002'
);

-- ---------------------------------------------------------------------------
-- Orchestrator Obligations
-- ---------------------------------------------------------------------------

-- TX1: Waiting on inspector
INSERT INTO orchestrator_obligations (
  id, orchestrator_id, obligation_type, description,
  owner_type, due_at, priority, status, metadata
) VALUES (
  'f8000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'counterparty_action', 'Waiting on home inspection report from Robert Tanaka',
  'counterparty', '2026-04-01 17:00:00-06', 'high', 'overdue',
  '{"contact_name": "Robert Tanaka", "contact_email": "rtanaka.inspections@email.com"}'::jsonb
);

-- TX4: Waiting on closing disclosure
INSERT INTO orchestrator_obligations (
  id, orchestrator_id, obligation_type, description,
  owner_type, owner_user_id, due_at, priority, status, metadata
) VALUES (
  'f8000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000004',
  'document_needed', 'Closing disclosure needed from title company before closing',
  'counterparty', NULL, '2026-04-08 17:00:00-06', 'critical', 'open',
  '{"document_type": "closing_disclosure", "closing_date": "2026-04-10"}'::jsonb
);

-- TX4: Seller disclosures overdue
INSERT INTO orchestrator_obligations (
  id, orchestrator_id, obligation_type, description,
  owner_type, due_at, priority, status, metadata
) VALUES (
  'f8000000-0000-4000-8000-000000000003',
  'f1000000-0000-4000-8000-000000000004',
  'counterparty_action', 'Seller Patricia Hernandez has not provided signed disclosures',
  'counterparty', '2026-04-01 17:00:00-06', 'high', 'overdue',
  '{"party_name": "Patricia Hernandez", "party_email": "patricia.h@email.com"}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Action Policy (org-level overrides)
-- ---------------------------------------------------------------------------
INSERT INTO orchestrator_action_policies (
  id, organization_id, policy_name,
  promoted_to_safe, demoted_to_blocked, require_approval_for,
  custom_rules, is_active
) VALUES (
  'f9000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'realty_partners_default',
  '{}', '{}',
  '{suggest_follow_up_draft}',
  '{"notes": "Follow-up drafts always require broker approval per office policy"}'::jsonb,
  true
);

-- ---------------------------------------------------------------------------
-- Follow-Through Sequence Runs
-- ---------------------------------------------------------------------------

-- TX4: Active follow-through for missing closing disclosure
INSERT INTO orchestrator_follow_through_runs (
  id, orchestrator_id, sequence_name, status,
  current_step, trigger_data, step_results,
  started_at, next_step_at
) VALUES (
  'fa000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000004',
  'missing_document_recovery', 'waiting',
  3,
  '{"missing_doc": "closing_disclosure", "closing_date": "2026-04-10"}'::jsonb,
  '[{"step_name": "create_checklist_item", "success": true, "timestamp": "2026-04-03T14:00:00Z"}, {"step_name": "send_notification", "success": true, "timestamp": "2026-04-03T14:01:00Z"}]'::jsonb,
  '2026-04-03 14:00:00-06',
  '2026-04-04 14:00:00-06'
);

-- TX1: Completed follow-through for post-document upload
INSERT INTO orchestrator_follow_through_runs (
  id, orchestrator_id, sequence_name, status,
  current_step, trigger_data, step_results,
  started_at, completed_at, exit_reason
) VALUES (
  'fa000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000001',
  'post_document_upload', 'completed',
  4,
  '{"document_id": "20000000-0000-4000-8000-000000000002", "document_type": "pre_approval_letter"}'::jsonb,
  '[{"step_name": "recompute_completeness", "success": true, "timestamp": "2026-04-03T09:00:00Z"}, {"step_name": "recompute_exceptions", "success": true, "timestamp": "2026-04-03T09:00:05Z"}, {"step_name": "recompute_health", "success": true, "timestamp": "2026-04-03T09:00:10Z"}, {"step_name": "notify_if_needed", "success": true, "timestamp": "2026-04-03T09:00:15Z"}]'::jsonb,
  '2026-04-03 09:00:00-06',
  '2026-04-03 09:00:15-06',
  'all_steps_completed'
);

-- ---------------------------------------------------------------------------
-- Execution Hardening Scenarios
-- ---------------------------------------------------------------------------

-- TX4: Deadline approaching follow-through (closing in 5 days)
INSERT INTO orchestrator_follow_through_runs (
  id, orchestrator_id, sequence_name, status,
  current_step, trigger_data, step_results,
  started_at, next_step_at
) VALUES (
  'fa000000-0000-4000-8000-000000000003',
  'f1000000-0000-4000-8000-000000000004',
  'deadline_approaching', 'in_progress',
  2,
  '{"deadline_type": "closing_date", "deadline_date": "2026-04-09", "days_remaining": 5}'::jsonb,
  '[{"step_name": "recompute_completeness", "success": true, "timestamp": "2026-04-04T08:00:00Z"}, {"step_name": "recompute_health", "success": true, "timestamp": "2026-04-04T08:00:05Z"}]'::jsonb,
  '2026-04-04 08:00:00-06',
  '2026-04-04 12:00:00-06'
);

-- TX3: Closing prep follow-through (stage just entered closing)
INSERT INTO orchestrator_follow_through_runs (
  id, orchestrator_id, sequence_name, status,
  current_step, trigger_data, step_results,
  started_at, next_step_at
) VALUES (
  'fa000000-0000-4000-8000-000000000004',
  'f1000000-0000-4000-8000-000000000003',
  'closing_prep', 'in_progress',
  1,
  '{"stage": "closing", "entered_at": "2026-04-04T10:00:00Z"}'::jsonb,
  '[{"step_name": "recompute_closing_readiness", "success": true, "timestamp": "2026-04-04T10:00:00Z"}]'::jsonb,
  '2026-04-04 10:00:00-06',
  '2026-04-04 10:05:00-06'
);

-- TX1: Execution with plan context (linked to active plan and subgoal)
INSERT INTO orchestrator_action_executions (
  id, proposal_id, orchestrator_id, tool_name, tool_params,
  result, success, error_message, duration_ms, side_effects,
  idempotency_key, created_at
) VALUES (
  'ae000000-0000-4000-8000-000000000010',
  'ab000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'recompute_deal_health', '{}',
  '{"health_score": 0.82, "policy_decision": {"disposition": "auto_execute", "policy_rule": "safe_active"}, "plan_context": {"plan_id": "p0000000-0000-4000-8000-000000000001", "subgoal_id": "sg000000-0000-4000-8000-000000000001"}}'::jsonb,
  true, NULL, 45, '[]'::jsonb,
  'plan_linked_exec_001',
  '2026-04-04 09:00:00-06'
);

-- TX2: Cooldown-blocked execution (duplicate action within 5-minute window)
INSERT INTO orchestrator_action_executions (
  id, proposal_id, orchestrator_id, tool_name, tool_params,
  result, success, error_message, duration_ms, side_effects,
  idempotency_key, created_at
) VALUES (
  'ae000000-0000-4000-8000-000000000011',
  'ab000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000002',
  'recompute_deal_health', '{}',
  '{"policy_decision": {"disposition": "block", "reason": "Action \"recompute_deal_health\" was already executed recently (cooldown)", "policy_rule": "action_cooldown", "can_override": false}}'::jsonb,
  false,
  'Action "recompute_deal_health" was already executed recently (cooldown)',
  2, '[]'::jsonb,
  'cooldown_blocked_001',
  '2026-04-04 09:02:00-06'
);

-- TX3: Retried safe execution (succeeded on second attempt)
INSERT INTO orchestrator_action_executions (
  id, proposal_id, orchestrator_id, tool_name, tool_params,
  result, success, error_message, duration_ms, side_effects,
  idempotency_key, created_at
) VALUES (
  'ae000000-0000-4000-8000-000000000012',
  'ab000000-0000-4000-8000-000000000003',
  'f1000000-0000-4000-8000-000000000003',
  'flag_missing_documents', '{"transaction_id": "10000000-0000-4000-8000-000000000003"}',
  '{"flagged": ["closing_disclosure", "title_commitment"], "policy_decision": {"disposition": "auto_execute", "policy_rule": "safe_active"}}'::jsonb,
  true, NULL, 1050, '["checklist_item_created", "checklist_item_created"]'::jsonb,
  'retry_success_001',
  '2026-04-04 10:30:00-06'
);

-- ===========================================================================
-- Adaptive Planning Seed Data
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Plan 1: TX1 multi-step plan progressing across cycles (active, v2, replanned once)
-- ---------------------------------------------------------------------------
INSERT INTO orchestrator_plans (
  id, orchestrator_id, organization_id, title, objective,
  entity_type, entity_id, status, priority, review_cadence_hours,
  refresh_conditions, version, risk_summary, source_signals,
  replan_count, last_replan_reason, world_state_hash
) VALUES (
  'p0000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  'Plan v2 for transaction 10000000',
  'In under_contract stage: collect 2 missing document(s), resolve 1 pending approval(s) (4 subgoals).',
  'transaction', '10000000-0000-4000-8000-000000000001',
  'active', 'high', 24,
  '["stage_change", "document_upload", "blocker_resolved"]'::jsonb,
  2,
  '1 urgent deadline',
  '[{"type": "missing_docs", "docs": ["seller_disclosure", "title_commitment"]}, {"type": "urgent_deadlines", "count": 1}]'::jsonb,
  1, 'Replan needed: 2 recent uploads changed world state.',
  'abc123def456'
);

-- Subgoals for Plan 1
INSERT INTO orchestrator_subgoals (
  id, plan_id, title, intent, status, urgency, owner_user_id, owner_role,
  sort_order, prerequisites, completion_condition, linked_tool_names,
  waiting_on_type, waiting_on_detail, waiting_expected_event, waiting_escalation_hours,
  depends_on_subgoal_ids
) VALUES
-- Completed subgoal (doc was uploaded)
(
  'sg000000-0000-4000-8000-000000000001',
  'p0000000-0000-4000-8000-000000000001',
  'Obtain purchase_agreement', 'Obtain the missing document "purchase_agreement".',
  'completed', 'high', 'b0000000-0000-4000-8000-000000000002', 'agent',
  1, '{}', 'Document "purchase_agreement" is uploaded and verified.',
  '{"create_document_request"}',
  'seller', 'Waiting for purchase_agreement to be uploaded', 'purchase_agreement document uploaded', 48,
  '{}'
),
-- Waiting subgoal (waiting on seller)
(
  'sg000000-0000-4000-8000-000000000002',
  'p0000000-0000-4000-8000-000000000001',
  'Obtain seller_disclosure', 'Obtain the missing document "seller_disclosure".',
  'waiting', 'high', 'b0000000-0000-4000-8000-000000000002', 'agent',
  2, '{}', 'Document "seller_disclosure" is uploaded and verified.',
  '{"create_document_request"}',
  'seller', 'Requested from seller on April 2nd', 'seller_disclosure document uploaded', 48,
  '{}'
),
-- In-progress subgoal (waiting on title)
(
  'sg000000-0000-4000-8000-000000000003',
  'p0000000-0000-4000-8000-000000000001',
  'Obtain title_commitment', 'Obtain the missing document "title_commitment".',
  'in_progress', 'high', 'b0000000-0000-4000-8000-000000000002', 'agent',
  3, '{}', 'Document "title_commitment" is uploaded and verified.',
  '{"create_document_request"}',
  'title', 'Title company processing', 'title_commitment document uploaded', 72,
  '{}'
),
-- Pending approval subgoal
(
  'sg000000-0000-4000-8000-000000000004',
  'p0000000-0000-4000-8000-000000000001',
  'Resolve 1 pending approval(s)', 'Get all pending approvals reviewed and decided.',
  'pending', 'high', NULL, NULL,
  4, '{}', 'All pending approvals are resolved.',
  '{"create_notification"}',
  'approval', '1 approval(s) pending review', 'Approvals decided', 24,
  '{}'
);

-- Revision history for Plan 1 (the v1 → v2 transition)
INSERT INTO orchestrator_plan_revisions (
  id, plan_id, revision_number, reason, changes_summary, previous_snapshot
) VALUES (
  'pr000000-0000-4000-8000-000000000001',
  'p0000000-0000-4000-8000-000000000001',
  1, 'Replan needed: 2 recent uploads changed world state.',
  'Superseded due to replan: 2 recent uploads changed world state.',
  '{"plan": {"version": 1, "status": "active", "objective": "In under_contract stage: collect 3 missing document(s)"}, "subgoals": [{"title": "Obtain purchase_agreement", "status": "pending"}, {"title": "Obtain seller_disclosure", "status": "pending"}, {"title": "Obtain title_commitment", "status": "pending"}], "progress": {"total_subgoals": 3, "completed": 0, "pending": 3, "completion_percentage": 0}}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Plan 2: Listing with launch blockers causing a blocked plan
-- ---------------------------------------------------------------------------
INSERT INTO orchestrator_plans (
  id, orchestrator_id, organization_id, title, objective,
  entity_type, entity_id, status, priority, review_cadence_hours,
  refresh_conditions, version, blocked_reason, blocked_since,
  risk_summary, source_signals, replan_count, world_state_hash
) VALUES (
  'p0000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000001',
  'Plan for listing 10000000',
  'In launch_prep stage: collect 3 missing document(s), resolve 2 compliance flag(s) (6 subgoals).',
  'listing', '10000000-0000-4000-8000-000000000002',
  'blocked', 'high', 24,
  '["stage_change", "document_upload", "blocker_resolved"]'::jsonb,
  1,
  'Plan blocked: 3 unresolved blockers.',
  '2026-04-03 16:00:00-06',
  '2 compliance flags; very low completeness',
  '[{"type": "missing_docs", "docs": ["photos", "listing_agreement", "lead_paint_disclosure"]}, {"type": "compliance_flags", "flags": ["missing_lead_paint", "incomplete_property_data"]}]'::jsonb,
  0, 'blocked_hash_001'
);

INSERT INTO orchestrator_subgoals (
  id, plan_id, title, intent, status, urgency, sort_order,
  prerequisites, completion_condition, linked_tool_names,
  blocked_reason, blocked_since, waiting_on_type, waiting_on_detail,
  waiting_escalation_hours, depends_on_subgoal_ids
) VALUES
(
  'sg000000-0000-4000-8000-000000000010',
  'p0000000-0000-4000-8000-000000000002',
  'Resolve compliance: missing_lead_paint', 'Address lead paint disclosure requirement.',
  'blocked', 'critical', 1,
  '{}', 'Compliance flag "missing_lead_paint" is cleared.',
  '{"request_manual_review"}',
  'Seller has not provided lead paint disclosure', '2026-04-03 16:00:00-06',
  'compliance_review', 'Lead paint disclosure needs review', 24,
  '{}'
),
(
  'sg000000-0000-4000-8000-000000000011',
  'p0000000-0000-4000-8000-000000000002',
  'Obtain listing_agreement', 'Obtain signed listing agreement.',
  'blocked', 'high', 2,
  '{}', 'Document "listing_agreement" is uploaded.',
  '{"create_document_request"}',
  'Seller unreachable for signature', '2026-04-03 14:00:00-06',
  'seller', 'Seller not responding to document requests', 72,
  '{}'
),
(
  'sg000000-0000-4000-8000-000000000012',
  'p0000000-0000-4000-8000-000000000002',
  'Obtain photos', 'Get property photos for listing.',
  'pending', 'normal', 3,
  '{}', 'Photos uploaded.',
  '{"create_document_request"}',
  NULL, NULL,
  'internal', 'Photographer scheduling', 48,
  '{}'
);

-- ---------------------------------------------------------------------------
-- Plan 3: TX3 waiting on lender with clear dependency path
-- ---------------------------------------------------------------------------
INSERT INTO orchestrator_plans (
  id, orchestrator_id, organization_id, title, objective,
  entity_type, entity_id, status, priority, review_cadence_hours,
  refresh_conditions, version, risk_summary, source_signals,
  replan_count, world_state_hash
) VALUES (
  'p0000000-0000-4000-8000-000000000003',
  'f1000000-0000-4000-8000-000000000003',
  'e0000000-0000-4000-8000-000000000001',
  'Plan for transaction 10000000',
  'In under_contract stage: collect 1 missing document(s), raise completeness from 55% (3 subgoals).',
  'transaction', '10000000-0000-4000-8000-000000000003',
  'waiting', 'normal', 24,
  '["stage_change", "document_upload"]'::jsonb,
  1,
  NULL,
  '[{"type": "missing_docs", "docs": ["lender_commitment_letter"]}]'::jsonb,
  0, 'waiting_hash_001'
);

INSERT INTO orchestrator_subgoals (
  id, plan_id, title, intent, status, urgency, sort_order,
  prerequisites, completion_condition, linked_tool_names,
  waiting_on_type, waiting_on_detail, waiting_since, waiting_expected_event,
  waiting_escalation_hours, depends_on_subgoal_ids
) VALUES
-- Waiting on lender for commitment letter
(
  'sg000000-0000-4000-8000-000000000020',
  'p0000000-0000-4000-8000-000000000003',
  'Obtain lender_commitment_letter', 'Obtain lender commitment letter for closing.',
  'waiting', 'high', 1,
  '{}', 'Document "lender_commitment_letter" is uploaded.',
  '{"create_document_request"}',
  'lender', 'Lender processing underwriting — expected 3-5 business days',
  '2026-04-01 10:00:00-06', 'lender_commitment_letter document uploaded',
  96, '{}'
),
-- Depends on lender letter: completeness improvement
(
  'sg000000-0000-4000-8000-000000000021',
  'p0000000-0000-4000-8000-000000000003',
  'Improve completeness', 'Raise completeness from 55% to at least 70%.',
  'pending', 'high', 2,
  '{"Lender commitment letter should be obtained first"}',
  'Completeness score reaches 70% or higher.',
  '{"recompute_completeness"}',
  NULL, NULL, NULL, NULL,
  NULL, '{"sg000000-0000-4000-8000-000000000020"}'
),
-- Closing readiness depends on completeness
(
  'sg000000-0000-4000-8000-000000000022',
  'p0000000-0000-4000-8000-000000000003',
  'Verify closing readiness', 'Ensure all closing prerequisites are met.',
  'pending', 'normal', 3,
  '{"Completeness must be >= 70%"}',
  'Closing readiness confirmed.',
  '{"recompute_closing_readiness"}',
  NULL, NULL, NULL, NULL,
  NULL, '{"sg000000-0000-4000-8000-000000000021"}'
);

-- ---------------------------------------------------------------------------
-- Plan 4: TX4 partially completed plan that got updated
-- ---------------------------------------------------------------------------
INSERT INTO orchestrator_plans (
  id, orchestrator_id, organization_id, title, objective,
  entity_type, entity_id, status, priority, review_cadence_hours,
  refresh_conditions, version, risk_summary, source_signals,
  replan_count, last_replan_reason, world_state_hash
) VALUES (
  'p0000000-0000-4000-8000-000000000004',
  'f1000000-0000-4000-8000-000000000004',
  'e0000000-0000-4000-8000-000000000001',
  'Plan v2 for transaction 10000000',
  'In closing stage: address 1 overdue obligation(s), resolve 1 exception(s) (3 subgoals).',
  'transaction', '10000000-0000-4000-8000-000000000004',
  'active', 'critical', 12,
  '["stage_change", "document_upload", "blocker_resolved"]'::jsonb,
  2,
  '1 overdue obligation; 1 urgent deadline',
  '[{"type": "unresolved_exceptions", "count": 1}, {"type": "urgent_deadlines", "count": 1}]'::jsonb,
  1, 'Replan needed: stage changed to "closing".',
  'closing_hash_001'
);

INSERT INTO orchestrator_subgoals (
  id, plan_id, title, intent, status, urgency, sort_order,
  prerequisites, completion_condition, linked_tool_names,
  waiting_on_type, depends_on_subgoal_ids
) VALUES
(
  'sg000000-0000-4000-8000-000000000030',
  'p0000000-0000-4000-8000-000000000004',
  'Resolve 1 unresolved exception(s)', 'Clear open exception to proceed with closing.',
  'completed', 'critical', 1,
  '{}', 'All exceptions resolved.',
  '{"recompute_exceptions"}',
  NULL, '{}'
),
(
  'sg000000-0000-4000-8000-000000000031',
  'p0000000-0000-4000-8000-000000000004',
  'Address 1 overdue obligation(s)', 'Resolve overdue obligation before closing.',
  'in_progress', 'critical', 2,
  '{}', 'No overdue obligations remain.',
  '{"create_reminder_draft"}',
  NULL, '{}'
),
(
  'sg000000-0000-4000-8000-000000000032',
  'p0000000-0000-4000-8000-000000000004',
  'Complete before 2026-04-09: Closing date', 'Ensure closing is ready by deadline.',
  'pending', 'critical', 3,
  '{"Overdue obligations must be resolved first"}',
  'Closing date met or extended.',
  '{"recompute_closing_readiness"}',
  NULL, '{"sg000000-0000-4000-8000-000000000031"}'
);

-- ---------------------------------------------------------------------------
-- Plan 5: Completed plan (for TX5/org2) with approval-gated step history
-- ---------------------------------------------------------------------------
INSERT INTO orchestrator_plans (
  id, orchestrator_id, organization_id, title, objective,
  entity_type, entity_id, status, priority, review_cadence_hours,
  refresh_conditions, version, completed_at,
  risk_summary, source_signals, replan_count, world_state_hash
) VALUES (
  'p0000000-0000-4000-8000-000000000005',
  'f1000000-0000-4000-8000-000000000003',
  'e0000000-0000-4000-8000-000000000001',
  'Plan for transaction 10000000',
  'In under_contract stage: resolve 1 pending approval(s) (2 subgoals).',
  'transaction', '10000000-0000-4000-8000-000000000003',
  'completed', 'normal', 24,
  '["stage_change"]'::jsonb,
  1, '2026-04-02 18:00:00-06',
  NULL,
  '[{"type": "pending_approvals", "count": 1}]'::jsonb,
  0, 'completed_hash_001'
);

-- ---------------------------------------------------------------------------
-- Plan 6: Superseded plan (TX1 original v1, before replan)
-- ---------------------------------------------------------------------------
INSERT INTO orchestrator_plans (
  id, orchestrator_id, organization_id, title, objective,
  entity_type, entity_id, status, priority, review_cadence_hours,
  refresh_conditions, version, superseded_by,
  risk_summary, source_signals, replan_count, world_state_hash
) VALUES (
  'p0000000-0000-4000-8000-000000000006',
  'f1000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  'Plan for transaction 10000000',
  'In under_contract stage: collect 3 missing document(s) (3 subgoals).',
  'transaction', '10000000-0000-4000-8000-000000000001',
  'superseded', 'normal', 24,
  '["stage_change", "document_upload"]'::jsonb,
  1, 'p0000000-0000-4000-8000-000000000001',
  NULL,
  '[{"type": "missing_docs", "docs": ["purchase_agreement", "seller_disclosure", "title_commitment"]}]'::jsonb,
  0, 'original_hash_001'
);
