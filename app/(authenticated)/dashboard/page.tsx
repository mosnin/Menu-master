import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import Link from 'next/link';
import { WelcomeBanner } from '@/components/onboarding/welcome-banner';
import { PilotReadiness } from '@/components/dashboard/pilot-readiness';

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

  return (
    <div className="space-y-10">
      {/* Welcome Banner for new users */}
      <WelcomeBanner />

      {/* Hero Section */}
      <div className="pt-2 pb-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          You have <span className="font-medium text-foreground">12 active transactions</span> across your portfolio today.
        </p>
      </div>

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
          <Card className="border-l-4 border-l-blue-500 transition-all duration-200 group-hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Transactions</p>
                  <p className="text-3xl font-semibold tracking-tight mt-2">12</p>
                  <p className="text-xs text-muted-foreground mt-1">3 updated today</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-950/40">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/approvals" className="group">
          <Card className="border-l-4 border-l-amber-500 transition-all duration-200 group-hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                  <p className="text-3xl font-semibold tracking-tight mt-2">4</p>
                  <p className="text-xs text-muted-foreground mt-1">2 awaiting your review</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5 dark:bg-amber-950/40">
                  <CheckSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions" className="group">
          <Card className="border-l-4 border-l-orange-500 transition-all duration-200 group-hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming Deadlines</p>
                  <p className="text-3xl font-semibold tracking-tight mt-2">7</p>
                  <p className="text-xs text-muted-foreground mt-1">In the next 14 days</p>
                </div>
                <div className="rounded-lg bg-orange-50 p-2.5 dark:bg-orange-950/40">
                  <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions" className="group">
          <Card className="border-l-4 border-l-red-500 transition-all duration-200 group-hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Issues</p>
                  <p className="text-3xl font-semibold tracking-tight mt-2 text-red-600 dark:text-red-400">3</p>
                  <p className="text-xs text-muted-foreground mt-1">Missing docs or failed extractions</p>
                </div>
                <div className="rounded-lg bg-red-50 p-2.5 dark:bg-red-950/40">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
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

      {/* Content Sections */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Needs Attention */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-yellow-50 p-2 dark:bg-yellow-950/40">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Needs Attention</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Transactions requiring your action</p>
              </div>
            </div>
            <Link href="/transactions" className="text-sm text-primary hover:underline transition-colors duration-150 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-green-50 p-4 mb-4 dark:bg-green-950/40">
                <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-semibold tracking-tight">You are all caught up</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                When transactions have missing documents, failed extractions, or overdue items, they will appear here.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-muted p-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Upcoming Deadlines</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Due in the next 14 days</p>
              </div>
            </div>
            <Link href="/transactions" className="text-sm text-primary hover:underline transition-colors duration-150 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold tracking-tight">No upcoming deadlines</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                As you add checklist items with due dates, upcoming deadlines will be surfaced here so nothing slips.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-muted p-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Pending Approvals</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Review and approve actions</p>
              </div>
            </div>
            <Link href="/approvals" className="text-sm text-primary hover:underline transition-colors duration-150 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold tracking-tight">No pending approvals</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                When AI drafts emails or extracts data that needs your sign-off, approval requests will appear here.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-muted p-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Recent Documents</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Latest uploaded documents</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold tracking-tight">No documents yet</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                Upload a purchase agreement, disclosure, or amendment. The AI will automatically extract key details.
              </p>
              <Button variant="outline" size="sm" className="mt-5 rounded-xl" asChild>
                <Link href="/transactions" className="flex items-center gap-2">
                  Go to Transactions
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
