'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface TransactionTabsProps {
  transactionId: string;
}

const tabs = [
  { name: 'Overview', segment: 'overview' },
  { name: 'Documents', segment: 'documents' },
  { name: 'Checklist', segment: 'checklist' },
  { name: 'Closing', segment: 'closing' },
  { name: 'Collaborators', segment: 'collaborators' },
  { name: 'Timeline', segment: 'timeline' },
  { name: 'Approvals', segment: 'approvals' },
  { name: 'Communications', segment: 'communications' },
  { name: 'Audit Log', segment: 'audit-log' },
];

export function TransactionTabs({ transactionId }: TransactionTabsProps) {
  const pathname = usePathname();

  return (
    <div className="border-b">
      <nav
        className="-mb-px flex gap-1 overflow-x-auto scroll-smooth snap-x snap-mandatory"
        aria-label="Tabs"
      >
        {tabs.map((tab) => {
          const href = `/transactions/${transactionId}/${tab.segment}`;
          const isActive = pathname === href;
          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                'snap-start whitespace-nowrap rounded-lg px-4 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
