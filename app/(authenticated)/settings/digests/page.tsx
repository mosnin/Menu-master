import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getDigestPreferencesAction } from '@/app/actions/digest-actions';
import { DigestSettingsForm, type DigestPreferences } from '@/components/digest/digest-settings-form';
import { PageHeader } from '@/components/ui/page-header';

export default async function DigestSettingsPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  const { data: rawPreferences, error } = await getDigestPreferencesAction();

  const defaultPreferences: DigestPreferences = rawPreferences
    ? {
        enabled: rawPreferences.is_enabled ?? true,
        delivery_hour: rawPreferences.delivery_hour ?? 8,
        timezone: rawPreferences.timezone ?? 'America/Los_Angeles',
        include_health_risks: rawPreferences.include_health_risks ?? true,
        include_deadlines: rawPreferences.include_deadlines ?? true,
        include_pending_approvals: rawPreferences.include_pending_approvals ?? true,
        include_stale_responses: rawPreferences.include_stale_responses ?? true,
        include_closing_soon: rawPreferences.include_closing_soon ?? true,
      }
    : {
        enabled: true,
        delivery_hour: 8,
        timezone: 'America/Los_Angeles',
        include_health_risks: true,
        include_deadlines: true,
        include_pending_approvals: true,
        include_stale_responses: true,
        include_closing_soon: true,
      };

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-2">
      <PageHeader
        title="Digest Settings"
        description="Configure your daily digest delivery preferences."
        backHref="/settings"
        backLabel="Settings"
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DigestSettingsForm initialPreferences={defaultPreferences} />
    </div>
  );
}
