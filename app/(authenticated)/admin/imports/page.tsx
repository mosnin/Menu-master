import { auth0, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import * as membershipRepo from '@/lib/repositories/memberships';
import * as importService from '@/lib/services/import-service';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, humanizeStatus } from '@/lib/format';
import Link from 'next/link';

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  validating: 'secondary',
  validated: 'secondary',
  importing: 'default',
  completed: 'default',
  completed_with_errors: 'destructive',
  failed: 'destructive',
  cancelled: 'outline',
};

export default async function ImportsPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  let jobs: any[] = [];
  try {
    const profile = await getCurrentUserProfile();
    if (profile) {
      const memberships = await membershipRepo.findByUserId(profile.id);
      if (memberships.length > 0) {
        await requireRole(memberships[0].organization_id, ['coordinator', 'broker_admin']);
        jobs = await importService.getImportJobs(memberships[0].organization_id);
      }
    }
  } catch {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="CSV Imports"
        description="Import contacts, transactions, or properties from CSV files."
        backHref="/admin"
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/admin/imports/new" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              New Import
            </Link>
          </Button>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No imports yet"
          description="Upload a CSV file to import contacts, transactions, or properties into Deal Desk."
          action={
            <Button asChild className="rounded-lg">
              <Link href="/admin/imports/new" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                New Import
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="rounded-2xl shadow-sm">
              <CardContent className="flex items-center gap-4 py-4 px-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60 shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium truncate">{job.file_name}</p>
                    <Badge variant={statusVariants[job.status] ?? 'outline'} className="text-[10px] px-1.5 py-0">
                      {humanizeStatus(job.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[12px] text-muted-foreground/60">
                    <span>{humanizeStatus(job.import_type)}</span>
                    <span>{job.total_rows} rows</span>
                    {job.imported_rows > 0 && <span>{job.imported_rows} imported</span>}
                    {job.error_rows > 0 && <span className="text-red-500">{job.error_rows} errors</span>}
                    <span>{formatDate(job.created_at, 'relative')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
