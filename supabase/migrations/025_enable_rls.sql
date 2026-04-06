-- =============================================================================
-- Migration 025: Enable Row Level Security on all tables
--
-- Strategy:
--   All DB access in this app goes through the Supabase service_role key
--   (server-side only via lib/db/client.ts). Auth is handled externally by
--   Auth0 — there are no Supabase Auth (anon/authenticated) users.
--
--   By enabling RLS and granting access only to service_role, we ensure:
--     1. Direct client-side DB access (anon key) is fully denied.
--     2. Authenticated Supabase users (if any) cannot access data.
--     3. Server-side app code continues to work unchanged.
--
--   Pattern per table:
--     ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
--     ALTER TABLE ... FORCE ROW LEVEL SECURITY;
--     CREATE POLICY "service_role_all" ON ... FOR ALL TO service_role
--       USING (true) WITH CHECK (true);
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Drop any pre-existing RLS policies to make this migration idempotent
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'service_role_all'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_role_all ON %I.%I', r.schemaname, r.tablename);
  END LOOP;
END
$$;

-- =============================================================================
-- 001 tables: organizations, user_profiles, memberships, properties,
--             transactions, contacts, transaction_parties, documents,
--             document_extractions, checklist_templates, checklist_items,
--             timeline_events, approvals, outbound_messages, reminders,
--             audit_logs
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON organizations FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON memberships FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON properties FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON contacts FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE transaction_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_parties FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON transaction_parties FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON documents FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON document_extractions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON checklist_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON checklist_items FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON timeline_events FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON approvals FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON outbound_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON reminders FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 002 tables: extracted_field_values, field_corrections,
--             transaction_completeness, transaction_exceptions,
--             transaction_recommendations, transaction_assignments,
--             comments, mentions, communication_threads,
--             communication_messages, email_account_connections,
--             queue_views, organization_rules, organization_templates,
--             packet_ingestions
-- =============================================================================

ALTER TABLE extracted_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_field_values FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON extracted_field_values FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE field_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_corrections FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON field_corrections FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE transaction_completeness ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_completeness FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON transaction_completeness FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE transaction_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_exceptions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON transaction_exceptions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE transaction_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_recommendations FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON transaction_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE transaction_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON transaction_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON comments FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON mentions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE communication_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_threads FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON communication_threads FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON communication_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE email_account_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_account_connections FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON email_account_connections FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE queue_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_views FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON queue_views FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE organization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON organization_rules FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE organization_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON organization_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE packet_ingestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE packet_ingestions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON packet_ingestions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 003 tables: product_events, activation_milestones, product_feedback,
--             daily_metrics
-- =============================================================================

ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON product_events FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE activation_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_milestones FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON activation_milestones FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE product_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_feedback FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON product_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON daily_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 004 tables: collaborator_invites, document_requests,
--             document_request_uploads, lender_status_updates,
--             title_status_updates, closing_readiness, deal_health_scores,
--             response_obligations, daily_digest_preferences, daily_digests,
--             audit_export_jobs
-- =============================================================================

ALTER TABLE collaborator_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_invites FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON collaborator_invites FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON document_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE document_request_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_request_uploads FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON document_request_uploads FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE lender_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lender_status_updates FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON lender_status_updates FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE title_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE title_status_updates FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON title_status_updates FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE closing_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing_readiness FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON closing_readiness FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE deal_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_health_scores FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON deal_health_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE response_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_obligations FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON response_obligations FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE daily_digest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_digest_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON daily_digest_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE daily_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_digests FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON daily_digests FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE audit_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_export_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON audit_export_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 005 tables: offices, teams, office_memberships, transaction_economics,
--             commission_splits, compliance_issues, compliance_issue_comments,
--             policy_rules, policy_overrides, close_forecast_snapshots
-- =============================================================================

ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON offices FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON teams FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE office_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON office_memberships FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE transaction_economics ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_economics FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON transaction_economics FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE commission_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_splits FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON commission_splits FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE compliance_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_issues FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON compliance_issues FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE compliance_issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_issue_comments FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON compliance_issue_comments FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON policy_rules FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE policy_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_overrides FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON policy_overrides FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE close_forecast_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_forecast_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON close_forecast_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 006 tables: stage_transitions, notifications, notification_preferences,
--             recent_searches, bulk_action_jobs
-- =============================================================================

ALTER TABLE stage_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_transitions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON stage_transitions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON notification_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_searches FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON recent_searches FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE bulk_action_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_action_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON bulk_action_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 007 tables: import_jobs, import_rows, duplicate_candidates,
--             document_import_batches, recompute_jobs, system_diagnostics
-- =============================================================================

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON import_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_rows FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON import_rows FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE duplicate_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_candidates FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON duplicate_candidates FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE document_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_import_batches FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON document_import_batches FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE recompute_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recompute_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON recompute_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE system_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_diagnostics FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON system_diagnostics FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 008 tables: listings, listing_contacts, listing_checklist_items,
--             listing_stage_transitions, listing_timeline_events,
--             listing_exceptions, offers, seller_portal_access,
--             seller_document_requests, listing_handoff_events,
--             listing_documents
-- =============================================================================

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON listings FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE listing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON listing_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE listing_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_checklist_items FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON listing_checklist_items FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE listing_stage_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_stage_transitions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON listing_stage_transitions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE listing_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_timeline_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON listing_timeline_events FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE listing_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_exceptions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON listing_exceptions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON offers FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE seller_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_portal_access FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON seller_portal_access FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE seller_document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_document_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON seller_document_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE listing_handoff_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_handoff_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON listing_handoff_events FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE listing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON listing_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 009 tables: workflows, workflow_versions, workflow_triggers,
--             workflow_runs, workflow_run_steps
-- =============================================================================

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON workflows FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON workflow_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON workflow_triggers FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON workflow_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE workflow_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_run_steps FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON workflow_run_steps FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 010 tables: team_invites
-- =============================================================================

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON team_invites FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 012 tables: deal_orchestrators, orchestrator_world_states,
--             orchestrator_memory_entries, orchestrator_cycles,
--             orchestrator_action_proposals, orchestrator_action_executions,
--             orchestrator_next_actions, orchestrator_obligations
-- =============================================================================

ALTER TABLE deal_orchestrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_orchestrators FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON deal_orchestrators FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_world_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_world_states FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_world_states FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_memory_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_memory_entries FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_cycles FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_cycles FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_action_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_action_proposals FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_action_proposals FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_action_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_action_executions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_action_executions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_next_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_next_actions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_next_actions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_obligations FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_obligations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 013 tables: orchestrator_action_policies
-- =============================================================================

ALTER TABLE orchestrator_action_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_action_policies FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_action_policies FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 014 tables: orchestrator_follow_through_runs
-- =============================================================================

ALTER TABLE orchestrator_follow_through_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_follow_through_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_follow_through_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 015 tables: orchestrator_plans, orchestrator_subgoals,
--             orchestrator_plan_revisions
-- =============================================================================

ALTER TABLE orchestrator_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_plans FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_subgoals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_subgoals FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_subgoals FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_plan_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_plan_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_plan_revisions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 016 tables: orchestrator_specialist_traces
-- =============================================================================

ALTER TABLE orchestrator_specialist_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_specialist_traces FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_specialist_traces FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 017 tables: orchestrator_outcomes, orchestrator_action_scores,
--             orchestrator_recommendation_feedback,
--             orchestrator_correction_patterns,
--             orchestrator_counterparty_signals,
--             orchestrator_counterparty_profiles,
--             orchestrator_specialist_scores, orchestrator_org_profiles,
--             orchestrator_memory_summaries, orchestrator_learning_events
-- =============================================================================

ALTER TABLE orchestrator_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_outcomes FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_action_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_action_scores FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_action_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_recommendation_feedback FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_recommendation_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_correction_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_correction_patterns FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_correction_patterns FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_counterparty_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_counterparty_signals FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_counterparty_signals FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_counterparty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_counterparty_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_counterparty_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_specialist_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_specialist_scores FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_specialist_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_org_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_org_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_org_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_memory_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_memory_summaries FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_memory_summaries FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE orchestrator_learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_learning_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON orchestrator_learning_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 019 tables: workflow_authoring_sessions, workflow_authoring_intents,
--             workflow_generation_attempts, workflow_generation_assumptions,
--             workflow_generation_warnings, workflow_generation_repair_attempts
-- =============================================================================

ALTER TABLE workflow_authoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_authoring_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON workflow_authoring_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE workflow_authoring_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_authoring_intents FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON workflow_authoring_intents FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE workflow_generation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_generation_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON workflow_generation_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE workflow_generation_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_generation_assumptions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON workflow_generation_assumptions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE workflow_generation_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_generation_warnings FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON workflow_generation_warnings FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE workflow_generation_repair_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_generation_repair_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON workflow_generation_repair_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 020 tables: automation_trace_events
-- =============================================================================

ALTER TABLE automation_trace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_trace_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_trace_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 021 tables: automation_governance_scopes, automation_governance_assignments,
--             automation_approval_chains, automation_approval_chain_steps,
--             automation_separation_of_duties_rules,
--             automation_reviewer_routes, automation_governance_conflicts,
--             automation_governance_events
-- =============================================================================

ALTER TABLE automation_governance_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_governance_scopes FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_governance_scopes FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_governance_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_governance_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_governance_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_approval_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_approval_chains FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_approval_chains FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_approval_chain_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_approval_chain_steps FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_approval_chain_steps FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_separation_of_duties_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_separation_of_duties_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_separation_of_duties_rules FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_reviewer_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_reviewer_routes FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_reviewer_routes FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_governance_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_governance_conflicts FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_governance_conflicts FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_governance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_governance_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_governance_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 022 tables: automation_value_records, automation_time_saved_estimates,
--             automation_manual_work_displacement, automation_roi_summaries,
--             automation_cost_signals, automation_negative_value_signals,
--             template_value_summaries, playbook_value_summaries,
--             office_automation_leverage_summaries,
--             organization_automation_value_reports
-- =============================================================================

ALTER TABLE automation_value_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_value_records FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_value_records FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_time_saved_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_time_saved_estimates FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_time_saved_estimates FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_manual_work_displacement ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_manual_work_displacement FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_manual_work_displacement FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_roi_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_roi_summaries FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_roi_summaries FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_cost_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_cost_signals FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_cost_signals FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_negative_value_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_negative_value_signals FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_negative_value_signals FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE template_value_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_value_summaries FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON template_value_summaries FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE playbook_value_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_value_summaries FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON playbook_value_summaries FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE office_automation_leverage_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_automation_leverage_summaries FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON office_automation_leverage_summaries FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE organization_automation_value_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_automation_value_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON organization_automation_value_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 023 tables: automation_entitlements, automation_feature_flags,
--             automation_packages, automation_package_versions,
--             automation_package_assets,
--             automation_package_compatibility_reports,
--             automation_package_exports, automation_package_imports,
--             automation_library_installations,
--             automation_package_distribution_events
-- =============================================================================

ALTER TABLE automation_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_entitlements FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_entitlements FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_feature_flags FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_feature_flags FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_packages FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_package_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_package_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_package_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_package_assets FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_package_compatibility_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_package_compatibility_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_package_compatibility_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_package_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_package_exports FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_package_exports FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_package_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_package_imports FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_package_imports FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_library_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_library_installations FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_library_installations FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_package_distribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_package_distribution_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_package_distribution_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 024 tables: automation_recommendation_profiles,
--             automation_onboarding_sessions, automation_setup_states,
--             automation_activation_checklists, automation_setup_blockers,
--             automation_first_value_milestones,
--             automation_adoption_health_summaries,
--             automation_rollout_guidance_records,
--             automation_activation_events,
--             automation_customer_success_notes
-- =============================================================================

ALTER TABLE automation_recommendation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_recommendation_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_recommendation_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_onboarding_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_onboarding_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_setup_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_setup_states FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_setup_states FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_activation_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_activation_checklists FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_activation_checklists FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_setup_blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_setup_blockers FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_setup_blockers FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_first_value_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_first_value_milestones FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_first_value_milestones FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_adoption_health_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_adoption_health_summaries FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_adoption_health_summaries FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_rollout_guidance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rollout_guidance_records FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_rollout_guidance_records FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_activation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_activation_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_activation_events FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE automation_customer_success_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_customer_success_notes FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON automation_customer_success_notes FOR ALL TO service_role USING (true) WITH CHECK (true);
