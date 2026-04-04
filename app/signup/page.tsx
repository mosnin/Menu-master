import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white relative overflow-hidden px-6">
      {/* Subtle background dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <FileText className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-7">
            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Start your free workspace
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your Deal Desk account to get started
              </p>
            </div>

            {/* CTA */}
            <Button
              asChild
              className="w-full h-12 rounded-xl text-base font-medium"
              size="lg"
            >
              <a href="/auth/login?screen_hint=signup">Create account</a>
            </Button>

            {/* Sign in link */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <a
                href="/signin"
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                Sign in
              </a>
            </p>

            {/* Help text */}
            <p className="mt-4 text-center text-xs text-muted-foreground/60">
              Joining an existing team? Ask your admin for an invite
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
