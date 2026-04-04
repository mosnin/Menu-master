'use client';

import { useEffect, useState, useTransition } from 'react';
import { getMembershipsAction } from '@/app/actions/profile-actions';
import { Building2, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface MembershipWithOrg {
  id: string;
  organization_id: string;
  role: string;
  organizations: {
    id: string;
    name: string;
  } | null;
}

export function OrgSwitcher() {
  const [memberships, setMemberships] = useState<MembershipWithOrg[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Read current cookie
    const cookies = document.cookie.split('; ');
    const orgCookie = cookies.find((c) => c.startsWith('active_org_id='));
    if (orgCookie) {
      setActiveOrgId(orgCookie.split('=')[1]);
    }

    // Fetch memberships
    getMembershipsAction()
      .then((data) => {
        const typed = data as MembershipWithOrg[];
        setMemberships(typed);
        // If no active org cookie set, default to first org
        if (!orgCookie && typed.length > 0 && typed[0].organizations) {
          const defaultOrgId = typed[0].organization_id;
          document.cookie = `active_org_id=${defaultOrgId};path=/;max-age=${60 * 60 * 24 * 365}`;
          setActiveOrgId(defaultOrgId);
        }
      })
      .catch(() => {
        // Silently fail — user may not have memberships yet
      });
  }, []);

  const activeOrg = memberships.find((m) => m.organization_id === activeOrgId);
  const activeOrgName = activeOrg?.organizations?.name ?? 'Select Organization';

  function handleSwitch(orgId: string) {
    startTransition(() => {
      document.cookie = `active_org_id=${orgId};path=/;max-age=${60 * 60 * 24 * 365}`;
      setActiveOrgId(orgId);
      window.location.reload();
    });
  }

  if (memberships.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 rounded-xl"
          disabled={isPending}
        >
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-[160px] truncate text-sm">{activeOrgName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => handleSwitch(m.organization_id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{m.organizations?.name ?? 'Unknown'}</span>
            {m.organization_id === activeOrgId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
