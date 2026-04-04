'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Lock,
  Users,
  Clock,
  CheckCircle,
  MessageSquare,
  ClipboardList,
} from 'lucide-react';

interface TransactionTabsProps {
  transactionId: string;
}

const tabs = [
  { name: 'Overview', segment: 'overview', icon: LayoutDashboard },
  { name: 'Documents', segment: 'documents', icon: FileText },
  { name: 'Checklist', segment: 'checklist', icon: CheckSquare },
  { name: 'Closing', segment: 'closing', icon: Lock },
  { name: 'Collaborators', segment: 'collaborators', icon: Users },
  { name: 'Timeline', segment: 'timeline', icon: Clock },
  { name: 'Approvals', segment: 'approvals', icon: CheckCircle },
  { name: 'Communications', segment: 'communications', icon: MessageSquare },
  { name: 'Audit Log', segment: 'audit-log', icon: ClipboardList },
];

export function TransactionTabs({ transactionId }: TransactionTabsProps) {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b -mx-4 md:-mx-6 lg:-mx-8 xl:-mx-10 px-4 md:px-6 lg:px-8 xl:px-10">
      <nav
        className="-mb-px flex gap-1 overflow-x-auto scrollbar-none py-1"
        role="tablist"
        aria-label="Transaction sections"
      >
        {tabs.map((tab) => {
          const href = `/transactions/${transactionId}/${tab.segment}`;
          const isActive = pathname === href || pathname?.startsWith(href + '/');
          const Icon = tab.icon;
          return (
            <Link
              key={tab.segment}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-all duration-150',
                'hover:bg-muted/60',
                isActive
                  ? 'bg-primary/[0.08] font-medium text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-foreground' : 'text-muted-foreground/70')} />
              <span className="hidden sm:inline">{tab.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
