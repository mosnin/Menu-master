import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  FileText,
  Landmark,
  BookOpen,
  ClipboardCheck,
  ThumbsUp,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Suspense } from 'react';
import { getClosingReadinessAction } from '@/app/actions/closing-actions';
import { getLenderProgressAction } from '@/app/actions/lender-actions';
import { getTitleProgressAction } from '@/app/actions/title-actions';
import { getHealthScoreAction } from '@/app/actions/health-score-actions';
import { cn } from '@/lib/utils';

interface ClosingPageProps {
  params: Promise<{ id: string }>;
}

const stateConfig = {
  not_ready: { label: 'Not Ready', className: 'bg-red-100 text-red-800 border-red-200' },
  at_risk: { label: 'At Risk', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  nearly_ready: { label: 'Nearly Ready', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  ready_for_closing: { label: 'Ready for Closing', className: 'bg-green-100 text-green-800 border-green-200' },
};

const severityConfig = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800', icon: AlertCircle },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-800', icon: AlertTriangle },
  low: { label: 'Low', className: 'bg-blue-100 text-blue-800', icon: Info },
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

function scoreBgColor(score: number): string {
  if (score >= 80) return 'from-green-50/90 via-green-50/50 to-transparent border-green-200/50';
  if (score >= 60) return 'from-amber-50/90 via-amber-50/50 to-transparent border-amber-200/50';
  if (score >= 40) return 'from-orange-50/90 via-orange-50/50 to-transparent border-orange-200/50';
  return 'from-red-50/90 via-red-50/50 to-transparent border-red-200/50';
}

const categoryMeta: Record<string, { label: string; icon: typeof FileText }> = {
  documents: { label: 'Documents', icon: FileText },
  financing: { label: 'Financing', icon: Landmark },
  title: { label: 'Title', icon: BookOpen },
  checklist: { label: 'Checklist', icon: ClipboardCheck },
  approvals: { label: 'Approvals', icon: ThumbsUp },
};

interface MilestoneItem {
  id: string;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  completedAt?: string | null;
  notes?: string | null;
}

function MilestoneTimeline({ milestones, emptyLabel }: { milestones: MilestoneItem[]; emptyLabel: string }) {
  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed bg-muted/15">
        <Clock className="h-7 w-7 text-muted-foreground/60 mb-4" />
        <p className="text-sm font-semibold tracking-tight">No milestones yet</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
          {emptyLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {milestones.map((milestone, idx) => {
        const isLast = idx === milestones.length - 1;
        return (
          <div key={milestone.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full ring-1',
                  milestone.status === 'completed' &&
                    'bg-green-100 ring-green-200/40',
                  milestone.status === 'in_progress' &&
                    'bg-blue-100 ring-blue-200/40',
                  milestone.status === 'pending' &&
                    'bg-muted ring-border',
                )}
              >
                {milestone.status === 'completed' && (
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                )}
                {milestone.status === 'in_progress' && (
                  <Clock className="h-4 w-4 text-blue-700" />
                )}
                {milestone.status === 'pending' && (
                  <Circle className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1.5 mb-1.5" />}
            </div>
            <div className={cn('pb-6 pt-1', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-medium',
                  milestone.status === 'completed' && 'text-green-900',
                  milestone.status === 'in_progress' && 'text-blue-900',
                  milestone.status === 'pending' && 'text-muted-foreground',
                )}
              >
                {milestone.name}
              </p>
              {milestone.completedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Completed {new Date(milestone.completedAt).toLocaleDateString()}
                </p>
              )}
              {milestone.status === 'in_progress' && (
                <Badge variant="secondary" className="mt-1.5 text-[10px]">
                  In Progress
                </Badge>
              )}
              {milestone.notes && (
                <p className="text-xs text-muted-foreground mt-1">{milestone.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function ClosingPage({ params }: ClosingPageProps) {
  const { id: transactionId } = await params;

  const [readinessResult, lenderResult, titleResult, healthResult] = await Promise.all([
    getClosingReadinessAction(transactionId),
    getLenderProgressAction(transactionId),
    getTitleProgressAction(transactionId),
    getHealthScoreAction(transactionId),
  ]);

  const readiness = readinessResult.data;
  const lenderProgress = lenderResult.data;
  const titleProgress = titleResult.data;
  const healthScore = healthResult.data;

  const readinessAny = readiness as Record<string, unknown> | undefined;
  const overallScore = readiness?.overall_score ?? (readinessAny?.overallScore as number) ?? 0;
  const state: keyof typeof stateConfig =
    readiness?.readiness_state ?? (readinessAny?.state as string as keyof typeof stateConfig) ?? 'not_ready';
  const stateStyle = stateConfig[state] ?? stateConfig.not_ready;

  const categoryScores = (readinessAny?.category_scores ?? readinessAny?.categoryScores ?? {
    documents: { score: 0, status: 'incomplete' },
    financing: { score: 0, status: 'not_started' },
    title: { score: 0, status: 'not_started' },
    checklist: { score: 0, status: 'incomplete' },
    approvals: { score: 0, status: 'pending' },
  }) as Record<string, { score: number; status: string }>;

  const unresolvedBlockers: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    created_at?: string;
    createdAt?: string;
  }> = (readiness?.unresolved_blockers ?? []) as unknown as Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    created_at?: string;
    createdAt?: string;
  }>;

  const missingDocuments: Array<{
    id: string;
    name: string;
    required: boolean;
    category: string;
  }> = (readiness?.missing_documents ?? []) as unknown as Array<{
    id: string;
    name: string;
    required: boolean;
    category: string;
  }>;

  const preCloseChecklist: Array<{
    id: string;
    title: string;
    completed: boolean;
    due_date?: string | null;
    dueDate?: string | null;
    assignee?: string | null;
  }> = (readinessAny?.pre_close_checklist ?? readinessAny?.preCloseChecklist ?? []) as Array<{
    id: string;
    title: string;
    completed: boolean;
    due_date?: string | null;
    dueDate?: string | null;
    assignee?: string | null;
  }>;

  const nextSteps: Array<{
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium';
  }> = (readinessAny?.next_steps ?? readinessAny?.nextSteps ?? []) as Array<{
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium';
  }>;

  const lenderMilestones: MilestoneItem[] = (
    (lenderProgress as any)?.milestones ?? lenderProgress ?? []
  ).map((m: Record<string, unknown>) => ({
    id: (m.id as string) ?? String(Math.random()),
    name: (m.name as string) ?? (m.milestone as string) ?? '',
    status: (m.status as MilestoneItem['status']) ?? 'pending',
    completedAt: (m.completed_at as string) ?? (m.completedAt as string) ?? null,
    notes: (m.notes as string) ?? null,
  }));

  const titleMilestones: MilestoneItem[] = (
    (titleProgress as any)?.milestones ?? titleProgress ?? []
  ).map((m: Record<string, unknown>) => ({
    id: (m.id as string) ?? String(Math.random()),
    name: (m.name as string) ?? (m.milestone as string) ?? '',
    status: (m.status as MilestoneItem['status']) ?? 'pending',
    completedAt: (m.completed_at as string) ?? (m.completedAt as string) ?? null,
    notes: (m.notes as string) ?? null,
  }));

  const incompleteChecklist = preCloseChecklist.filter((item) => !item.completed);

  return (
    <div className="space-y-10">
      {/* Readiness Banner */}
      <Card
        className={cn(
          'rounded-2xl bg-gradient-to-br shadow-sm',
          scoreBgColor(overallScore),
        )}
      >
        <CardContent className="p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center justify-center">
                <span
                  className={cn(
                    'text-5xl font-bold tracking-tighter tabular-nums',
                    scoreColor(overallScore),
                  )}
                >
                  {overallScore}
                </span>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">
                  Readiness
                </span>
              </div>
              <Separator orientation="vertical" className="h-16" />
              <div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold tracking-tight">
                    Closing Readiness
                  </h2>
                </div>
                <div className="mt-2">
                  <Badge className={cn('text-xs font-medium border', stateStyle.className)}>
                    {stateStyle.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Scores */}
      <section>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-4 px-1">
          Category Scores
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(categoryMeta).map(([key, meta]) => {
            const cat = (categoryScores as Record<string, { score: number; status: string }>)[key] ?? {
              score: 0,
              status: 'unknown',
            };
            const Icon = meta.icon;
            return (
              <Card key={key} className="rounded-2xl shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {meta.label}
                    </span>
                  </div>
                  <p
                    className={cn(
                      'text-2xl font-bold tracking-tight tabular-nums',
                      scoreColor(cat.score),
                    )}
                  >
                    {cat.score}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 capitalize">
                    {cat.status.replace(/_/g, ' ')}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-10">
          {/* Unresolved Blockers */}
          <section>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-4 px-1">
              Unresolved Blockers
            </p>
            {unresolvedBlockers.length === 0 ? (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-7">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 mb-4">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold tracking-tight">
                      No unresolved blockers
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                      All exceptions and issues have been resolved.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {unresolvedBlockers.map((blocker) => {
                  const sev = severityConfig[blocker.severity] ?? severityConfig.medium;
                  const SevIcon = sev.icon;
                  return (
                    <Card key={blocker.id} className="rounded-2xl shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 shrink-0">
                            <SevIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5">
                              <p className="text-sm font-medium truncate">
                                {blocker.title}
                              </p>
                              <Badge
                                className={cn(
                                  'text-[10px] font-medium shrink-0',
                                  sev.className,
                                )}
                              >
                                {sev.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 capitalize">
                              {blocker.category.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Missing Documents */}
          <section>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-4 px-1">
              Missing Documents
            </p>
            {missingDocuments.length === 0 ? (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-7">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 mb-4">
                      <FileText className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold tracking-tight">
                      All documents received
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                      Every required document has been uploaded and accounted for.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-5">
                  <ul className="space-y-2">
                    {missingDocuments.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center gap-3.5 text-sm rounded-lg p-3 -mx-1 hover:bg-muted/30 transition-colors duration-200"
                      >
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        <span className="flex-1">{doc.name}</span>
                        {doc.required && (
                          <Badge variant="secondary" className="text-[10px]">
                            Required
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground capitalize">
                          {doc.category.replace(/_/g, ' ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Lender Progress */}
          <section>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-4 px-1">
              Lender Progress
            </p>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-7">
                <MilestoneTimeline
                  milestones={lenderMilestones}
                  emptyLabel="Lender milestones will appear here once financing is underway."
                />
              </CardContent>
            </Card>
          </section>

          {/* Title & Escrow Progress */}
          <section>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-4 px-1">
              Title & Escrow Progress
            </p>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-7">
                <MilestoneTimeline
                  milestones={titleMilestones}
                  emptyLabel="Title and escrow milestones will appear here once title work begins."
                />
              </CardContent>
            </Card>
          </section>

          {/* Pre-Close Checklist */}
          <section>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-4 px-1">
              Pre-Close Checklist
            </p>
            {incompleteChecklist.length === 0 ? (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-7">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 mb-4">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold tracking-tight">
                      All items completed
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                      Every pre-close checklist item has been completed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-5">
                  <ul className="space-y-2">
                    {incompleteChecklist.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3.5 text-sm rounded-lg p-3 -mx-1 hover:bg-muted/30 transition-colors duration-200"
                      >
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {item.assignee && (
                          <span className="text-xs text-muted-foreground">
                            {item.assignee}
                          </span>
                        )}
                        {(item.due_date ?? item.dueDate) && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            Due{' '}
                            {new Date(
                              (item.due_date ?? item.dueDate)!,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* What Must Happen Next */}
          <Card className="rounded-2xl shadow-sm border-l-4 border-l-purple-400 border-purple-200/50">
            <CardHeader className="pb-3 p-7">
              <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
                <Zap className="h-4 w-4 text-purple-600" />
                What Must Happen Next
              </CardTitle>
            </CardHeader>
            <CardContent className="px-7 pb-7 pt-0">
              {nextSteps.length === 0 ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Upload documents and complete checklist items to see prioritized next steps.
                </p>
              ) : (
                <ol className="space-y-4">
                  {nextSteps.slice(0, 5).map((step, idx) => {
                    const priorityColor =
                      step.priority === 'critical'
                        ? 'bg-red-600'
                        : step.priority === 'high'
                          ? 'bg-orange-600'
                          : 'bg-blue-600';
                    return (
                      <li key={idx} className="flex items-start gap-4">
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm mt-0.5',
                            priorityColor,
                          )}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{step.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Health Score Summary */}
          {healthScore && (
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-3 p-7">
                <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Health Score
                </CardTitle>
              </CardHeader>
              <CardContent className="px-7 pb-7 pt-0">
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      'text-3xl font-bold tracking-tighter tabular-nums',
                      scoreColor(healthScore.overall_score ?? (healthScore as any).overallScore ?? 0),
                    )}
                  >
                    {healthScore.overall_score ?? (healthScore as any).overallScore ?? 0}
                  </span>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {(healthScore.rating ?? 'unknown').replace(/_/g, ' ')}
                  </Badge>
                </div>
                {healthScore.risk_factors && healthScore.risk_factors.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {healthScore.risk_factors.slice(0, 3).map((rf: Record<string, unknown>, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        {(rf.label as string) ?? String(rf)}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
