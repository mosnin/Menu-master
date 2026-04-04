import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  FileText,
  Upload,
  ClipboardCheck,
  CheckCircle2,
  Circle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SetupStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  actionLabel: string;
  completed: boolean;
}

export default async function GettingStartedPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  // In a production app these would be real data queries.
  // For now we use safe defaults so the page renders for every user.
  const orgName: string | null = 'Deal Desk Inc.';
  const teamMemberCount = 1;
  const transactionCount = 0;
  const documentCount = 0;
  const checklistCount = 0;

  const steps: SetupStep[] = [
    {
      title: 'Set up your workspace',
      description: `Your organization "${orgName ?? 'Unnamed'}" is ready. Invite colleagues to collaborate on transactions.`,
      icon: Building2,
      href: '/settings',
      actionLabel: 'View settings',
      completed: !!orgName,
    },
    {
      title: 'Invite team members',
      description:
        teamMemberCount > 1
          ? `${teamMemberCount} team members have joined your workspace.`
          : 'Bring your team on board to review documents and approve actions together.',
      icon: Users,
      href: '/settings',
      actionLabel: 'Manage team',
      completed: teamMemberCount > 1,
    },
    {
      title: 'Create your first transaction',
      description:
        transactionCount > 0
          ? `You have ${transactionCount} transaction${transactionCount > 1 ? 's' : ''} in progress.`
          : 'Start by creating a real estate transaction to organize documents and track deadlines.',
      icon: FileText,
      href: '/transactions/new',
      actionLabel: 'New transaction',
      completed: transactionCount > 0,
    },
    {
      title: 'Upload your first document',
      description:
        documentCount > 0
          ? `${documentCount} document${documentCount > 1 ? 's' : ''} uploaded and processed.`
          : 'Upload a purchase agreement, disclosure, or amendment for AI extraction.',
      icon: Upload,
      href: '/transactions',
      actionLabel: 'Go to transactions',
      completed: documentCount > 0,
    },
    {
      title: 'Review AI extraction results',
      description:
        checklistCount > 0
          ? `${checklistCount} checklist${checklistCount > 1 ? 's' : ''} generated from your documents.`
          : 'After uploading a document, review the AI-generated checklist of key dates and action items.',
      icon: ClipboardCheck,
      href: '/transactions',
      actionLabel: 'View transactions',
      completed: checklistCount > 0,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-10 py-2">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Getting Started
        </h1>
        <p className="mt-1 text-muted-foreground">
          Complete these steps to get the most out of Deal Desk.
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {completedCount} of {steps.length} steps completed
          </span>
          <span className="text-muted-foreground">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              progressPercent === 100 ? 'bg-green-500' : 'bg-primary'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Workspace info */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold tracking-tight">
                {orgName ?? 'Your Organization'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {teamMemberCount} team member{teamMemberCount !== 1 ? 's' : ''}{' '}
                invited
              </p>
            </div>
            {!!orgName && (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card
            key={step.title}
            className={cn(
              'rounded-xl shadow-sm transition-all duration-200',
              step.completed && 'bg-muted/30'
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Step status */}
                <div className="pt-0.5">
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                    </div>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <step.icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        step.completed
                          ? 'text-muted-foreground/60'
                          : 'text-muted-foreground'
                      )}
                    />
                    <h3
                      className={cn(
                        'text-sm font-semibold tracking-tight',
                        step.completed && 'text-muted-foreground'
                      )}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Action */}
                {!step.completed && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-xl"
                  >
                    <Link
                      href={step.href}
                      className="flex items-center gap-1.5"
                    >
                      {step.actionLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
