import { supabase } from '@/lib/db/client';
import * as packetRepo from '@/lib/repositories/packet-ingestions';
import { logAction } from '@/lib/audit/logger';
import type { PacketIngestion } from '@/types';

interface StartIngestionParams {
  orgId: string;
  transactionId: string;
  fileName: string;
  storagePath: string;
  uploadedByUserId: string;
}

export async function startIngestion(
  params: StartIngestionParams,
): Promise<PacketIngestion> {
  const ingestion = await packetRepo.create({
    organization_id: params.orgId,
    transaction_id: params.transactionId,
    status: 'pending',
    file_count: 0,
    classification_results: null,
    created_by_user_id: params.uploadedByUserId,
    processing_started_at: null,
    processing_completed_at: null,
    error_message: null,
  });

  // Create the initial document record for the packet
  const { error } = await supabase.from('documents').insert({
    organization_id: params.orgId,
    transaction_id: params.transactionId,
    file_name: params.fileName,
    storage_path: params.storagePath,
    mime_type: 'application/pdf',
    file_size: null,
    uploaded_by_user_id: params.uploadedByUserId,
    processing_status: 'pending',
    document_type: null,
  });

  if (error) {
    throw new Error(`Failed to create document for packet: ${error.message}`);
  }

  await logAction({
    organizationId: params.orgId,
    transactionId: params.transactionId,
    actorType: 'user',
    actorUserId: params.uploadedByUserId,
    action: 'document.uploaded',
    targetType: 'packet_ingestion',
    targetId: ingestion.id,
    metadata: { file_name: params.fileName },
  });

  return ingestion;
}

export async function processPacket(
  ingestionId: string,
): Promise<PacketIngestion> {
  const ingestion = await packetRepo.findById(ingestionId);
  if (!ingestion) throw new Error(`Packet ingestion ${ingestionId} not found`);

  await packetRepo.updateStatus(ingestionId, 'processing', {
    processing_started_at: new Date().toISOString(),
  });

  try {
    // MVP: treat packet as single document. Full implementation would split, classify, and extract each section.
    const { data: documents } = await supabase
      .from('documents')
      .select('id')
      .eq('transaction_id', ingestion.transaction_id)
      .eq('processing_status', 'pending');

    const fileCount = documents?.length ?? 1;

    const updated = await packetRepo.updateStatus(ingestionId, 'completed', {
      processing_completed_at: new Date().toISOString(),
      classification_results: { documents_found: fileCount, method: 'single_document_mvp' },
    });

    await supabase
      .from('packet_ingestions')
      .update({ file_count: fileCount })
      .eq('id', ingestionId);

    return updated;
  } catch (err) {
    await packetRepo.updateStatus(ingestionId, 'failed', {
      error_message: err instanceof Error ? err.message : 'Processing failed',
    });
    throw err;
  }
}

export async function getIngestionStatus(
  ingestionId: string,
): Promise<PacketIngestion | null> {
  return packetRepo.findById(ingestionId);
}

export async function getIngestionsForTransaction(
  transactionId: string,
): Promise<PacketIngestion[]> {
  const { data, error } = await supabase
    .from('packet_ingestions')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch packet ingestions: ${error.message}`);
  return (data ?? []) as PacketIngestion[];
}
