import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { getCollaboratorsAction, getInvitesAction } from '@/app/actions/collaborator-actions';
import { cn } from '@/lib/utils';
import { InviteCollaboratorForm } from './invite-form';
import { CollaboratorActions } from './collaborator-actions-client';

interface CollaboratorsPageProps {
  params: Promise<{ id: string }>;
}

const roleBadgeConfig: Record<string, string> = {
  lender: 'bg-blue-100 text-blue-800',
  title_agent: 'bg-purple-100 text-purple-800',
  escrow_officer: 'bg-indigo-100 text-indigo-800',
  attorney: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-800',
};

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  accepted: { label: 'Active', className: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800', icon: Clock },
};

export default async function CollaboratorsPage({ params }: CollaboratorsPageProps) {
  const { id: transactionId } = await params;

  const [collaboratorsResult, invitesResult] = await Promise.all([
    getCollaboratorsAction(transactionId),
    getInvitesAction(transactionId),
  ]);

  const collaborators: Array<Record<string, unknown>> =
    (collaboratorsResult.data as unknown as Array<Record<string, unknown>>) ?? [];
  const invites: Array<Record<string, unknown>> =
    (invitesResult.data as unknown as Array<Record<string, unknown>>) ?? [];

  const activeCollaborators = collaborators.filter(
    (c) => c.status === 'accepted' || c.status === 'active',
  );
  const pendingInvites = invites.filter(
    (i) => i.status === 'pending',
  );

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="pt-2 pb-2">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          Collaborators
        </h2>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          Manage external parties with access to this transaction.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Invite Form - Sidebar */}
        <div className="lg:col-span-1 order-last lg:order-first">
          <Card className="rounded-2xl shadow-sm border-l-4 border-l-blue-400 border-blue-200/50">
            <CardHeader className="pb-3 p-7">
              <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
                <UserPlus className="h-4 w-4 text-blue-600" />
                Invite Collaborator
              </CardTitle>
              <CardDescription className="mt-1.5">
                Send an invitation to an external party
              </CardDescription>
            </CardHeader>
            <CardContent className="px-7 pb-7 pt-0">
              <InviteCollaboratorForm transactionId={transactionId} />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-10">
          {/* Active Collaborators */}
          <section>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-4 px-1">
              Active Collaborators
            </p>
            {activeCollaborators.length === 0 ? (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-7">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/40 mb-5">
                      <ShieldCheck className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      No active collaborators
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                      Invite lenders, title agents, attorneys, and other parties to collaborate on this transaction.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeCollaborators.map((collab) => {
                  const role = (collab.role as string) ?? 'other';
                  const roleBadge = roleBadgeConfig[role] ?? roleBadgeConfig.other;
                  const status = statusConfig[(collab.status as string) ?? 'accepted'] ?? statusConfig.accepted;
                  const StatusIcon = status.icon;
                  const permissions = (collab.permissions as string[]) ?? [];

                  return (
                    <Card key={collab.id as string} className="rounded-2xl shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 shrink-0">
                              <span className="text-sm font-semibold text-muted-foreground">
                                {((collab.full_name as string) ?? (collab.fullName as string) ?? (collab.email as string) ?? '?')
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {(collab.full_name as string) ?? (collab.fullName as string) ?? 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                                <Mail className="h-3 w-3 shrink-0" />
                                {(collab.email as string) ?? ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <Badge className={cn('text-[10px] font-medium capitalize', roleBadge)}>
                              {role.replace(/_/g, ' ')}
                            </Badge>
                            <Badge className={cn('text-[10px] font-medium', status.className)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                            <CollaboratorActions
                              id={collab.id as string}
                              type="collaborator"
                            />
                          </div>
                        </div>
                        {permissions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 ml-14">
                            {permissions.map((perm) => (
                              <Badge key={perm} variant="outline" className="text-[10px]">
                                {perm.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pending Invites */}
          <section>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-4 px-1">
              Pending Invites
            </p>
            {pendingInvites.length === 0 ? (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-7">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 mb-4">
                      <Mail className="h-6 w-6 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-semibold tracking-tight">
                      No pending invites
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                      Invitations you send will appear here until they are accepted.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingInvites.map((invite) => {
                  const role = (invite.role as string) ?? 'other';
                  const roleBadge = roleBadgeConfig[role] ?? roleBadgeConfig.other;
                  const expiresAt = (invite.expires_at as string) ?? (invite.expiresAt as string);
                  const expiresDate = expiresAt ? new Date(expiresAt) : null;
                  const now = new Date();
                  const hoursLeft = expiresDate
                    ? Math.max(0, Math.round((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60)))
                    : null;

                  return (
                    <Card key={invite.id as string} className="rounded-2xl shadow-sm border-l-4 border-l-amber-300 border-amber-200/30">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 shrink-0">
                              <Clock className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {(invite.full_name as string) ?? (invite.fullName as string) ?? (invite.email as string) ?? 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                                <Mail className="h-3 w-3 shrink-0" />
                                {(invite.email as string) ?? ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <Badge className={cn('text-[10px] font-medium capitalize', roleBadge)}>
                              {role.replace(/_/g, ' ')}
                            </Badge>
                            {hoursLeft !== null && (
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                {hoursLeft > 24
                                  ? `${Math.round(hoursLeft / 24)}d left`
                                  : `${hoursLeft}h left`}
                              </span>
                            )}
                            <CollaboratorActions
                              id={invite.id as string}
                              type="invite"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
