'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import { decideApproval } from '@/lib/services/approval-service';
import * as approvalRepo from '@/lib/repositories/approvals';
import { inngest } from '@/lib/workflows/client';

export async function decideApprovalAction(
  approvalId: string,
  decision: 'approved' | 'rejected',
  notes?: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const existing = await approvalRepo.findById(approvalId);
    if (!existing) return { error: 'Approval not found' };

    await requireRole(existing.organization_id, ['coordinator', 'broker_admin']);

    const approval = await decideApproval(approvalId, decision, profile.id, notes);

    if (decision === 'approved' && existing.approval_type === 'outbound_email') {
      await inngest.send({
        name: 'approval/decided',
        data: { approvalId: approval.id },
      });
    }

    revalidatePath(`/transactions/${approval.transaction_id}`);
    revalidatePath('/approvals');

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to process approval' };
  }
}
