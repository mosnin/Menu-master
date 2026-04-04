import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Shield, Zap, CheckCircle2 } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />

      <div className="relative z-10 w-full max-w-sm px-4">
        <Card className="shadow-lg border-0 shadow-slate-200/60">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-md">
              <FileText className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Deal Desk</CardTitle>
            <CardDescription className="text-sm mt-1">
              AI-powered real estate transaction management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Automated document extraction</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span>Smart checklists and timelines</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Human-in-the-loop approvals</span>
              </div>
            </div>

            <Button asChild className="w-full" size="lg">
              <a href="/auth/login">Sign in with Auth0</a>
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure authentication powered by Auth0
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
