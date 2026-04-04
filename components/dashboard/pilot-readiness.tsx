import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadinessCheck {
  label: string;
  completed: boolean;
}

interface PilotReadinessProps {
  orgName?: string | null;
  teamMemberCount: number;
  transactionCount: number;
  documentCount: number;
  checklistCount: number;
}

function ProgressRing({
  percentage,
  size = 80,
  strokeWidth = 6,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/60"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-[stroke-dashoffset] duration-700 ease-out',
            percentage === 100 ? 'text-green-500' : 'text-primary'
          )}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold tracking-tight">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

export function PilotReadiness({
  orgName,
  teamMemberCount,
  transactionCount,
  documentCount,
  checklistCount,
}: PilotReadinessProps) {
  const checks: ReadinessCheck[] = [
    { label: 'Organization name set', completed: !!orgName },
    { label: 'At least 1 team member', completed: teamMemberCount >= 1 },
    { label: 'At least 1 transaction', completed: transactionCount >= 1 },
    { label: 'At least 1 document uploaded', completed: documentCount >= 1 },
    { label: 'At least 1 checklist generated', completed: checklistCount >= 1 },
  ];

  const completedCount = checks.filter((c) => c.completed).length;
  const percentage = Math.round((completedCount / checks.length) * 100);

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary/10 p-2">
            <Rocket className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">
              Pilot Readiness
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {completedCount} of {checks.length} steps completed
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6">
          {/* Progress ring */}
          <div className="shrink-0">
            <ProgressRing percentage={percentage} />
          </div>

          {/* Checklist */}
          <div className="flex-1 space-y-3">
            {checks.map((check) => (
              <div key={check.label} className="flex items-center gap-2.5">
                {check.completed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
                <span
                  className={cn(
                    'text-sm',
                    check.completed
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  )}
                >
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
