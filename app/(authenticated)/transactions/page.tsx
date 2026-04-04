import Link from 'next/link';
import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText } from 'lucide-react';

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  active: 'default',
  pending_closing: 'warning',
  closed: 'success',
  cancelled: 'destructive',
};

export default async function TransactionsPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-muted-foreground">Manage your real estate transactions</p>
        </div>
        <Button asChild>
          <Link href="/transactions/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Link>
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No transactions yet</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">
          Create your first transaction to start managing documents, checklists, and deadlines.
        </p>
        <Button asChild>
          <Link href="/transactions/new">Create Transaction</Link>
        </Button>
      </div>
    </div>
  );
}
