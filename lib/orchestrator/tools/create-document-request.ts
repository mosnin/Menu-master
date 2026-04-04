import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { createRequest } from '@/lib/services/document-request-service';

const contract: ToolContract = {
  name: 'create_document_request',
  description: 'Create an external document request to collect a missing document from a counterparty.',
  risk_class: 'medium_risk',
  required_role: 'coordinator',
  idempotent: false,
  params_schema: {
    recipient_email: { type: 'string', required: true, description: 'Email of the person to request the document from' },
    recipient_name: { type: 'string', required: true, description: 'Name of the recipient' },
    document_type: { type: 'string', required: true, description: 'Type of document being requested' },
    description: { type: 'string', required: false, description: 'Description of what is needed' },
    document_types: { type: 'array', required: false, description: 'List of document types to request (batch mode)' },
  },
  side_effects: ['Creates document_request record', 'May trigger email notification'],
};

const execute: ToolExecutor = async (params, context) => {
  const recipientEmail = params.recipient_email as string;
  const recipientName = params.recipient_name as string;
  const documentType = params.document_type as string;

  if (!recipientEmail || !recipientName || !documentType) {
    return {
      success: false,
      result: { error: 'Missing required parameters: recipient_email, recipient_name, document_type' },
      side_effects: [],
    };
  }

  const request = await createRequest({
    orgId: context.organizationId,
    transactionId: context.entityId,
    requestedByUserId: context.actorUserId || context.orchestratorId,
    recipientEmail,
    recipientName,
    documentType,
    description: params.description as string | undefined,
  });

  return {
    success: true,
    result: { document_request_id: request.id, document_type: documentType, status: request.status },
    side_effects: [
      { type: 'document_request_created', description: `Document request sent for ${documentType}`, target_id: request.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
