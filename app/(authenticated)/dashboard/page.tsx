import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  FileText,
  Clock,
  ArrowRight,
  Plus,
  Upload,
  ArrowUpRight,
  Inbox,
  HeartPulse,
  Timer,
  Newspaper,
  Shield,
  Eye,
  CircleAlert,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { WelcomeBanner } from '@/components/onboarding/welcome-banner';
import { PilotReadiness } from '@/components/dashboard/pilot-readiness';
import { getHealthSummaryAction, getClosingSoonAction } from '@/app/actions/health-actions';
import { getDigestAction } from '@/app/actions/digest-actions';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  const firstName = session.user.name?.split(' ')[0] || session.user.email?.split('@')[0] || 'there';
  const greeting = getGreeting();

  const [healthResult, closingSoonResult, digestResult] = await Promise.all([
    getHealthSummaryAction(),
    getClosingSoonAction(),
    getDigestAction(),
  ]);

  const healthSummary = healthResult.data;
  const closingSoon = closingSoonResult.data ?? [];
  const hasDigest = !!digestResult.data;

  return (
    <div className="space-y-10">
      {/* Welcome Banner for new users */}
      <WelcomeBanner />

      {/* Hero Section */}
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description="Your portfolio overview for today."
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-xl px-5 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
          <Link href="/transactions/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Link>
        </Button>
        <Button variant="outline" asChild className="rounded-xl px-5 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
          <Link href="/transactions" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/transactions" className="group">
          <StatCard label="Active Transactions" value={12} subtext="3 updated today" icon={FileText} accent="blue" />
        </Link>
        <Link href="/approvals" className="group">
          <StatCard label="Pending Approvals" value={4} subtext="2 awaiting your review" icon={CheckSquare} accent="amber" />
        </Link>
        <Link href="/transactions" className="group">
          <StatCard label="Upcoming Deadlines" value={7} subtext="In the next 14 days" icon={Calendar} accent="orange" />
        </Link>
        <Link href="/transactions" className="group">
          <StatCard label="Issues" value={3} subtext="Missing docs or failed extractions" icon={AlertTriangle} accent="red" />
        </Link>
      </div>

      {/* Pilot Readiness */}
      <PilotReadiness
        orgName="Deal Desk Inc."
        teamMemberCount={1}
        transactionCount={0}
        documentCount={0}
        checklistCount={0}
      />

      {/* Health Score Summary */}
      {healthSummary && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <HeartPulse className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">Portfolio Health</h2>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <StatCard label="Healthy" value={healthSummary.healthy} icon={Shield} accent="green" />
            <StatCard label="Watch" value={healthSummary.watch} icon={Eye} accent="amber" />
            <StatCard label="At Risk" value={healthSummary.at_risk} icon={CircleAlert} accent="orange" />
            <StatCard label="Critical" value={healthSummary.critical} icon={TriangleAlert} accent="red" />
          </div>
        </div>
      )}

      {/* Closing Soon + Digest Link */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Closing Soon */}
        <Card className="rounded-xl">
          <CardHeader className="pb-4">
            <SectionHeader icon={Timer} iconClassName="text-blue-600 dark:text-blue-400" title="Closing Soon" description="Transactions closing in 7 days" />
          </CardHeader>
          <CardContent>
            {closingSoon.length > 0 ? (
              <div className="space-y-2">
                {closingSoon.map((txn) => (
                  <Link
                    key={txn.id}
                    href={`/transactions/${txn.id}/overview`}
                    className="group flex items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:bg-muted/30 hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{txn.name}</p>
                      {txn.property_address && (
                        <p className="text-xs text-muted-foreground truncate">{txn.property_address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <Badge
                        variant={txn.readiness === 'ready' ? 'default' : txn.readiness === 'blocked' ? 'destructive' : 'secondary'}
                        className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                      >
                        {txn.readiness}
                      </Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">{txn.days_until_close}d</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Timer}
                title="No closings this week"
                description="Transactions approaching their closing date will appear here."
                compact
              />
            )}
          </CardContent>
        </Card>

        {/* Today's Digest Link */}
        <Card className="rounded-xl">
          <CardHeader className="pb-4">
            <SectionHeader icon={Newspaper} iconClassName="text-purple-600 dark:text-purple-400" title="Daily Digest" description="Your portfolio summary" linkHref="/digest" />
          </CardHeader>
          <CardContent>
            {hasDigest ? (
              <div className="flex items-center justify-between rounded-lg border p-4 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/50">
                <div>
                  <p className="text-sm font-medium">Today&apos;s digest is ready</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    View your daily portfolio briefing
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild className="rounded-lg">
                  <Link href="/digest" className="flex items-center gap-1.5">
                    <Newspaper className="h-3.5 w-3.5" />
                    Open
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={Newspaper}
                title="No digest yet today"
                description="Your daily digest will be generated based on your configured schedule."
                action={
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <Link href="/settings/digests" className="flex items-center gap-2">
                      Configure Digest
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>
                }
                compact
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content Sections */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Needs Attention */}
        <Card className="rounded-xl">
          <CardHeader className="pb-4">
            <SectionHeader icon={AlertTriangle} iconClassName="text-yellow-600 dark:text-yellow-400" title="Needs Attention" description="Transactions requiring your action" linkHref="/transactions" />
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={CheckSquare}
              title="You are all caught up"
              description="When transactions have missing documents, failed extractions, or overdue items, they will appear here."
              compact
            />
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="rounded-xl">
          <CardHeader className="pb-4">
            <SectionHeader icon={Clock} iconClassName="text-muted-foreground" title="Upcoming Deadlines" description="Due in the next 14 days" linkHref="/transactions" />
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Calendar}
              title="No upcoming deadlines"
              description="As you add checklist items with due dates, upcoming deadlines will be surfaced here."
              compact
            />
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="rounded-xl">
          <CardHeader className="pb-4">
            <SectionHeader icon={CheckSquare} iconClassName="text-muted-foreground" title="Pending Approvals" description="Review and approve actions" linkHref="/approvals" />
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Inbox}
              title="No pending approvals"
              description="When AI drafts emails or extracts data that needs your sign-off, approval requests will appear here."
              compact
            />
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="rounded-xl">
          <CardHeader className="pb-4">
            <SectionHeader icon={FileText} iconClassName="text-muted-foreground" title="Recent Documents" description="Latest uploaded documents" />
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Upload}
              title="No documents yet"
              description="Upload a purchase agreement, disclosure, or amendment. The AI will automatically extract key details."
              action={
                <Button variant="outline" size="sm" className="rounded-xl" asChild>
                  <Link href="/transactions" className="flex items-center gap-2">
                    Go to Transactions
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Button>
              }
              compact
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
