import { supabase } from '@/lib/db/client';
import * as rulesRepo from '@/lib/repositories/organization-rules';
import * as templatesRepo from '@/lib/repositories/organization-templates';
import * as checklistItemsRepo from '@/lib/repositories/checklist-items';
import * as timelineEventsRepo from '@/lib/repositories/timeline-events';
import { logAction } from '@/lib/audit/logger';
import type {
  OrganizationRule,
  OrganizationTemplate,
  ChecklistItem,
  ChecklistItemStatus,
  TimelineEvent,
  TimelineEventStatus,
  TimelineEventSource,
} from '@/types';

// ---------------------------------------------------------------------------
// Organization Rules
// ---------------------------------------------------------------------------

export async function createRule(params: {
  orgId: string;
  ruleType: string;
  name: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  createdByUserId: string;
}): Promise<OrganizationRule> {
  const rule = await rulesRepo.create({
    organization_id: params.orgId,
    rule_type: params.ruleType,
    rule_config: {
      name: params.name,
      conditions: params.conditions,
      actions: params.actions,
    },
    is_active: true,
  });

  await logAction({
    organizationId: params.orgId,
    actorType: 'user',
    actorUserId: params.createdByUserId,
    action: 'rule.created',
    targetType: 'organization_rule',
    targetId: rule.id,
    metadata: { rule_type: params.ruleType, name: params.name },
  });

  return rule;
}

export async function updateRule(
  ruleId: string,
  updates: Partial<{
    ruleType: string;
    name: string;
    conditions: Record<string, unknown>;
    actions: Record<string, unknown>;
    isActive: boolean;
  }>,
): Promise<OrganizationRule> {
  const patchFields: Partial<Omit<OrganizationRule, 'id' | 'created_at' | 'updated_at'>> = {};

  if (updates.ruleType !== undefined) {
    patchFields.rule_type = updates.ruleType;
  }
  if (updates.isActive !== undefined) {
    patchFields.is_active = updates.isActive;
  }
  // Merge name / conditions / actions into rule_config when provided
  if (updates.name !== undefined || updates.conditions !== undefined || updates.actions !== undefined) {
    // Fetch existing rule_config so we can merge
    const { data: existing, error: fetchError } = await supabase
      .from('organization_rules')
      .select('rule_config')
      .eq('id', ruleId)
      .single();

    if (fetchError) throw fetchError;

    const currentConfig = (existing?.rule_config ?? {}) as Record<string, unknown>;
    patchFields.rule_config = {
      ...currentConfig,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.conditions !== undefined ? { conditions: updates.conditions } : {}),
      ...(updates.actions !== undefined ? { actions: updates.actions } : {}),
    };
  }

  const rule = await rulesRepo.update(ruleId, patchFields);

  await logAction({
    organizationId: rule.organization_id,
    actorType: 'system',
    action: 'rule.updated',
    targetType: 'organization_rule',
    targetId: ruleId,
    metadata: { updates },
  });

  return rule;
}

export async function getRules(orgId: string): Promise<OrganizationRule[]> {
  return rulesRepo.findByOrgId(orgId);
}

export async function toggleRule(
  ruleId: string,
  isActive: boolean,
): Promise<OrganizationRule> {
  const rule = await rulesRepo.update(ruleId, { is_active: isActive });

  await logAction({
    organizationId: rule.organization_id,
    actorType: 'system',
    action: 'rule.updated',
    targetType: 'organization_rule',
    targetId: ruleId,
    metadata: { is_active: isActive },
  });

  return rule;
}

// ---------------------------------------------------------------------------
// Organization Templates
// ---------------------------------------------------------------------------

export async function createTemplate(params: {
  orgId: string;
  templateType: string;
  name: string;
  contentJson: Record<string, unknown>;
  createdByUserId: string;
}): Promise<OrganizationTemplate> {
  const template = await templatesRepo.create({
    organization_id: params.orgId,
    template_type: params.templateType,
    transaction_type: null,
    name: params.name,
    description: null,
    template_data: params.contentJson,
    is_default: false,
  });

  await logAction({
    organizationId: params.orgId,
    actorType: 'user',
    actorUserId: params.createdByUserId,
    action: 'template.created',
    targetType: 'organization_template',
    targetId: template.id,
    metadata: { template_type: params.templateType, name: params.name },
  });

  return template;
}

export async function getTemplates(
  orgId: string,
  templateType?: string,
): Promise<OrganizationTemplate[]> {
  if (templateType) {
    return templatesRepo.findByType(orgId, templateType);
  }
  return templatesRepo.findByOrgId(orgId);
}

/**
 * Applies a checklist or timeline template to a transaction.
 *
 * For 'checklist' templates the template_data is expected to contain an
 * `items` array with objects like `{ title, description, due_date? }`.
 *
 * For 'timeline' templates the template_data is expected to contain an
 * `events` array with objects like `{ event_type, title, description, event_date? }`.
 */
export async function applyTemplate(
  templateId: string,
  transactionId: string,
): Promise<{ checklistItems?: ChecklistItem[]; timelineEvents?: TimelineEvent[] }> {
  // Fetch the template
  const { data: template, error: fetchError } = await supabase
    .from('organization_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (fetchError) throw fetchError;
  if (!template) throw new Error(`Template ${templateId} not found`);

  const tpl = template as OrganizationTemplate;
  const result: { checklistItems?: ChecklistItem[]; timelineEvents?: TimelineEvent[] } = {};

  if (tpl.template_type === 'checklist') {
    const items = (tpl.template_data.items ?? []) as Array<{
      title: string;
      description?: string;
      due_date?: string;
      requires_review?: boolean;
    }>;

    const rows = items.map((item) => ({
      transaction_id: transactionId,
      title: item.title,
      description: item.description ?? null,
      due_date: item.due_date ?? null,
      status: 'pending' as ChecklistItemStatus,
      source: 'template' as const,
      requires_review: item.requires_review ?? false,
      completed_at: null,
      assigned_to_user_id: null,
    }));

    result.checklistItems = await checklistItemsRepo.createMany(rows);
  } else if (tpl.template_type === 'timeline') {
    const events = (tpl.template_data.events ?? []) as Array<{
      event_type: string;
      title: string;
      description?: string;
      event_date?: string;
    }>;

    const rows = events.map((evt) => ({
      transaction_id: transactionId,
      event_type: evt.event_type,
      title: evt.title,
      description: evt.description ?? null,
      event_date: evt.event_date ?? null,
      status: 'upcoming' as TimelineEventStatus,
      source: 'system' as TimelineEventSource,
    }));

    result.timelineEvents = await timelineEventsRepo.createMany(rows);
  } else {
    throw new Error(`Unsupported template type: ${tpl.template_type}`);
  }

  await logAction({
    organizationId: tpl.organization_id,
    transactionId,
    actorType: 'system',
    action: 'template.applied',
    targetType: 'organization_template',
    targetId: templateId,
    metadata: {
      template_type: tpl.template_type,
      template_name: tpl.name,
      items_created:
        (result.checklistItems?.length ?? 0) + (result.timelineEvents?.length ?? 0),
    },
  });

  return result;
}
