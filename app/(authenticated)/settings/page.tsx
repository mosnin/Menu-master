import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Building2,
  Shield,
  Plug,
  CheckCircle2,
  Server,
  MessageSquare,
} from 'lucide-react';
import { FeedbackForm } from '@/components/feedback/feedback-form';

export default async function SettingsPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-2">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile and organization settings.
        </p>
      </div>

      {/* Profile card */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <User className="h-4 w-4 text-muted-foreground" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Name
              </span>
              <p className="text-sm font-semibold">{session.user.name || 'Not set'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Email
              </span>
              <p className="text-sm font-semibold">{session.user.email}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Role</span>
            </div>
            <Badge variant="default" className="rounded-md px-2.5 py-0.5 text-xs font-medium">
              Admin
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Organization card */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Organization
          </CardTitle>
          <CardDescription>Your current organization membership</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Organization
              </span>
              <p className="text-sm font-semibold">Deal Desk Inc.</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Plan
              </span>
              <p className="text-sm font-semibold">Professional</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Members
              </span>
              <p className="text-sm font-semibold">1 user</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Transactions
              </span>
              <p className="text-sm font-semibold">0 active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations card */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Plug className="h-4 w-4 text-muted-foreground" />
            Integrations
          </CardTitle>
          <CardDescription>Connected services and their status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Feedback
          </CardTitle>
          <CardDescription>Help us improve by sharing your experience</CardDescription>
        </CardHeader>
        <CardContent>
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
