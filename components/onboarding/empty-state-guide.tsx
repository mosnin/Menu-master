import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateGuideProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyStateGuide({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateGuideProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      {/* Illustration placeholder */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl scale-150" />
        <div className="relative rounded-2xl bg-muted/60 p-5">
          <Icon className="h-8 w-8 text-muted-foreground/60" />
        </div>
      </div>

      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      {actionLabel && actionHref && (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-6 rounded-xl px-5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
        >
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
