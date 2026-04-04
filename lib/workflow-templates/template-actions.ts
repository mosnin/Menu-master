'use server';

import { requireAuth } from '@/lib/auth/session';
import { WORKFLOW_TEMPLATES, getTemplateById } from './index';

export async function getTemplatesAction() {
  await requireAuth();
  return WORKFLOW_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    trigger_event: t.trigger_event,
    complexity: t.complexity,
    contains_agent_nodes: t.contains_agent_nodes,
  }));
}

export async function getTemplateGraphAction(templateId: string) {
  await requireAuth();
  const template = getTemplateById(templateId);
  if (!template) return null;
  return template.graph_data;
}
