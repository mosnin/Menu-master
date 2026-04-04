import { auth0 } from '@/lib/auth/session';
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
  try {
    await syncUserProfile();
  } catch {
    // Profile sync is best-effort; don't block page load
  }

  return (
    <AppShell
      userEmail={session.user.email}
      userName={session.user.name}
    >
      {children}
    </AppShell>
  );
}
