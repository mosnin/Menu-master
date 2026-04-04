import { inngest } from '@/lib/workflows/client';
import type { OrchestratorCycleTrigger, OrchestratorEntityType } from '@/types';

export async function emitEntityChanged(
  entityType: OrchestratorEntityType,
  entityId: string,
  triggerType: OrchestratorCycleTrigger,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await inngest.send({
      name: 'orchestrator/entity.changed',
      data: {
        entity_type: entityType,
        entity_id: entityId,
        trigger_type: triggerType,
        metadata: metadata ?? {},
      },
    });
  } catch {
    // Best effort — don't crash domain operations
  }
}

// Convenience helpers
export const emitDocumentUploaded = (entityType: OrchestratorEntityType, entityId: string, documentId: string) =>
  emitEntityChanged(entityType, entityId, 'document_uploaded', { document_id: documentId });

export const emitApprovalChanged = (entityType: OrchestratorEntityType, entityId: string, approvalId: string) =>
  emitEntityChanged(entityType, entityId, 'approval_changed', { approval_id: approvalId });

export const emitStageChanged = (entityType: OrchestratorEntityType, entityId: string, newStage: string) =>
  emitEntityChanged(entityType, entityId, 'stage_changed', { new_stage: newStage });

export const emitCommunicationReceived = (entityType: OrchestratorEntityType, entityId: string) =>
  emitEntityChanged(entityType, entityId, 'communication_received');

export const emitExceptionDetected = (entityType: OrchestratorEntityType, entityId: string, exceptionId: string) =>
  emitEntityChanged(entityType, entityId, 'exception_detected', { exception_id: exceptionId });
