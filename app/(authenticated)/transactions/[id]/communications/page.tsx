import { Mail } from 'lucide-react';

export default async function CommunicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Communications</h2>
        <p className="text-sm text-muted-foreground">
          Track outbound emails and messages for this transaction.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mail className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No communications yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Email drafts will be generated from document processing and reminders.
          All emails require approval before sending.
        </p>
      </div>
    </div>
  );
}
