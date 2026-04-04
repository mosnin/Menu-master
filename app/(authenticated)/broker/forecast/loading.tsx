import { TableSkeleton } from '@/components/ui/loading-skeleton';

export default function ForecastLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
      </div>
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
