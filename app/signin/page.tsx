import { Button } from '@/components/ui/button';
import { FileText, Shield, Zap, CheckCircle2 } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white relative overflow-hidden px-6">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <FileText className="h-8 w-8 text-primary-foreground" />
        </div>

        {/* App name */}
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Deal Desk
        </h1>

        {/* Tagline */}
        <p className="mt-3 text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          AI-powered real estate transaction management
        </p>

        {/* Feature bullets */}
        <div className="mt-10 space-y-4 text-left max-w-xs mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
              <Zap className="h-[18px] w-[18px] text-amber-500" />
            </div>
            <span className="text-sm text-muted-foreground">Automated document extraction</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle2 className="h-[18px] w-[18px] text-green-500" />
            </div>
            <span className="text-sm text-muted-foreground">Smart checklists and timelines</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <Shield className="h-[18px] w-[18px] text-blue-500" />
            </div>
            <span className="text-sm text-muted-foreground">Human-in-the-loop approvals</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10">
          <Button asChild className="w-full h-12 rounded-xl text-base font-medium shadow-sm" size="lg">
            <a href="/auth/login">Sign in with Auth0</a>
          </Button>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-muted-foreground/60">
          Secure authentication powered by Auth0
        </p>
      </div>
    </div>
  );
}
