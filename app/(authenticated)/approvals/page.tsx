import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  FileText,
  AlertTriangle,
  ArrowRight,
  Bot,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { supabase } from '@/lib/db/client';
import { ApprovalCard } from '@/components/approval/approval-card';

async function getApprovalData(orgId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const [pendingRes, approvedTodayRes, rejectedTodayRes, allRes] = await Promise.all([
    supabase
      .from('approvals')
      .select('*, transactions(title)')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('approvals')
      .select('id', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('status', 'approved')
      .gte('decided_at', todayStart)
      .lt('decided_at', todayEnd),
    supabase
      .from('approvals')
      .select('id', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('status', 'rejected')
      .gte('decided_at', todayStart)
      .lt('decided_at', todayEnd),
    supabase
      .from('approvals')
      .select('*, transactions(title)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return {
    pending: (pendingRes.data ?? []) as Array<Record<string, unknown>>,
    approvedTodayCount: approvedTodayRes.count ?? 0,
    rejectedTodayCount: rejectedTodayRes.count ?? 0,
    all: (allRes.data ?? []) as Array<Record<string, unknown>>,
  };
}

export default async function ApprovalsQueuePage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  let orgId: string | null = null;
  try {
    const profile = await getCurrentUserProfile();
    if (profile?.memberships?.[0]?.organization_id) {
      orgId = profile.memberships[0].organization_id;
    }
  } catch {
    // If profile fetch fails, show empty state
  }

  const data = orgId ? await getApprovalData(orgId) : null;
  const pending = data?.pending ?? [];
  const approvedToday = data?.approvedTodayCount ?? 0;
  const rejectedToday = data?.rejectedTodayCount ?? 0;
  const all = data?.all ?? [];
  const approved = all.filter((a) => a.status === 'approved');
  const rejected = all.filter((a) => a.status === 'rejected');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve AI-generated actions across all transactions.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-semibold">{pending.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved Today</p>
                <p className="text-2xl font-semibold">{approvedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected Today</p>
                <p className="text-2xl font-semibold">{rejectedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-1">
            Pending
            {pending.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-xs">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium">All caught up</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                No pending approvals right now. When documents are processed or emails are drafted, items will appear here for your review.
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/transactions">
                  <FileText className="h-4 w-4 mr-1" />
                  View Transactions
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((approval) => (
                <ApprovalCard
                  key={approval.id as string}
                  approval={{
                    id: approval.id as string,
                    approval_type: approval.approval_type as string,
                    status: approval.status as string,
                    payload_json: approval.payload_json as Record<string, unknown> | null,
                    decision_notes: approval.decision_notes as string | null,
                    created_at: approval.created_at as string,
                    decided_at: approval.decided_at as string | null,
                    transaction_id: approval.transaction_id as string,
                    requested_by_user_id: approval.requested_by_user_id as string,
                  }}
                  transactionTitle={
                    (approval.transactions as Record<string, unknown>)?.title as string | undefined
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {approved.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No approved items yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Approved items will appear here once you start reviewing pending approvals.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {approved.map((approval) => (
                <ApprovalCard
                  key={approval.id as string}
                  approval={{
                    id: approval.id as string,
                    approval_type: approval.approval_type as string,
                    status: approval.status as string,
                    payload_json: approval.payload_json as Record<string, unknown> | null,
                    decision_notes: approval.decision_notes as string | null,
                    created_at: approval.created_at as string,
                    decided_at: approval.decided_at as string | null,
                    transaction_id: approval.transaction_id as string,
                    requested_by_user_id: approval.requested_by_user_id as string,
                  }}
                  transactionTitle={
                    (approval.transactions as Record<string, unknown>)?.title as string | undefined
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {rejected.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <XCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No rejected items</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Rejected items will appear here. You can review past rejections and their notes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rejected.map((approval) => (
                <ApprovalCard
                  key={approval.id as string}
                  approval={{
                    id: approval.id as string,
                    approval_type: approval.approval_type as string,
                    status: approval.status as string,
                    payload_json: approval.payload_json as Record<string, unknown> | null,
                    decision_notes: approval.decision_notes as string | null,
                    created_at: approval.created_at as string,
                    decided_at: approval.decided_at as string | null,
                    transaction_id: approval.transaction_id as string,
                    requested_by_user_id: approval.requested_by_user_id as string,
                  }}
                  transactionTitle={
                    (approval.transactions as Record<string, unknown>)?.title as string | undefined
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {all.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No approval items yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Upload documents to a transaction to trigger AI processing. Approval items will be created automatically.
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/transactions">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Go to Transactions
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {all.map((approval) => (
                <ApprovalCard
                  key={approval.id as string}
                  approval={{
                    id: approval.id as string,
                    approval_type: approval.approval_type as string,
                    status: approval.status as string,
                    payload_json: approval.payload_json as Record<string, unknown> | null,
                    decision_notes: approval.decision_notes as string | null,
                    created_at: approval.created_at as string,
                    decided_at: approval.decided_at as string | null,
                    transaction_id: approval.transaction_id as string,
                    requested_by_user_id: approval.requested_by_user_id as string,
                  }}
                  transactionTitle={
                    (approval.transactions as Record<string, unknown>)?.title as string | undefined
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
