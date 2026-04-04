import { TransactionTabs } from '@/components/transaction/transaction-tabs';
import * as transactionRepo from '@/lib/repositories/transactions';

interface TransactionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function TransactionLayout({ children, params }: TransactionLayoutProps) {
  const { id } = await params;

  let title = 'Transaction';
  try {
    const transaction = await transactionRepo.findById(id);
    if (transaction?.title) title = transaction.title;
  } catch {
    // Fall through with default title
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      <TransactionTabs transactionId={id} />
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
