import { CheckSquare } from 'lucide-react';

export default async function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Approvals</h2>
        <p className="text-sm text-muted-foreground">
          Review and approve AI-generated actions for this transaction.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckSquare className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No approval items yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Approvals will appear when documents are processed and emails are drafted.
        </p>
      </div>
    </div>
  );
}
