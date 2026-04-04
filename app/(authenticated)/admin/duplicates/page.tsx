import { auth0, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import * as membershipRepo from '@/lib/repositories/memberships';
import * as duplicateService from '@/lib/services/duplicate-detection-service';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Copy } from 'lucide-react';
import { DuplicateList } from '@/components/admin/duplicate-list';

export default async function DuplicatesPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  let candidates: any[] = [];
  let pendingCount = 0;

  try {
    const profile = await getCurrentUserProfile();
    if (profile) {
      const memberships = await membershipRepo.findByUserId(profile.id);
      if (memberships.length > 0) {
        await requireRole(memberships[0].organization_id, ['coordinator', 'broker_admin']);
        const orgId = memberships[0].organization_id;
        candidates = await duplicateService.getPendingDuplicates(orgId);
        pendingCount = await duplicateService.getPendingDuplicateCount(orgId);
      }
    }
  } catch {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Duplicate Detection"
        description={pendingCount > 0 ? `${pendingCount} potential duplicate${pendingCount !== 1 ? 's' : ''} found` : 'No duplicates detected'}
        backHref="/admin"
      />

      {candidates.length === 0 ? (
        <EmptyState
          icon={Copy}
          title="No duplicates found"
          description="Run duplicate detection to find potential duplicate contacts and transactions."
        />
      ) : (
        <DuplicateList initialCandidates={candidates} />
      )}
    </div>
  );
}
