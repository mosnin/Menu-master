import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function ApprovalsQueuePage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve AI-generated actions across all transactions.
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-1">
            Pending
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              0
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <CheckSquare className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No pending approvals</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              When documents are processed and emails are drafted, approval items will appear here for your review.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <div className="text-center py-8 text-sm text-muted-foreground">
            No approved items yet.
          </div>
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <div className="text-center py-8 text-sm text-muted-foreground">
            No rejected items.
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <div className="text-center py-8 text-sm text-muted-foreground">
            No approval items yet.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
