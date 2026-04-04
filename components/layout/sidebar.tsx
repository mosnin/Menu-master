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
  Inbox,
  Scale,
  LayoutTemplate,
  BarChart3,
  Newspaper,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useEffect, useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Queue', href: '/queue', icon: Inbox },
  { name: 'Digest', href: '/digest', icon: Newspaper },
  { name: 'Transactions', href: '/transactions', icon: FileText },
  { name: 'Approvals', href: '/approvals', icon: CheckSquare, showBadge: true },
];

const brokerNavigation = [
  { name: 'Broker Overview', href: '/broker', icon: Building2 },
  { name: 'Forecast', href: '/broker/forecast', icon: TrendingUp, indent: true },
];

const secondaryNavigation = [
  { name: 'Analytics', href: '/analytics', icon: BarChart3, adminOnly: true },
  { name: 'Compliance', href: '/broker', icon: Shield, adminOnly: true },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Rules', href: '/settings/rules', icon: Scale, indent: true },
  { name: 'Templates', href: '/settings/templates', icon: LayoutTemplate, indent: true },
  { name: 'Digest Settings', href: '/settings/digests', icon: Newspaper, indent: true },
  { name: 'Policies', href: '/settings/policies', icon: Shield, indent: true, adminOnly: true },
];

function SidebarContent({ onNavigate, userRole }: { onNavigate?: () => void; userRole?: string }) {
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

  function renderNavItem(item: typeof navigation[number] & { showBadge?: boolean; indent?: boolean; adminOnly?: boolean; coordinatorPlus?: boolean }) {
    if (item.adminOnly && userRole !== 'broker_admin') return null;
    if (item.coordinatorPlus && userRole !== 'coordinator' && userRole !== 'broker_admin') return null;
    const isActive = item.indent
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] font-medium',
          'transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]',
          item.indent && 'pl-10 py-2',
          isActive
            ? 'bg-primary/[0.07] text-foreground'
            : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-foreground'
        )}
      >
        {/* Active indicator bar */}
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary"
            style={{ transition: 'height var(--transition-fast)' }}
          />
        )}
        <item.icon
          className={cn(
            'shrink-0 transition-colors duration-[150ms]',
            item.indent ? 'h-[15px] w-[15px]' : 'h-[18px] w-[18px]',
            isActive ? 'text-foreground' : 'text-muted-foreground/70 group-hover:text-foreground'
          )}
        />
        <span className={cn('flex-1 tracking-[-0.01em]', item.indent && 'text-[12px]')}>{item.name}</span>
        {item.showBadge && pendingCount > 0 && (
          <Badge
            variant="destructive"
            className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-[10px] font-semibold"
          >
            {pendingCount}
          </Badge>
        )}
      </Link>
    );
  }

  return (
    <div className="flex h-full w-[260px] flex-col bg-[hsl(var(--sidebar))]">
      {/* Organization switcher */}
      <div className="flex h-[60px] items-center px-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 transition-opacity duration-[150ms] hover:opacity-80"
          onClick={onNavigate}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground shadow-[var(--shadow-soft)]">
            <FileText className="h-4 w-4 text-background" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
              Deal Desk
            </span>
            <span className="text-[10px] font-normal text-muted-foreground/70 leading-tight flex items-center gap-1 mt-0.5">
              <Building2 className="h-2.5 w-2.5" />
              Realty Partners Group
            </span>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-[hsl(var(--sidebar-border))]" />

      <div className="flex-1 overflow-y-auto sidebar-scroll pt-6 pb-2">
        {/* Primary action */}
        <div className="px-4 mb-7">
          <Button
            asChild
            className="w-full justify-center gap-2 h-9 shadow-[var(--shadow-soft)] text-[13px] font-medium"
            size="sm"
          >
            <Link href="/transactions/new" onClick={onNavigate}>
              <Plus className="h-4 w-4" />
              New Transaction
            </Link>
          </Button>
        </div>

        {/* Main section label */}
        <div className="px-5 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">
            Menu
          </span>
        </div>

        {/* Primary nav items */}
        <nav className="space-y-0.5 px-3">
          {navigation.map(renderNavItem)}
        </nav>

        {/* Broker section */}
        {userRole === 'broker_admin' && (
          <>
            <div className="mt-8 mx-5 h-px bg-[hsl(var(--sidebar-border))]" />

            <div className="mt-5 px-5 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">
                Broker
              </span>
            </div>

            <nav className="space-y-0.5 px-3">
              {brokerNavigation.map(renderNavItem)}
            </nav>
          </>
        )}

        {/* Secondary section */}
        <div className="mt-8 mx-5 h-px bg-[hsl(var(--sidebar-border))]" />

        <div className="mt-5 px-5 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">
            Workspace
          </span>
        </div>

        <nav className="space-y-0.5 px-3">
          {secondaryNavigation.map(renderNavItem)}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="mx-5 h-px bg-[hsl(var(--sidebar-border))]" />
      <div className="px-5 py-4">
        <p className="text-[10px] text-muted-foreground/40 tracking-wide font-medium">
          Deal Desk v0.1.0
        </p>
      </div>
    </div>
  );
}

export function Sidebar({ userRole }: { userRole?: string }) {
  return (
    <aside className="border-r border-[hsl(var(--sidebar-border))]">
      <SidebarContent userRole={userRole} />
    </aside>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
}

export function MobileSidebar({ open, onOpenChange, userRole }: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="p-0 w-[260px]">
        <SidebarContent onNavigate={() => onOpenChange(false)} userRole={userRole} />
      </SheetContent>
    </Sheet>
  );
}
