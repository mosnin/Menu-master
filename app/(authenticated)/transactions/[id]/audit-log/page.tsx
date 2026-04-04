import { Badge } from '@/components/ui/badge';
import { ScrollText, Bot, User } from 'lucide-react';

export default async function AuditLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          Complete history of actions for this transaction.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ScrollText className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No audit entries yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          All actions including document uploads, extractions, approvals, and emails are logged here.
        </p>
      </div>
    </div>
  );
}
