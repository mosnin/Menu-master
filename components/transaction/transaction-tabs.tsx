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
  { name: 'Timeline', segment: 'timeline' },
  { name: 'Approvals', segment: 'approvals' },
  { name: 'Communications', segment: 'communications' },
  { name: 'Audit Log', segment: 'audit-log' },
];

export function TransactionTabs({ transactionId }: TransactionTabsProps) {
  const pathname = usePathname();

  return (
    <div className="border-b">
      <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const href = `/transactions/${transactionId}/${tab.segment}`;
          const isActive = pathname === href;
          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                'whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
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
