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

export async function createRuleAction(
  ruleType: string,
  name: string,
  conditions: Record<string, unknown>,
  actions: Record<string, unknown>,
) {
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
    ruleType,
    name,
    conditions,
    actions,
    createdByUserId: profile.id,
  });

  revalidatePath('/settings');
  revalidatePath('/settings/rules');

  return rule;
}

export async function toggleRuleAction(ruleId: string, isActive: boolean) {
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

  return result;
}

export async function createTemplateAction(
  templateType: string,
  name: string,
  contentJson: Record<string, unknown>,
) {
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
    templateType,
    name,
    contentJson,
    createdByUserId: profile.id,
  });

  revalidatePath('/settings');
  revalidatePath('/settings/templates');

  return template;
}

export async function applyTemplateAction(templateId: string, transactionId: string) {
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

  return result;
}
