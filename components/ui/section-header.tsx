import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon?: LucideIcon;
  iconClassName?: string;
  title: string;
  description?: string;
  linkHref?: string;
  linkLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  icon: Icon,
  iconClassName,
  title,
  description,
  linkHref,
  linkLabel = 'View all',
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="rounded-lg bg-muted p-2 shrink-0">
            <Icon className={cn('h-4 w-4 text-muted-foreground', iconClassName)} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight truncate">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {actions}
        {linkHref && (
          <Link
            href={linkHref}
            className="text-sm text-primary hover:underline transition-colors duration-150 flex items-center gap-1 whitespace-nowrap"
          >
            {linkLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
