import { auth0 } from '@/lib/auth/session';
import * as userProfileRepo from '@/lib/repositories/user-profiles';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/ui/page-header';
import {
  User,
  Building2,
  Shield,
  Plug,
  CheckCircle2,
  Server,
  MessageSquare,
  LogOut,
} from 'lucide-react';
import { FeedbackForm } from '@/components/feedback/feedback-form';
import { ProfileEditor } from './profile-editor';
import { supabase } from '@/lib/db/client';

export default async function SettingsPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  // Fetch real profile data
  const profile = await userProfileRepo.findByAuth0Id(session.user.sub);

  // Fetch memberships with org details
  let memberships: Array<{
    id: string;
    organization_id: string;
    role: string;
    status: string;
    created_at: string;
    organizations: { id: string; name: string } | null;
  }> = [];

  if (profile) {
    const { data } = await supabase
      .from('memberships')
      .select('*, organizations(*)')
      .eq('user_profile_id', profile.id)
      .order('created_at', { ascending: false });

    memberships = data ?? [];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-2">
      {/* Page header */}
      <PageHeader title="Settings" description="Manage your profile and organization." />

      {/* Profile card */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-7 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <User className="h-4 w-4 text-muted-foreground" />
            Profile
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="p-7 pt-0">
          {profile ? (
            <ProfileEditor profile={profile} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Profile not found. Please complete onboarding.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Organizations card */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-7 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Organizations
          </CardTitle>
          <CardDescription>Your workspace memberships</CardDescription>
        </CardHeader>
        <CardContent className="p-7 pt-0">
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are not a member of any organization yet.
            </p>
          ) : (
            <div className="space-y-4">
              {memberships.map((m, i) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between py-1">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {m.organizations?.name ?? 'Unknown Organization'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(m.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-md px-2.5 py-0.5 text-xs font-medium capitalize"
                      >
                        {m.role.replace('_', ' ')}
                      </Badge>
                      {m.status === 'active' && (
                        <Badge
                          variant="outline"
                          className="rounded-md bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700"
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                  {i < memberships.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security card */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-7 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="p-7 pt-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">
                Change your account password via Auth0
              </p>
            </div>
            <a
              href="/auth/login?screen_hint=reset_password"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Change Password
            </a>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground">
                End your current session
              </p>
            </div>
            <a
              href="/auth/logout"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-destructive px-4 text-sm font-medium text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Integrations card */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-7 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Plug className="h-4 w-4 text-muted-foreground" />
            Integrations
          </CardTitle>
          <CardDescription>Connected services and their status</CardDescription>
        </CardHeader>
        <CardContent className="p-7 pt-0 space-y-4">
          {[
            { name: 'Auth0', desc: 'Authentication provider', icon: CheckCircle2, badge: 'Connected' },
            { name: 'Supabase', desc: 'Database and file storage', icon: Server, badge: 'Active' },
            { name: 'OpenAI', desc: 'Document extraction and AI', icon: Server, badge: 'Active' },
            { name: 'Resend', desc: 'Transactional email delivery', icon: Server, badge: 'Active' },
          ].map((item, i, arr) => (
            <div key={item.name}>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                    <item.icon className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <Badge
                  variant="success"
                  className="rounded-md bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700"
                >
                  {item.badge}
                </Badge>
              </div>
              {i < arr.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feedback card */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-7 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Feedback
          </CardTitle>
          <CardDescription>Help us improve by sharing your experience</CardDescription>
        </CardHeader>
        <CardContent className="p-7 pt-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Have feedback or want to report an issue? We&apos;d love to hear from you.
            </p>
            <FeedbackForm />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
