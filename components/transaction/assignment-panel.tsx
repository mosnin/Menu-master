'use client';

import { useState, useEffect } from 'react';
import { getAssignmentsAction } from '@/app/actions/assignment-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, UserCircle, Shield, ClipboardCheck } from 'lucide-react';
import type { TransactionAssignment } from '@/types';

interface AssignmentPanelProps {
  transactionId: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

interface AssignmentWithProfiles extends TransactionAssignment {
  primary_agent?: UserProfile | null;
  coordinator?: UserProfile | null;
  broker_reviewer?: UserProfile | null;
}

const roleConfig = {
  primary_agent: {
    label: 'Primary Agent',
    icon: UserCircle,
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    ring: 'ring-blue-200/40',
  },
  coordinator: {
    label: 'Coordinator',
    icon: ClipboardCheck,
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    ring: 'ring-emerald-200/40',
  },
  broker_reviewer: {
    label: 'Broker Reviewer',
    icon: Shield,
    color: 'text-purple-700',
    bg: 'bg-purple-100',
    ring: 'ring-purple-200/40',
  },
};

function UserAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn(
      'flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 ring-1 ring-border/50 text-xs font-semibold text-slate-700',
      className,
    )}>
      {initials}
    </div>
  );
}

function AssignmentRow({
  roleKey,
  profile,
}: {
  roleKey: keyof typeof roleConfig;
  profile: UserProfile | null | undefined;
}) {
  const config = roleConfig[roleKey];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-4 rounded-xl p-3.5 -mx-1 transition-colors duration-200 hover:bg-muted/30">
      {profile ? (
        <UserAvatar name={profile.full_name ?? profile.email} />
      ) : (
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full ring-1',
          config.bg,
          config.ring,
        )}>
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium tracking-tight truncate">
          {profile ? (profile.full_name ?? profile.email) : 'Unassigned'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{config.label}</p>
      </div>
      {profile ? (
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">
          Active
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium text-muted-foreground">
          Open
        </Badge>
      )}
    </div>
  );
}

export function AssignmentPanel({ transactionId }: AssignmentPanelProps) {
  const [assignment, setAssignment] = useState<AssignmentWithProfiles | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssignmentsAction(transactionId)
      .then((data) => setAssignment(data as AssignmentWithProfiles | null))
      .catch(() => setAssignment(null))
      .finally(() => setLoading(false));
  }, [transactionId]);

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-4 p-7">
          <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
            <Users className="h-4 w-4 text-muted-foreground" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-7 pt-0">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-4 p-7">
        <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
          <Users className="h-4 w-4 text-muted-foreground" />
          Team
        </CardTitle>
      </CardHeader>
      <CardContent className="px-7 pb-7 pt-0">
        <div className="space-y-1">
          <AssignmentRow
            roleKey="primary_agent"
            profile={assignment?.primary_agent}
          />
          <AssignmentRow
            roleKey="coordinator"
            profile={assignment?.coordinator}
          />
          <AssignmentRow
            roleKey="broker_reviewer"
            profile={assignment?.broker_reviewer}
          />
        </div>
        {!assignment && (
          <p className="text-xs text-muted-foreground mt-5 leading-relaxed text-center">
            No team members have been assigned to this transaction yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
