import { TransactionForm } from '@/components/transaction/transaction-form';
import { PageHeader } from '@/components/ui/page-header';

export default function NewTransactionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="New Transaction"
        description="Create a new real estate transaction. You can add documents and details later."
        backHref="/transactions"
        backLabel="Transactions"
      />
      <TransactionForm />
    </div>
  );
}
