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
  Upload,
  Stethoscope,
  CopyCheck,
  Award,
  LayoutGrid,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  showBadge?: boolean;
  adminOnly?: boolean;
  /** Match only the exact path for the active state (not children). */
  exact?: boolean;
};

// ─── Nav definitions ──────────────────────────────────────────────────────────

const workNav: NavItem[] = [
  { name: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { name: 'Inbox',        href: '/inbox',         icon: InboxIcon },
  { name: 'Queue',        href: '/queue',         icon: Inbox },
  { name: 'Digest',       href: '/digest',        icon: Newspaper },
  { name: 'Transactions', href: '/transactions',  icon: FileText },
  { name: 'Listings',     href: '/listings',      icon: Home },
  { name: 'Approvals',    href: '/approvals',     icon: CheckSquare, showBadge: true },
];

// coordinator+ — all pages exist under /ops/
const automationNav: NavItem[] = [
  { name: 'Overview',    href: '/ops',                       icon: LayoutGrid, exact: true },
  { name: 'Workflows',   href: '/ops/workflows',             icon: GitBranch },
  { name: 'Runs',        href: '/ops/workflow-runs',         icon: Play },
  { name: 'Governance',  href: '/ops/automation-governance', icon: Shield },
  { name: 'Library',     href: '/ops/automation-library',    icon: Library },
  { name: 'Setup',       href: '/ops/automation-setup',      icon: Cpu },
  { name: 'Success',     href: '/ops/automation-success',    icon: Award },
  { name: 'ROI',         href: '/ops/automation-economics',  icon: DollarSign },
];

// broker_admin only
const brokerNav: NavItem[] = [
  // exact: true so /broker/compliance doesn't also highlight Overview
  { name: 'Overview',    href: '/broker',             icon: Building2,  exact: true },
  { name: 'Forecast',    href: '/broker/forecast',    icon: TrendingUp },
  { name: 'Compliance',  href: '/broker/compliance',  icon: Shield },
  { name: 'Analytics',   href: '/analytics',          icon: BarChart3 },
];

// broker_admin only
const adminNav: NavItem[] = [
  // exact: true so sub-pages don't also highlight Overview
  { name: 'Overview',    href: '/admin',              icon: Wrench,    exact: true },
  { name: 'Imports',     href: '/admin/imports',      icon: Upload },
  { name: 'Duplicates',  href: '/admin/duplicates',   icon: CopyCheck },
  { name: 'Diagnostics', href: '/admin/diagnostics',  icon: Stethoscope },
];

const settingsNav: NavItem[] = [
  // exact: true so /settings/rules doesn't also highlight this
  { name: 'Overview',       href: '/settings',           icon: Settings,       exact: true },
  { name: 'Rules',          href: '/settings/rules',     icon: Scale },
  { name: 'Templates',      href: '/settings/templates', icon: LayoutTemplate },
  { name: 'Digest Prefs',   href: '/settings/digests',   icon: Newspaper },
  { name: 'Policies',       href: '/settings/policies',  icon: Shield, adminOnly: true },
  { name: 'Getting Started', href: '/getting-started',   icon: Rocket },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesRoute(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  item,
  pathname,
  pendingCount,
  onNavigate,
  indent = false,
}: {
  item: NavItem;
  pathname: string;
  pendingCount: number;
  onNavigate?: () => void;
  indent?: boolean;
}) {
  const active = matchesRoute(pathname, item);
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
      <span
        className={cn(
          'flex-1 tracking-[-0.01em]',
          indent && 'text-[12px]',
          indent && !active && 'text-muted-foreground group-hover:text-foreground',
          indent && active && 'text-foreground'
        )}
      >
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

// ─── Shared header / actions ──────────────────────────────────────────────────

function BrandHeader({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-[60px] items-center px-5">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 transition-opacity duration-[150ms] hover:opacity-80"
        onClick={onNavigate}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://framerusercontent.com/images/zYFHiXFMHRJ9Sc04WXXnhSpzOuQ.png?scale-down-to=512"
          alt="Chippi"
          className="h-7 dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://framerusercontent.com/images/X7CPDKEefl9vCbwB8MZZx12I9Xc.png?scale-down-to=512"
          alt="Chippi"
          className="h-7 hidden dark:block"
        />
      </Link>
    </div>
  );
}

function QuickActions({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="px-4 pt-5 pb-6 space-y-2">
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
      <Button
        asChild
        variant="outline"
        className="w-full justify-center gap-2 h-9 text-[13px] font-medium"
        size="sm"
      >
        <Link href="/listings/new" onClick={onNavigate}>
          <Plus className="h-4 w-4" />
          New Listing
        </Link>
      </Button>
    </div>
  );
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar({ userRole }: { userRole?: string }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  const isAdmin = userRole === 'broker_admin';
  const isCoordinatorPlus = userRole === 'coordinator' || userRole === 'broker_admin';

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch('/api/approvals/pending-count');
        if (res.ok) setPendingCount((await res.json()).count ?? 0);
      } catch { /* silent */ }
    }
    poll();
    const t = setInterval(poll, 30_000);
    return () => clearInterval(t);
  }, []);

  const common = { pathname, pendingCount };

  // Auto-open sections based on current route
  const inAutomation = pathname === '/ops' || pathname.startsWith('/ops/');
  const inBroker = pathname.startsWith('/broker') || pathname.startsWith('/analytics');
  const inAdmin = pathname.startsWith('/admin');
  const inSettings = pathname.startsWith('/settings');

  return (
    <div className="flex h-full w-[260px] flex-col bg-[hsl(var(--sidebar))]">
      <BrandHeader />
      <div className="mx-5 h-px bg-[hsl(var(--sidebar-border))]" />

      <div className="flex-1 overflow-y-auto sidebar-scroll pt-0 pb-2 space-y-6">
        <QuickActions />

        {/* Work — always visible */}
        <NavSection label="Work">
          {workNav.map((item) => (
            <NavItem key={item.href} item={item} {...common} />
          ))}
        </NavSection>

        {/* Automation — coordinator+ */}
        {isCoordinatorPlus && (
          <NavSection label="Automation" defaultOpen={inAutomation}>
            {automationNav.map((item) => (
              <NavItem key={item.href} item={item} {...common} indent />
            ))}
          </NavSection>
        )}

        {/* Broker — admin only */}
        {isAdmin && (
          <NavSection label="Broker" defaultOpen={inBroker}>
            {brokerNav.map((item) => (
              <NavItem key={item.href} item={item} {...common} indent />
            ))}
          </NavSection>
        )}

        {/* Admin — admin only, collapsed by default */}
        {isAdmin && (
          <NavSection label="Admin" defaultOpen={inAdmin}>
            {adminNav.map((item) => (
              <NavItem key={item.href} item={item} {...common} indent />
            ))}
          </NavSection>
        )}

        {/* Settings — all roles, collapsed by default */}
        <NavSection label="Settings" defaultOpen={inSettings}>
          {settingsNav
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <NavItem key={item.href} item={item} {...common} indent />
            ))}
        </NavSection>
      </div>

      <div className="mx-5 h-px bg-[hsl(var(--sidebar-border))]" />
      <div className="px-5 py-4">
        <p className="text-[10px] text-muted-foreground/40 tracking-wide font-medium">Chippi v0.1.0</p>
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
  isAdmin,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  pendingCount: number;
  onNavigate: () => void;
  isAdmin?: boolean;
}) {
  const visibleItems = items.filter((item) => !item.adminOnly || isAdmin);
  const hasActive = visibleItems.some((item) => matchesRoute(pathname, item));
  const [open, setOpen] = useState(hasActive);

  // Re-evaluate when pathname changes
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [pathname, hasActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between px-4 py-2.5 rounded-lg text-[12px] font-semibold uppercase tracking-[0.06em]',
          'transition-colors',
          hasActive
            ? 'text-foreground'
            : 'text-muted-foreground/70 hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))]'
        )}
      >
        {label}
        {open
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        }
      </button>
      {open && (
        <div className="space-y-0.5 px-2 pb-1">
          {visibleItems.map((item) => (
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

function MobileSidebar({ onClose, userRole }: { onClose: () => void; userRole?: string }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  const isAdmin = userRole === 'broker_admin';
  const isCoordinatorPlus = userRole === 'coordinator' || userRole === 'broker_admin';

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch('/api/approvals/pending-count');
        if (res.ok) setPendingCount((await res.json()).count ?? 0);
      } catch { /* silent */ }
    }
    poll();
  }, []);

  const common = { pathname, pendingCount, onNavigate: onClose };

  return (
    <div className="flex h-full w-[280px] flex-col bg-[hsl(var(--sidebar))]">
      <BrandHeader onNavigate={onClose} />
      <div className="h-px bg-[hsl(var(--sidebar-border))]" />

      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {/* Quick actions */}
        <div className="pb-3 px-2 space-y-2 border-b border-[hsl(var(--sidebar-border))] mb-2">
          <Button asChild className="w-full justify-center gap-2 h-10 text-[13px] font-medium" size="sm">
            <Link href="/transactions/new" onClick={onClose}>
              <Plus className="h-4 w-4" />
              New Transaction
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-center gap-2 h-10 text-[13px] font-medium" size="sm">
            <Link href="/listings/new" onClick={onClose}>
              <Plus className="h-4 w-4" />
              New Listing
            </Link>
          </Button>
        </div>

        {/* Work — always flat */}
        <div className="pb-3 border-b border-[hsl(var(--sidebar-border))] mb-1">
          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">
            Work
          </p>
          <div className="space-y-0.5">
            {workNav.map((item) => (
              <NavItem key={item.href} item={item} {...common} />
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
            onNavigate={onClose}
          />
        )}

        {/* Broker — collapsible, admin only */}
        {isAdmin && (
          <MobileSectionGroup
            label="Broker"
            items={brokerNav}
            pathname={pathname}
            pendingCount={pendingCount}
            onNavigate={onClose}
          />
        )}

        {/* Admin — collapsible, admin only */}
        {isAdmin && (
          <MobileSectionGroup
            label="Admin"
            items={adminNav}
            pathname={pathname}
            pendingCount={pendingCount}
            onNavigate={onClose}
            isAdmin
          />
        )}

        {/* Settings — collapsible */}
        <MobileSectionGroup
          label="Settings"
          items={settingsNav}
          pathname={pathname}
          pendingCount={pendingCount}
          onNavigate={onClose}
          isAdmin={isAdmin}
        />
      </div>

      <div className="px-5 py-4 border-t border-[hsl(var(--sidebar-border))]">
        <p className="text-[10px] text-muted-foreground/40 tracking-wide font-medium">Chippi v0.1.0</p>
      </div>
    </div>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function Sidebar({ userRole }: { userRole?: string }) {
  return (
    <aside className="border-r border-[hsl(var(--sidebar-border))]">
      <DesktopSidebar userRole={userRole} />
    </aside>
  );
}

export function MobileSidebarSheet({
  open,
  onOpenChange,
  userRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="p-0 w-[280px]">
        <MobileSidebar onClose={() => onOpenChange(false)} userRole={userRole} />
      </SheetContent>
    </Sheet>
  );
}

// Keep backward-compatible export name used by app-shell
export { MobileSidebarSheet as MobileSidebar };
