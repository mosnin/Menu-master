import { auth0, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import * as membershipRepo from '@/lib/repositories/memberships';
import * as diagnosticsService from '@/lib/services/diagnostics-service';
import * as recomputeService from '@/lib/services/recompute-service';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { formatDate, humanizeStatus } from '@/lib/format';
import { DiagnosticsActions } from '@/components/admin/diagnostics-actions';

const statusIcons: Record<string, typeof CheckCircle> = {
  healthy: CheckCircle,
  degraded: AlertTriangle,
  unhealthy: XCircle,
};

const statusColors: Record<string, string> = {
  healthy: 'text-green-600',
  degraded: 'text-amber-600',
  unhealthy: 'text-red-600',
};

const statusBg: Record<string, string> = {
  healthy: 'bg-green-50',
  degraded: 'bg-amber-50',
  unhealthy: 'bg-red-50',
};

export default async function DiagnosticsPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  let diagnostics: any[] = [];
  let recentJobs: any[] = [];

  try {
    const profile = await getCurrentUserProfile();
    if (profile) {
      const memberships = await membershipRepo.findByUserId(profile.id);
      if (memberships.length > 0) {
        await requireRole(memberships[0].organization_id, ['broker_admin']);
        const orgId = memberships[0].organization_id;
        diagnostics = await diagnosticsService.getLatestDiagnostics(orgId);
        recentJobs = await recomputeService.getRecentRecomputeJobs(orgId, 10);
      }
    }
  } catch {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="System Diagnostics"
        description="Monitor system health, view processing status, and trigger recompute jobs."
        backHref="/admin"
      />

      {/* Diagnostics Actions (client component) */}
      <DiagnosticsActions />

      {/* Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {diagnostics.length === 0 ? (
          <Card className="col-span-full rounded-2xl shadow-sm">
            <CardContent className="py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-[13px] font-medium">No diagnostics data</p>
              <p className="text-[12px] text-muted-foreground/60 mt-1">
                Run diagnostics to check system health.
              </p>
            </CardContent>
          </Card>
        ) : (
          diagnostics.map((d) => {
            const Icon = statusIcons[d.status] ?? Activity;
            return (
              <Card key={d.id} className="rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${statusBg[d.status]}`}>
                      <Icon className={`h-4.5 w-4.5 ${statusColors[d.status]}`} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold">{humanizeStatus(d.check_type)}</p>
                      <Badge variant={d.status === 'healthy' ? 'default' : d.status === 'degraded' ? 'secondary' : 'destructive'} className="text-[10px] px-1.5 py-0 mt-0.5">
                        {humanizeStatus(d.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-[12px] text-muted-foreground/70">
                    {Object.entries(d.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 mt-3">
                    Checked {formatDate(d.checked_at, 'relative')}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Recent Recompute Jobs */}
      {recentJobs.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
            Recent Recompute Jobs
          </h3>
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <Card key={job.id} className="rounded-xl shadow-sm">
                <CardContent className="flex items-center gap-4 py-3 px-5">
                  <Clock className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium">{humanizeStatus(job.job_type)}</p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {formatDate(job.created_at, 'relative')}
                      {job.target_entity_id && ` · ${job.target_entity_id.slice(0, 8)}`}
                    </p>
                  </div>
                  <Badge
                    variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {humanizeStatus(job.status)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
