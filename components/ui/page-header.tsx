import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, backHref, backLabel, actions, className, children }: PageHeaderProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel || 'Back'}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1.5 text-sm sm:text-base leading-relaxed">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
