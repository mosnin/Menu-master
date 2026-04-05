'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AUTOMATION_NAV_ITEMS } from '@/lib/ui/automation-nav-items';

export function AutomationNav() {
  const pathname = usePathname();

  return (
    <div className="rounded-xl border bg-background/80 p-1 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {AUTOMATION_NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
