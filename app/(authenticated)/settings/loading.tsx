import { CardSkeleton } from '@/components/ui/loading-skeleton';

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        <div className="h-5 w-64 rounded bg-muted animate-pulse" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton lines={2} />
    </div>
  );
}
