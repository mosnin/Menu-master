import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  accent?: 'blue' | 'amber' | 'orange' | 'red' | 'green' | 'purple' | 'slate';
  href?: string;
  className?: string;
}

const accentConfig: Record<string, { border: string; iconBg: string; iconText: string; valueText?: string }> = {
  blue: { border: 'border-l-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-950/40', iconText: 'text-blue-600 dark:text-blue-400' },
  amber: { border: 'border-l-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-950/40', iconText: 'text-amber-600 dark:text-amber-400' },
  orange: { border: 'border-l-orange-500', iconBg: 'bg-orange-50 dark:bg-orange-950/40', iconText: 'text-orange-600 dark:text-orange-400' },
  red: { border: 'border-l-red-500', iconBg: 'bg-red-50 dark:bg-red-950/40', iconText: 'text-red-600 dark:text-red-400', valueText: 'text-red-600 dark:text-red-400' },
  green: { border: 'border-l-green-500', iconBg: 'bg-green-50 dark:bg-green-950/40', iconText: 'text-green-600 dark:text-green-400' },
  purple: { border: 'border-l-purple-500', iconBg: 'bg-purple-50 dark:bg-purple-950/40', iconText: 'text-purple-600 dark:text-purple-400' },
  slate: { border: 'border-l-slate-400', iconBg: 'bg-muted', iconText: 'text-muted-foreground' },
};

export function StatCard({ label, value, subtext, icon: Icon, accent = 'blue', className }: StatCardProps) {
  const config = accentConfig[accent];
  return (
    <Card className={cn('border-l-4 transition-all duration-200 hover:shadow-md', config.border, className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">{label}</p>
            <p className={cn('text-2xl font-semibold tracking-tight mt-1 tabular-nums', config.valueText)}>{value}</p>
            {subtext && <p className="text-xs text-muted-foreground mt-1 truncate">{subtext}</p>}
          </div>
          {Icon && (
            <div className={cn('rounded-lg p-2 shrink-0', config.iconBg)}>
              <Icon className={cn('h-4 w-4', config.iconText)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
