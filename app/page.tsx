import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText,
  Brain,
  ListChecks,
  Users,
  ShieldCheck,
} from 'lucide-react';

export default async function Home() {
  const session = await auth0.getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen">
      {/* Left column — product info */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between bg-slate-50 p-10 lg:p-16">
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <FileText className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>

          {/* Product name & tagline */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Deal Desk
          </h1>
          <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
            The operations platform for modern real estate teams
          </p>

          {/* Capability rows */}
          <div className="mt-10 space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <Brain className="h-[18px] w-[18px] text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-medium">
                  Document intelligence
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  AI extraction and classification
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <ListChecks className="h-[18px] w-[18px] text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-medium">
                  Transaction orchestration
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Checklists, timelines, stage management
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <Users className="h-[18px] w-[18px] text-violet-600" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-medium">
                  Team coordination
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Approvals, assignments, notifications
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50">
                <ShieldCheck className="h-[18px] w-[18px] text-green-600" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-medium">
                  Compliance confidence
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Audit trails, risk detection, safety rails
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust footer */}
        <p className="text-xs text-muted-foreground/50 mt-12">
          Trusted by brokerages managing $2B+ in transactions
        </p>
      </div>

      {/* Right column — auth actions */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center bg-white px-6 py-12">
        {/* Mobile-only logo */}
        <div className="mb-8 flex flex-col items-center md:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <FileText className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Deal Desk
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The operations platform for modern real estate teams
          </p>
        </div>

        <Card className="w-full max-w-sm rounded-2xl border-0 shadow-lg md:border md:shadow-sm">
          <CardContent className="p-7">
            <div className="space-y-4">
              <Button
                asChild
                className="w-full h-12 rounded-xl text-base font-medium"
                size="lg"
              >
                <a href="/auth/login">Sign in</a>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full h-12 rounded-xl text-base font-medium"
                size="lg"
              >
                <a href="/signup">Create account</a>
              </Button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Invite link */}
            <p className="text-center text-sm text-muted-foreground">
              Invited to a team?{' '}
              <a
                href="/invite"
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                Enter your invite code
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Auth0 footer */}
        <p className="mt-6 text-xs text-muted-foreground/50">
          Secure authentication powered by Auth0
        </p>
      </div>
    </div>
  );
}
