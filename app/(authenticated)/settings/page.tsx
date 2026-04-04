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
} from 'lucide-react';

export default async function SettingsPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and organization settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name</span>
              <p className="font-medium">{session.user.name || 'Not set'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium">{session.user.email}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Role</span>
            </div>
            <Badge variant="default">Admin</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </CardTitle>
          <CardDescription>Your current organization membership</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Organization</span>
              <p className="font-medium">Deal Desk Inc.</p>
            </div>
            <div>
              <span className="text-muted-foreground">Plan</span>
              <p className="font-medium">Professional</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Members</span>
              <p className="font-medium">1 user</p>
            </div>
            <div>
              <span className="text-muted-foreground">Transactions</span>
              <p className="font-medium">0 active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integrations
          </CardTitle>
          <CardDescription>Connected services and their status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Auth0</p>
                <p className="text-xs text-muted-foreground">Authentication provider</p>
              </div>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50">
                <Server className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Supabase</p>
                <p className="text-xs text-muted-foreground">Database and file storage</p>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50">
                <Server className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">OpenAI</p>
                <p className="text-xs text-muted-foreground">Document extraction and AI</p>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50">
                <Server className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Resend</p>
                <p className="text-xs text-muted-foreground">Transactional email delivery</p>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
