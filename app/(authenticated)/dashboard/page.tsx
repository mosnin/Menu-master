import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  const firstName = session.user.name?.split(' ')[0] || session.user.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Good morning, {firstName}</h1>
        <p className="text-muted-foreground mt-1">
          Here is what is happening across your transactions today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/transactions/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/transactions" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/transactions" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Transactions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                3 updated today
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/approvals" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-muted-foreground">
                2 awaiting your review
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">
                In the next 14 days
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions" className="group">
          <Card className="transition-shadow group-hover:shadow-md border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">3</div>
              <p className="text-xs text-muted-foreground">
                Missing docs or failed extractions
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs Attention */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Needs Attention
              </CardTitle>
              <CardDescription className="mt-1">Transactions requiring your action</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/transactions" className="flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-green-50 p-3 mb-3">
                <CheckSquare className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm font-medium">You are all caught up</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                When transactions have missing documents, failed extractions, or overdue items, they will appear here for quick action.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming Deadlines
              </CardTitle>
              <CardDescription className="mt-1">Due in the next 14 days</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/transactions" className="flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No upcoming deadlines</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                As you add checklist items with due dates to your transactions, upcoming deadlines will be surfaced here so nothing slips through the cracks.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Pending Approvals
              </CardTitle>
              <CardDescription className="mt-1">Review and approve actions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/approvals" className="flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No pending approvals</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                When AI drafts emails or extracts data that needs your sign-off, approval requests will appear here.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Documents
              </CardTitle>
              <CardDescription className="mt-1">Latest uploaded documents</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No documents yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Upload a purchase agreement, disclosure, or amendment to a transaction. The AI will automatically extract key details.
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
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
