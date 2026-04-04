import { auth0 } from '@/lib/auth/session';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  ArrowLeft,
  AlertTriangle,
  CircleAlert,
  Info,
  ShieldAlert,
  User,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import type { ComplianceIssue, ComplianceIssueStatus } from '@/types';
import { ComplianceIssueCard } from '@/components/broker/compliance-issue-card';

async function getComplianceData(orgId: string) {
  const [issuesRes] = await Promise.all([
    supabase
      .from('compliance_issues')
      .select('*, transactions(id, title)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
  ]);

  return {
    issues: (issuesRes.data ?? []) as Array<ComplianceIssue & { transactions: { id: string; title: string } | null }>,
  };
}

export default async function CompliancePage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/dashboard');

  const membership = (profile as any).memberships?.[0];
  if (!membership || !['coordinator', 'broker_admin'].includes(membership.role)) {
    redirect('/dashboard');
  }

  const orgId = membership.organization_id;
  const data = await getComplianceData(orgId);

  const allIssues = data.issues;

  // Summary stats
  const bySeverity = { info: 0, warning: 0, critical: 0 };
  const byCategory = new Map<string, number>();

  for (const issue of allIssues) {
    const sev = issue.severity as keyof typeof bySeverity;
    if (sev in bySeverity) bySeverity[sev]++;
    byCategory.set(issue.category, (byCategory.get(issue.category) ?? 0) + 1);
  }

  // Group by status for tabs
  const byStatus: Record<string, typeof allIssues> = {
    all: allIssues,
    open: allIssues.filter((i) => i.status === 'open'),
    under_review: allIssues.filter((i) => i.status === 'under_review'),
    blocked: allIssues.filter((i) => i.status === 'blocked'),
    resolved: allIssues.filter((i) => i.status === 'resolved'),
    overridden: allIssues.filter((i) => i.status === 'overridden'),
  };

  const severityConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
    info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    critical: { icon: ShieldAlert, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40' },
  };

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="pt-2 pb-2">
        <Link
          href="/broker"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 flex items-center gap-1.5 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Broker Overview
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Compliance Queue</h1>
        <p className="text-muted-foreground mt-2 text-base leading-relaxed">
          Review and manage compliance issues across all transactions.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 transition-all duration-200 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold tracking-tight mt-1">{allIssues.length}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/40">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-400 transition-all duration-200 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Info</p>
                <p className="text-2xl font-semibold tracking-tight mt-1 text-blue-600 dark:text-blue-400">{bySeverity.info}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/40">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 transition-all duration-200 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Warning</p>
                <p className="text-2xl font-semibold tracking-tight mt-1 text-amber-600 dark:text-amber-400">{bySeverity.warning}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/40">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 transition-all duration-200 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Critical</p>
                <p className="text-2xl font-semibold tracking-tight mt-1 text-red-600 dark:text-red-400">{bySeverity.critical}</p>
              </div>
              <div className="rounded-lg bg-red-50 p-2 dark:bg-red-950/40">
                <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      {byCategory.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(byCategory.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => (
              <Badge
                key={cat}
                variant="secondary"
                className="text-xs rounded-lg px-3 py-1"
              >
                {cat.replace(/_/g, ' ')} ({count})
              </Badge>
            ))}
        </div>
      )}

      {/* Filter Tabs + Issue List */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="all">All ({byStatus.all.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({byStatus.open.length})</TabsTrigger>
          <TabsTrigger value="under_review">Under Review ({byStatus.under_review.length})</TabsTrigger>
          <TabsTrigger value="blocked">Blocked ({byStatus.blocked.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({byStatus.resolved.length})</TabsTrigger>
          <TabsTrigger value="overridden">Overridden ({byStatus.overridden.length})</TabsTrigger>
        </TabsList>

        {Object.entries(byStatus).map(([status, issues]) => (
          <TabsContent key={status} value={status}>
            {issues.length > 0 ? (
              <div className="space-y-3">
                {issues.map((issue) => (
                  <ComplianceIssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 mb-5 dark:bg-green-950/40 dark:text-green-400">
                  <Shield className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">
                  No {status === 'all' ? '' : status.replace(/_/g, ' ')} issues
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                  {status === 'all'
                    ? 'No compliance issues have been flagged yet. Issues will appear as policy rules evaluate transactions.'
                    : `No issues with "${status.replace(/_/g, ' ')}" status.`}
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
