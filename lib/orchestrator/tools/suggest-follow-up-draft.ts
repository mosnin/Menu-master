import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { createMessageDraft } from '@/lib/services/message-service';

const contract: ToolContract = {
  name: 'suggest_follow_up_draft',
  description: 'Create a draft outbound message for follow-up communication. Requires approval before sending.',
  risk_class: 'medium_risk',
  required_role: 'coordinator',
  idempotent: false,
  params_schema: {
    recipient_name: { type: 'string', required: true, description: 'Name of the recipient' },
    recipient_email: { type: 'string', required: true, description: 'Email of the recipient' },
    subject: { type: 'string', required: true, description: 'Email subject line' },
    body: { type: 'string', required: true, description: 'Email body text' },
  },
  side_effects: ['Creates outbound_message record as draft', 'Creates approval record for the email'],
};

const execute: ToolExecutor = async (params, context) => {
  const recipientName = params.recipient_name as string;
  const recipientEmail = params.recipient_email as string;
  const subject = params.subject as string;
  const body = params.body as string;

  if (!recipientName || !recipientEmail || !subject || !body) {
    return {
      success: false,
      result: { error: 'Missing required parameters: recipient_name, recipient_email, subject, body' },
      side_effects: [],
    };
  }

  const message = await createMessageDraft({
    orgId: context.organizationId,
    transactionId: context.entityId,
    recipientName,
    recipientEmail,
    subject,
    body,
    requestedByUserId: context.actorUserId,
  });

  return {
    success: true,
    result: { message_id: message.id, status: message.status, subject },
    side_effects: [
      { type: 'message_drafted', description: `Follow-up draft created: ${subject}`, target_id: message.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
