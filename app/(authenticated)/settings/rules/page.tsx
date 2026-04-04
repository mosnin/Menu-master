import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { getRules } from '@/lib/services/org-config-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Scale,
  Plus,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { RuleToggle } from './rule-toggle';
import type { OrganizationRule } from '@/types';

export default async function RulesPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  let rules: OrganizationRule[] = [];

  try {
    const profile = await getCurrentUserProfile();
    if (profile?.memberships?.[0]?.organization_id) {
      rules = await getRules(profile.memberships[0].organization_id);
    }
  } catch {
    // If fetch fails, show empty state
  }

  const ruleTypeLabels: Record<string, string> = {
    auto_assign: 'Auto-Assign',
    auto_checklist: 'Auto-Checklist',
    approval_required: 'Approval Required',
    notification: 'Notification',
    deadline: 'Deadline',
  };

  const ruleTypeIcons: Record<string, { icon: typeof Zap; color: string; bg: string }> = {
    auto_assign: { icon: Zap, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    auto_checklist: { icon: ShieldCheck, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40' },
    approval_required: { icon: ShieldCheck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    notification: { icon: Zap, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40' },
    deadline: { icon: Zap, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40' },
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-2">
      {/* Page header */}
      <PageHeader
        title="Rules"
        description="Automate workflows with organization-wide rules."
        backHref="/settings"
        backLabel="Settings"
        actions={
          <Button className="rounded-xl px-5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Rule
          </Button>
        }
      />

      {/* Rules list */}
      {rules.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No rules configured"
          description="Rules automate common workflows like auto-assigning tasks, requiring approvals, and triggering notifications. Add your first rule to get started."
          action={
            <Button variant="outline" size="sm" className="rounded-lg px-5">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Your First Rule
            </Button>
          }
        />
      ) : (
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <Scale className="h-4 w-4 text-muted-foreground" />
              Organization Rules
            </CardTitle>
            <CardDescription>
              {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 -mx-1">
            {rules.map((rule, index) => {
              const config = (rule.rule_config ?? {}) as Record<string, unknown>;
              const name = (config.name as string) ?? rule.rule_type;
              const typeConfig = ruleTypeIcons[rule.rule_type] ?? {
                icon: Zap,
                color: 'text-muted-foreground',
                bg: 'bg-muted',
              };
              const TypeIcon = typeConfig.icon;

              return (
                <div key={rule.id}>
                  <div className="flex items-center justify-between rounded-lg px-4 py-4 transition-colors duration-150 hover:bg-muted/40">
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${typeConfig.bg}`}
                      >
                        <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-2 py-0 rounded-md"
                          >
                            {ruleTypeLabels[rule.rule_type] ?? rule.rule_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated{' '}
                            {new Date(rule.updated_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <RuleToggle ruleId={rule.id} isActive={rule.is_active} />
                  </div>
                  {index < rules.length - 1 && (
                    <div className="mx-4 h-px bg-border/60" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
