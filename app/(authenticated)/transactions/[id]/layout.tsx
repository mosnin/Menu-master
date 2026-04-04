import { TransactionTabs } from '@/components/transaction/transaction-tabs';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface TransactionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function TransactionLayout({
  children,
  params,
}: TransactionLayoutProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Transactions
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transaction Details</h1>
          <p className="text-sm text-muted-foreground">ID: {id}</p>
        </div>
        <Badge variant="secondary">Draft</Badge>
      </div>

      <TransactionTabs transactionId={id} />

      <div>{children}</div>
    </div>
  );
}
