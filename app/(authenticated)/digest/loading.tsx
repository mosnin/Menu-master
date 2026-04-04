import { CardSkeleton } from '@/components/ui/loading-skeleton';

export default function DigestLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-5 w-80 rounded bg-muted animate-pulse" />
      </div>
      <CardSkeleton lines={5} />
      <CardSkeleton lines={4} />
    </div>
  );
}
