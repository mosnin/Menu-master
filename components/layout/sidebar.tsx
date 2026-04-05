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
  InboxIcon,
  Wrench,
  Home,
  GitBranch,
  Play,
  ChevronDown,
  ChevronRight,
  Library,
  Cpu,
  DollarSign,
  Users,
  Upload,
  Stethoscope,
  CopyCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useEffect, useState } from 'react';

// ─── Nav definitions ──────────────────────────────────────────────────────────

const workNav = [
  { name: 'Dashboard',     href: '/dashboard',     icon: LayoutDashboard },
  { name: 'Inbox',         href: '/inbox',          icon: InboxIcon },
  { name: 'Queue',         href: '/queue',          icon: Inbox },
  { name: 'Transactions',  href: '/transactions',   icon: FileText },
  { name: 'Listings',      href: '/listings',       icon: Home },
  { name: 'Approvals',     href: '/approvals',      icon: CheckSquare, showBadge: true },
];

const automationNav = [
  { name: 'Workflows',     href: '/ops/workflows',              icon: GitBranch },
  { name: 'Runs',          href: '/ops/workflow-runs',          icon: Play },
  { name: 'Governance',    href: '/ops/automation-governance',  icon: Shield },
  { name: 'Library',       href: '/ops/automation-library',     icon: Library },
  { name: 'Setup',         href: '/ops/automation-setup',       icon: Cpu },
  { name: 'ROI',           href: '/ops/automation-economics',   icon: DollarSign },
];

const brokerNav = [
  { name: 'Overview',      href: '/broker',            icon: Building2 },
  { name: 'Forecast',      href: '/broker/forecast',   icon: TrendingUp },
  { name: 'Compliance',    href: '/broker/compliance', icon: Shield },
  { name: 'Analytics',     href: '/analytics',         icon: BarChart3 },
];

const adminNav = [
  { name: 'Imports',       href: '/admin/imports',     icon: Upload },
  { name: 'Duplicates',    href: '/admin/duplicates',  icon: CopyCheck },
  { name: 'Diagnostics',   href: '/admin/diagnostics', icon: Stethoscope },
];

const settingsNav = [
  { name: 'Settings',        href: '/settings',          icon: Settings,        adminOnly: false },
  { name: 'Rules',           href: '/settings/rules',    icon: Scale,           adminOnly: false },
  { name: 'Templates',       href: '/settings/templates', icon: LayoutTemplate, adminOnly: false },
  { name: 'Digest',          href: '/settings/digests',  icon: Newspaper,       adminOnly: false },
  { name: 'Policies',        href: '/settings/policies', icon: Shield,          adminOnly: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

// ─── Sub-item row ─────────────────────────────────────────────────────────────

function NavItem({
  item,
  pathname,
  pendingCount,
  onNavigate,
  indent = false,
}: {
  item: { name: string; href: string; icon: React.ElementType; showBadge?: boolean; adminOnly?: boolean };
  pathname: string;
  pendingCount: number;
  onNavigate?: () => void;
  indent?: boolean;
}) {
  const active = indent ? pathname === item.href : isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-[9px] text-[13px] font-medium',
        'transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]',
        indent && 'pl-9 py-2',
        active
          ? 'bg-primary/[0.07] text-foreground'
          : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-foreground'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary" />
      )}
      <Icon
        className={cn(
          'shrink-0 transition-colors duration-[150ms]',
          indent ? 'h-[14px] w-[14px]' : 'h-[17px] w-[17px]',
          active ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground'
        )}
      />
      <span className={cn('flex-1 tracking-[-0.01em]', indent && 'text-[12px] text-muted-foreground group-hover:text-foreground', active && indent && 'text-foreground')}>
        {item.name}
      </span>
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

// ─── Collapsible section ──────────────────────────────────────────────────────

function NavSection({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 mb-1.5 group"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors">
          {label}
        </span>
        {open
          ? <ChevronDown className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
          : <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
        }
      </button>
      {open && <nav className="space-y-0.5 px-3">{children}</nav>}
    </div>
  );
}

// ─── Main sidebar content ─────────────────────────────────────────────────────

function SidebarContent({ onNavigate, userRole }: { onNavigate?: () => void; userRole?: string }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  const isAdmin = userRole === 'broker_admin';
  const isCoordinatorPlus = userRole === 'coordinator' || userRole === 'broker_admin';

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const res = await fetch('/api/approvals/pending-count');
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.count ?? 0);
        }
      } catch { /* badge just won't show */ }
    }
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItemProps = { pathname, pendingCount, onNavigate };

  return (
    <div className="flex h-full w-[260px] flex-col bg-[hsl(var(--sidebar))]">
      {/* Logo / brand */}
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

      <div className="mx-5 h-px bg-[hsl(var(--sidebar-border))]" />

      <div className="flex-1 overflow-y-auto sidebar-scroll pt-5 pb-2 space-y-6">
        {/* Quick actions */}
        <div className="px-4 space-y-2">
          <Button asChild className="w-full justify-center gap-2 h-9 shadow-[var(--shadow-soft)] text-[13px] font-medium" size="sm">
            <Link href="/transactions/new" onClick={onNavigate}>
              <Plus className="h-4 w-4" />
              New Transaction
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-center gap-2 h-9 text-[13px] font-medium" size="sm">
            <Link href="/listings/new" onClick={onNavigate}>
              <Plus className="h-4 w-4" />
              New Listing
            </Link>
          </Button>
        </div>

        {/* Work */}
        <NavSection label="Work">
          {workNav.map((item) => (
            <NavItem key={item.href} item={item} {...navItemProps} />
          ))}
        </NavSection>

        {/* Automation — coordinator+ */}
        {isCoordinatorPlus && (
          <NavSection label="Automation">
            {automationNav.map((item) => (
              <NavItem key={item.href} item={item} {...navItemProps} indent />
            ))}
          </NavSection>
        )}

        {/* Broker — admin only */}
        {isAdmin && (
          <NavSection label="Broker">
            {brokerNav.map((item) => (
              <NavItem key={item.href} item={item} {...navItemProps} indent />
            ))}
          </NavSection>
        )}

        {/* Admin — admin only */}
        {isAdmin && (
          <NavSection label="Admin" defaultOpen={false}>
            {adminNav.map((item) => (
              <NavItem key={item.href} item={item} {...navItemProps} indent />
            ))}
          </NavSection>
        )}

        {/* Settings */}
        <NavSection label="Settings" defaultOpen={false}>
          {settingsNav
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <NavItem key={item.href} item={item} {...navItemProps} indent />
            ))}
        </NavSection>
      </div>

      <div className="mx-5 h-px bg-[hsl(var(--sidebar-border))]" />
      <div className="px-5 py-4">
        <p className="text-[10px] text-muted-foreground/40 tracking-wide font-medium">Deal Desk v0.1.0</p>
      </div>
    </div>
  );
}

// ─── Mobile nav ───────────────────────────────────────────────────────────────

function MobileSectionGroup({
  label,
  items,
  pathname,
  pendingCount,
  onNavigate,
}: {
  label: string;
  items: { name: string; href: string; icon: React.ElementType; showBadge?: boolean }[];
  pathname: string;
  pendingCount: number;
  onNavigate: () => void;
}) {
  const hasActive = items.some((item) => isActive(pathname, item.href));
  const [open, setOpen] = useState(hasActive);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3 text-[13px] font-semibold rounded-lg',
          'text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))] transition-colors',
          hasActive && 'text-foreground'
        )}
      >
        <span className="uppercase tracking-[0.06em] text-[11px]">{label}</span>
        {open
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        }
      </button>
      {open && (
        <div className="space-y-0.5 px-2 pb-2">
          {items.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              pathname={pathname}
              pendingCount={pendingCount}
              onNavigate={onNavigate}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileSidebarContent({ onNavigate, userRole }: { onNavigate: () => void; userRole?: string }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  const isAdmin = userRole === 'broker_admin';
  const isCoordinatorPlus = userRole === 'coordinator' || userRole === 'broker_admin';

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const res = await fetch('/api/approvals/pending-count');
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.count ?? 0);
        }
      } catch { /* silent */ }
    }
    fetchPendingCount();
  }, []);

  return (
    <div className="flex h-full w-[280px] flex-col bg-[hsl(var(--sidebar))]">
      {/* Header */}
      <div className="flex h-[60px] items-center px-5 border-b border-[hsl(var(--sidebar-border))]">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
            <FileText className="h-4 w-4 text-background" />
          </div>
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">Deal Desk</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {/* Quick actions */}
        <div className="px-2 pb-3 space-y-2 border-b border-[hsl(var(--sidebar-border))] mb-3">
          <Button asChild className="w-full justify-center gap-2 h-10 text-[13px] font-medium" size="sm">
            <Link href="/transactions/new" onClick={onNavigate}>
              <Plus className="h-4 w-4" />
              New Transaction
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-center gap-2 h-10 text-[13px] font-medium" size="sm">
            <Link href="/listings/new" onClick={onNavigate}>
              <Plus className="h-4 w-4" />
              New Listing
            </Link>
          </Button>
        </div>

        {/* Work — always flat and visible */}
        <div className="px-2 pb-2 border-b border-[hsl(var(--sidebar-border))] mb-1">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">Work</p>
          <div className="space-y-0.5">
            {workNav.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                pathname={pathname}
                pendingCount={pendingCount}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        {/* Automation — collapsible, coordinator+ */}
        {isCoordinatorPlus && (
          <MobileSectionGroup
            label="Automation"
            items={automationNav}
            pathname={pathname}
            pendingCount={pendingCount}
            onNavigate={onNavigate}
          />
        )}

        {/* Broker — collapsible, admin only */}
        {isAdmin && (
          <MobileSectionGroup
            label="Broker"
            items={brokerNav}
            pathname={pathname}
            pendingCount={pendingCount}
            onNavigate={onNavigate}
          />
        )}

        {/* Admin — collapsible, admin only */}
        {isAdmin && (
          <MobileSectionGroup
            label="Admin"
            items={adminNav}
            pathname={pathname}
            pendingCount={pendingCount}
            onNavigate={onNavigate}
          />
        )}

        {/* Settings — collapsible */}
        <MobileSectionGroup
          label="Settings"
          items={settingsNav.filter((item) => !item.adminOnly || isAdmin)}
          pathname={pathname}
          pendingCount={pendingCount}
          onNavigate={onNavigate}
        />
      </div>

      <div className="px-5 py-4 border-t border-[hsl(var(--sidebar-border))]">
        <p className="text-[10px] text-muted-foreground/40 tracking-wide font-medium">Deal Desk v0.1.0</p>
      </div>
    </div>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

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
      <SheetContent side="left" className="p-0 w-[280px]">
        <MobileSidebarContent onNavigate={() => onOpenChange(false)} userRole={userRole} />
      </SheetContent>
    </Sheet>
  );
}
