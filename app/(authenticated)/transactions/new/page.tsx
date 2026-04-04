import { TransactionForm } from '@/components/transaction/transaction-form';

export default function NewTransactionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Transaction</h1>
        <p className="text-muted-foreground">
          Create a new real estate transaction. You can add documents and details later.
        </p>
      </div>
      <TransactionForm />
    </div>
  );
}
