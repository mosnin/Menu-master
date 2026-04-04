'use client';

import { usePathname } from 'next/navigation';
import { LogOut, User, ChevronRight } from 'lucide-react';
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
  new: 'New Transaction',
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
        {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
        {isLast ? (
          <span className="text-sm font-medium text-foreground">{displayLabel}</span>
        ) : (
          <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {displayLabel}
          </Link>
        )}
      </span>
    );
  });

  return <nav className="flex items-center gap-1.5">{crumbs}</nav>;
}

export function Header({ userEmail, userName, userRole }: HeaderProps) {
  const roleInfo = userRole ? roleLabelMap[userRole] : null;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <Breadcrumbs />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm">{userName || userEmail || 'User'}</span>
            {roleInfo && (
              <Badge variant={roleInfo.variant} className="text-[10px] px-1.5 py-0">
                {roleInfo.label}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              {userName && <p className="text-sm font-medium">{userName}</p>}
              {userEmail && <p className="text-xs text-muted-foreground">{userEmail}</p>}
              {roleInfo && (
                <Badge variant={roleInfo.variant} className="text-[10px] w-fit mt-1">
                  {roleInfo.label}
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/auth/logout" className="flex items-center gap-2 cursor-pointer">
              <LogOut className="h-4 w-4" />
              Sign out
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
