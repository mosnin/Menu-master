import { describe, expect, it } from 'vitest';

import { generateWorkflowAuthoringIntent } from '@/lib/ai/workflow-authoring-generator';
import { mapAuthoringIntentToGraph } from '@/lib/services/workflow-authoring-mapper';

describe('Workflow authoring intent generation', () => {
  it('parses a document upload workflow description into bounded intent fields', async () => {
    const intent = await generateWorkflowAuthoringIntent(
      'When a document is uploaded, create a checklist item and request manual review.',
    );

    expect(intent.trigger.type).toBe('document_uploaded');
    expect(intent.actions.some((a) => a.kind === 'create_checklist_item')).toBe(true);
    expect(intent.actions.some((a) => a.kind === 'request_manual_review')).toBe(true);
  });

  it('captures ambiguous language as warnings instead of silent behavior', async () => {
    const intent = await generateWorkflowAuthoringIntent(
      'When the deal is risky, follow up a few times and send reminders as needed.',
    );

    expect(intent.ambiguities.length).toBeGreaterThan(0);
    expect(intent.missingInformation.length).toBeGreaterThan(0);
  });
});

describe('Workflow authoring intent to graph mapping', () => {
  it('maps inferred intent into a graph and runs validation', async () => {
    const intent = await generateWorkflowAuthoringIntent(
      'Every morning create a notification and wait two days then escalate.',
    );

    const result = mapAuthoringIntentToGraph(intent);

    expect(result.graphData.nodes[0].type).toBe('start');
    expect(result.graphData.nodes[result.graphData.nodes.length - 1].type).toBe('stop');
    expect(result.graphData.triggers[0].event_type).toBe('scheduled_trigger');
    expect(result.validation.valid).toBe(true);
    expect(result.metadata.explanation.length).toBeGreaterThan(0);
  });

  it('uses manual trigger placeholder when trigger is unclear', async () => {
    const intent = await generateWorkflowAuthoringIntent('Create a reminder draft for the team.');
    const result = mapAuthoringIntentToGraph(intent);
    expect(result.graphData.triggers[0].event_type).toBe('manual_trigger');
  });
});
