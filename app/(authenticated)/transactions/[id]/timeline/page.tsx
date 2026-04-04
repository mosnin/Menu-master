import { TimelineView } from '@/components/timeline/timeline-view';

export default async function TimelinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Timeline</h2>
        <p className="text-sm text-muted-foreground">
          Key dates and milestones for this transaction.
        </p>
      </div>

      <TimelineView events={[]} />
    </div>
  );
}
