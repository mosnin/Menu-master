import { ChecklistView } from '@/components/checklist/checklist-view';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function ChecklistPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Checklist</h2>
          <p className="text-sm text-muted-foreground">
            Track required steps for this transaction.
          </p>
        </div>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      <ChecklistView items={[]} />
    </div>
  );
}
