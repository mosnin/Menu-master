'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Settings,
  Plus,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: FileText },
  { name: 'Approvals', href: '/approvals', icon: CheckSquare, showBadge: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const res = await fetch('/api/approvals/pending-count');
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.count ?? 0);
        }
      } catch {
        // Silently fail - badge just won't show
      }
    }
    fetchPendingCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm leading-tight">Deal Desk</span>
            <span className="text-[10px] font-normal text-muted-foreground leading-tight flex items-center gap-1">
              <Building2 className="h-2.5 w-2.5" />
              Realty Partners Group
            </span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-3 mb-4">
          <Button asChild className="w-full justify-start gap-2" size="sm">
            <Link href="/transactions/new">
              <Plus className="h-4 w-4" />
              New Transaction
            </Link>
          </Button>
        </div>

        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                )}
              >
                <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                <span className="flex-1">{item.name}</span>
                {item.showBadge && pendingCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-xs"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">Deal Desk v0.1.0</p>
      </div>
    </div>
  );
}
