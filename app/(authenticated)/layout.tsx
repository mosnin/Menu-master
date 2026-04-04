import { auth0, getCurrentUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
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
  let onboardingStatus: string | undefined;
  let hasMembership = false;

  try {
    await syncUserProfile();
    const profile = await getCurrentUserProfile();
    userRole = profile?.memberships?.[0]?.role;
    onboardingStatus = profile?.onboarding_status;
    hasMembership = (profile?.memberships?.length ?? 0) > 0;
  } catch {
    // Profile sync is best-effort; don't block page load
  }

  // Post-auth routing: check if user needs onboarding
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '';
  const isOnboardingPage = pathname.startsWith('/onboarding');

  if (!isOnboardingPage) {
    // Route to onboarding if not completed
    if (onboardingStatus === 'pending' || onboardingStatus === 'in_progress') {
      redirect('/onboarding');
    }
    // Route to onboarding if completed but no org membership
    if (!hasMembership && onboardingStatus !== 'skipped') {
      redirect('/onboarding');
    }
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
