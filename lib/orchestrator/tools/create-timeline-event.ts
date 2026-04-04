import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { addMilestoneEvent } from '@/lib/services/timeline-service';

const contract: ToolContract = {
  name: 'create_timeline_event',
  description: 'Create a timeline event to record a milestone or notable occurrence on a transaction.',
  risk_class: 'safe',
  required_role: 'coordinator',
  idempotent: false,
  params_schema: {
    event_type: { type: 'string', required: true, description: 'Type of timeline event' },
    title: { type: 'string', required: true, description: 'Event title' },
    description: { type: 'string', required: false, description: 'Event description' },
  },
  side_effects: ['Creates timeline_event record'],
};

const execute: ToolExecutor = async (params, context) => {
  const event = await addMilestoneEvent(
    context.entityId,
    params.event_type as string,
    params.title as string,
    params.description as string | undefined,
  );

  return {
    success: true,
    result: { timeline_event_id: event.id, event_type: event.event_type, title: event.title },
    side_effects: [
      { type: 'timeline_event_created', description: `Timeline event: ${event.title}`, target_id: event.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
