import { auth0, getCurrentUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { syncUserProfile } from '@/app/actions/auth-actions';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();

  if (!session) {
    redirect('/signin');
  }

  // Sync user profile on each authenticated page load
  let userRole: string | undefined;
  try {
    await syncUserProfile();
    const profile = await getCurrentUserProfile();
    userRole = profile?.memberships?.[0]?.role;
  } catch {
    // Profile sync is best-effort; don't block page load
  }

  return (
    <AppShell
      userEmail={session.user.email}
      userName={session.user.name}
      userRole={userRole}
    >
      {children}
    </AppShell>
  );
}
