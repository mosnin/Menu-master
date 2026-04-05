import { getOpenAIClient } from '@/lib/ai/client';
import {
  WorkflowAuthoringIntentSchema,
  type WorkflowAuthoringIntent,
} from '@/lib/validation/workflow-authoring';

const SYSTEM_PROMPT = `You convert deal desk workflow descriptions into strict JSON.
Rules:
- Scope to deal operations workflows only.
- Never produce executable actions.
- Return only fields from the schema.
- Mark uncertainty as ambiguities and missingInformation.
- Use supported action kinds whenever possible; otherwise use unsupported.`;

const AMBIGUOUS_PHRASES = ['soon', 'important', 'a few times', 'as needed', 'risky'];

export async function generateWorkflowAuthoringIntent(description: string): Promise<WorkflowAuthoringIntent> {
  const client = getOpenAIClient();

  if (!client) {
    return heuristicIntent(description);
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Workflow description:\n${description}\n\nReturn a JSON object matching the authoring intent schema.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return heuristicIntent(description);
  }

  const parsed = JSON.parse(content);
  return WorkflowAuthoringIntentSchema.parse(parsed);
}

function heuristicIntent(description: string): WorkflowAuthoringIntent {
  const text = description.toLowerCase();
  const assumptions: string[] = [];
  const ambiguities: WorkflowAuthoringIntent['ambiguities'] = [];
  const missingInformation: string[] = [];

  for (const phrase of AMBIGUOUS_PHRASES) {
    if (text.includes(phrase)) {
      ambiguities.push({
        code: 'AMBIGUOUS_PHRASE',
        message: `Phrase "${phrase}" needs explicit rules before publish.`,
        sourceText: phrase,
      });
    }
  }

  let trigger: WorkflowAuthoringIntent['trigger'] = { type: 'unknown' };
  if (text.includes('document') && text.includes('upload')) {
    trigger = { type: 'document_uploaded', event: 'document_uploaded' };
  } else if (text.includes('enters financing') || text.includes('financing')) {
    trigger = { type: 'transaction_enters_financing', event: 'stage_changed' };
  } else if (text.includes('launch blocked')) {
    trigger = { type: 'listing_launch_blocked', event: 'exception_created' };
  } else if (text.includes('every morning')) {
    trigger = { type: 'scheduled', schedule: '0 9 * * *' };
    assumptions.push('Assumed schedule uses 9:00 AM org-local daily cadence.');
  }

  if (trigger.type === 'unknown') {
    missingInformation.push('Specify when this workflow should start (trigger event or schedule).');
  }

  const actions: WorkflowAuthoringIntent['actions'] = [];

  if (text.includes('notification')) {
    actions.push({ id: 'action-notify', kind: 'create_notification', label: 'Create notification', sourceText: 'notification', confidence: 0.88 });
  }
  if (text.includes('checklist')) {
    actions.push({ id: 'action-checklist', kind: 'create_checklist_item', label: 'Create checklist item', sourceText: 'checklist', confidence: 0.86 });
  }
  if (text.includes('manual review') || text.includes('coordinator review')) {
    actions.push({ id: 'action-review', kind: 'request_manual_review', label: 'Request manual review', sourceText: 'manual review', confidence: 0.9 });
  }
  if (text.includes('approval')) {
    actions.push({ id: 'action-approval', kind: 'create_approval_request', label: 'Create approval request', sourceText: 'approval', confidence: 0.88 });
  }
  if (text.includes('reminder')) {
    actions.push({ id: 'action-reminder', kind: 'create_reminder_draft', label: 'Create reminder draft', sourceText: 'reminder', confidence: 0.84 });
  }
  if (text.includes('recompute readiness')) {
    actions.push({ id: 'action-readiness', kind: 'recompute_readiness', label: 'Recompute readiness', sourceText: 'recompute readiness', confidence: 0.9 });
  }
  if (text.includes('recompute completeness')) {
    actions.push({ id: 'action-completeness', kind: 'recompute_completeness', label: 'Recompute completeness', sourceText: 'recompute completeness', confidence: 0.9 });
  }

  const waits: WorkflowAuthoringIntent['waits'] = [];
  if (text.includes('wait two days') || text.includes('in two days') || text.includes('after two days')) {
    waits.push({ id: 'wait-2-days', mode: 'duration', durationHours: 48, sourceText: 'two days' });
  }
  if (text.includes('wait until approval decision')) {
    waits.push({ id: 'wait-approval', mode: 'event', eventType: 'approval_decided', sourceText: 'approval decision' });
  }

  const escalations: WorkflowAuthoringIntent['escalations'] = [];
  if (text.includes('escalate')) {
    const hasTwoDays = text.includes('two days');
    escalations.push({
      id: 'escalation-1',
      afterHours: hasTwoDays ? 48 : null,
      action: 'create_notification',
      sourceText: 'escalate',
    });
    if (!hasTwoDays) {
      missingInformation.push('Escalation timing is missing; specify duration before escalation.');
    }
  }

  const conditions: WorkflowAuthoringIntent['conditions'] = [];
  if (text.includes('if ')) {
    conditions.push({
      id: 'condition-1',
      expression: 'Condition inferred from prompt',
      sourceText: 'if ...',
      confidence: 0.68,
    });
    assumptions.push('Condition expression was preserved as text and should be refined in builder.');
  }

  return WorkflowAuthoringIntentSchema.parse({
    goal: description,
    actorContext: null,
    trigger,
    conditions,
    actions,
    waits,
    branches: [],
    loops: [],
    reviews: text.includes('review') ? ['Manual review gate inferred'] : [],
    notifications: text.includes('notification') ? ['Notification requested'] : [],
    escalations,
    timingConstraints: [],
    fallbackBehavior: null,
    assumptions,
    ambiguities,
    missingInformation,
    unsupportedRequests: [],
    confidence: Math.max(0.45, 0.92 - ambiguities.length * 0.08),
  });
}
