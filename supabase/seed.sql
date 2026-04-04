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
  80.0000, '2026-05-15', 'Standard buyer purchase commission'
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
  60.0000, '2026-05-20', 'Seller listing with referral fee'
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
  100.0000, '2026-03-15', 'Finalized at closing'
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
  90.0000, '2026-04-10', 'Pending closing — nearly ready'
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
