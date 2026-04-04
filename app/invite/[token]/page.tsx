import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, AlertTriangle, Clock, Check } from 'lucide-react';
import Link from 'next/link';
import * as teamInviteRepo from '@/lib/repositories/team-invites';
import * as orgRepo from '@/lib/repositories/organizations';
import { getServerSession } from '@/lib/auth/session';
import { AcceptInviteButton } from './accept-invite-button';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const invite = await teamInviteRepo.findByToken(token);

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/40">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Invite Not Found</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This invite link is invalid or has been removed.
            </p>
            <Button asChild className="mt-6 rounded-xl">
              <Link href="/signin">Go to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(invite.expires_at) < new Date();
  const isAccepted = invite.status === 'accepted';
  const isRevoked = invite.status === 'revoked';
  const isInvalid = isExpired || isAccepted || isRevoked;

  if (isInvalid) {
    const message = isAccepted
      ? 'This invite has already been accepted.'
      : isRevoked
        ? 'This invite has been revoked.'
        : 'This invite has expired.';

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/40">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Invite Unavailable</h1>
            <p className="mt-3 text-sm text-muted-foreground">{message}</p>
            <Button asChild className="mt-6 rounded-xl">
              <Link href="/signin">Go to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invite is valid — fetch org details
  const org = await orgRepo.findById(invite.organization_id);
  const session = await getServerSession();
  const isAuthenticated = !!session;
  const roleLabel = invite.role.replace('_', ' ');

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            You&apos;re invited to join
          </h1>
          <p className="mt-2 text-lg font-semibold text-primary">
            {org?.name ?? 'a team'}
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize">{roleLabel}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
              <span className="text-muted-foreground">Invited as</span>
              <span className="font-medium">{invite.email}</span>
            </div>
          </div>

          {isAuthenticated ? (
            <AcceptInviteButton token={token} />
          ) : (
            <Button asChild className="mt-8 w-full rounded-xl">
              <Link href={`/auth/login?returnTo=/invite/${token}`}>
                Sign in to accept invite
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
