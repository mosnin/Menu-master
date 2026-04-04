'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import {
  createRule,
  toggleRule,
  createTemplate,
  applyTemplate,
} from '@/lib/services/org-config-service';
import { supabase } from '@/lib/db/client';
import { CreateRuleSchema, CreateTemplateSchema, ApplyTemplateSchema, UuidSchema } from '@/lib/validation/schemas';
import { z } from 'zod';
import { trackEvent } from '@/lib/analytics/events';

export async function createRuleAction(
  ruleType: string,
  name: string,
  conditions: Record<string, unknown>,
  actions: Record<string, unknown>,
) {
  const validated = CreateRuleSchema.parse({ ruleType, name, conditions, actions });
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Get the user's org from their membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_profile_id', profile.id)
    .limit(1)
    .single();
  if (!membership) throw new Error('No organization membership found');
  const orgId = membership.organization_id;

  await requireOrgMembership(orgId);

  const rule = await createRule({
    orgId,
    ruleType: validated.ruleType,
    name: validated.name,
    conditions: validated.conditions,
    actions: validated.actions,
    createdByUserId: profile.id,
  });

  revalidatePath('/settings');
  revalidatePath('/settings/rules');

  trackEvent({ orgId, userId: profile.id, event: 'rule_created' as any, category: 'configuration', properties: { ruleId: rule.id, ruleType: validated.ruleType } });

  return rule;
}

export async function toggleRuleAction(ruleId: string, isActive: boolean) {
  UuidSchema.parse(ruleId);
  z.boolean().parse(isActive);
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Look up the rule to find its org
  const { data: rule } = await supabase
    .from('organization_rules')
    .select('organization_id')
    .eq('id', ruleId)
    .single();
  if (!rule) throw new Error('Rule not found');

  await requireOrgMembership(rule.organization_id);

  const result = await toggleRule(ruleId, isActive);

  revalidatePath('/settings');
  revalidatePath('/settings/rules');

  trackEvent({ orgId: rule.organization_id, userId: profile.id, event: 'rule_toggled' as any, category: 'configuration', properties: { ruleId, isActive } });

  return result;
}

export async function createTemplateAction(
  templateType: string,
  name: string,
  contentJson: Record<string, unknown>,
) {
  const validated = CreateTemplateSchema.parse({ templateType, name, contentJson });
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Get the user's org from their membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_profile_id', profile.id)
    .limit(1)
    .single();
  if (!membership) throw new Error('No organization membership found');
  const orgId = membership.organization_id;

  await requireOrgMembership(orgId);

  const template = await createTemplate({
    orgId,
    templateType: validated.templateType,
    name: validated.name,
    contentJson: validated.contentJson,
    createdByUserId: profile.id,
  });

  revalidatePath('/settings');
  revalidatePath('/settings/templates');

  trackEvent({ orgId, userId: profile.id, event: 'template_created' as any, category: 'configuration', properties: { templateId: template.id, templateType: validated.templateType } });

  return template;
}

export async function applyTemplateAction(templateId: string, transactionId: string) {
  ApplyTemplateSchema.parse({ templateId, transactionId });
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Verify org membership via the transaction
  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const result = await applyTemplate(templateId, transactionId);

  revalidatePath(`/transactions/${transactionId}`);

  trackEvent({ orgId: transaction.organization_id, userId: profile.id, event: 'template_applied' as any, category: 'configuration', properties: { templateId, transactionId } });

  return result;
}
