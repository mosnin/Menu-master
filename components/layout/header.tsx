'use client';

import { usePathname } from 'next/navigation';
import { LogOut, User, ChevronRight, Menu } from 'lucide-react';
import { FeedbackForm } from '@/components/feedback/feedback-form';
import { SearchCommand } from '@/components/search/search-command';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface HeaderProps {
  userEmail?: string;
  userName?: string;
  userRole?: string;
  onMobileMenuToggle?: () => void;
}

const roleLabelMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  broker_admin: { label: 'Admin', variant: 'default' },
  coordinator: { label: 'Coordinator', variant: 'secondary' },
  agent: { label: 'Agent', variant: 'outline' },
};

const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  approvals: 'Approvals',
  settings: 'Settings',
  new: 'New',
  queue: 'Work Queue',
  digest: 'Digest',
  analytics: 'Analytics',
  broker: 'Broker',
  forecast: 'Forecast',
  overview: 'Overview',
  documents: 'Documents',
  checklist: 'Checklist',
  closing: 'Closing',
  collaborators: 'Collaborators',
  timeline: 'Timeline',
  communications: 'Communications',
  'audit-log': 'Audit Log',
  rules: 'Rules',
  templates: 'Templates',
  digests: 'Digest Settings',
  policies: 'Policies',
  requests: 'Requests',
  'getting-started': 'Getting Started',
  inbox: 'Inbox',
  notifications: 'Notifications',
  compliance: 'Compliance',
  admin: 'Admin',
  imports: 'Imports',
  duplicates: 'Duplicates',
  diagnostics: 'Diagnostics',
  listings: 'Listings',
  offers: 'Offers',
  seller: 'Seller Portal',
  'seller-portal': 'Seller Portal',
  ops: 'Operations',
  workflows: 'Workflows',
  'workflow-runs': 'Workflow Runs',
  'automation-governance': 'Governance',
  'automation-library': 'Library',
  'automation-setup': 'Setup',
  'automation-success': 'Success',
  'automation-economics': 'ROI',
  versions: 'Versions',
  edit: 'Edit',
  onboarding: 'Onboarding',
};

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = breadcrumbLabels[segment] ?? segment;
    const isLast = index === segments.length - 1;
    // Skip UUID-looking segments in display, show as "Details"
    const isUuid = /^[0-9a-f]{8}-/.test(segment);
    const displayLabel = isUuid ? 'Details' : label;

    return (
      <span key={href} className="flex items-center gap-1.5">
        {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/30" />}
        {isLast ? (
          <span className="text-[13px] font-semibold text-foreground tracking-[-0.01em]">
            {displayLabel}
          </span>
        ) : (
          <Link
            href={href}
            className="text-[13px] text-muted-foreground/70 hover:text-foreground transition-colors duration-[150ms]"
          >
            {displayLabel}
          </Link>
        )}
      </span>
    );
  });

  return <nav className="flex items-center gap-1">{crumbs}</nav>;
}

export function Header({ userEmail, userName, userRole, onMobileMenuToggle }: HeaderProps) {
  const roleInfo = userRole ? roleLabelMap[userRole] : null;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/30 bg-background/80 backdrop-blur-sm px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={onMobileMenuToggle}
          aria-label="Open navigation menu"
        >
          <Menu className="h-[18px] w-[18px]" />
        </Button>

        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-1.5">
        <SearchCommand />
        <NotificationBell />
        <FeedbackForm />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2.5 h-9 px-2 -mr-1 hover:bg-accent/60 transition-colors duration-[150ms]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground/70 ring-1 ring-border/50">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="text-[13px] font-medium text-foreground/80 hidden sm:inline">
              {userName || userEmail || 'User'}
            </span>
            {roleInfo && (
              <Badge variant={roleInfo.variant} className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                {roleInfo.label}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-[var(--shadow-overlay)]">
          <DropdownMenuLabel className="px-3 py-3">
            <div className="flex flex-col space-y-1.5">
              {userName && <p className="text-[13px] font-semibold tracking-[-0.01em]">{userName}</p>}
              {userEmail && <p className="text-xs text-muted-foreground/70">{userEmail}</p>}
              {roleInfo && (
                <Badge variant={roleInfo.variant} className="text-[10px] w-fit mt-1">
                  {roleInfo.label}
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-border/40" />
          <DropdownMenuItem asChild className="px-3 py-2.5 rounded-md cursor-pointer transition-colors duration-[150ms]">
            <a href="/auth/logout" className="flex items-center gap-2.5">
              <LogOut className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-[13px]">Sign out</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
