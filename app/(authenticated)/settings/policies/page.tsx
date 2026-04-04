import { auth0 } from '@/lib/auth/session';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/db/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Plus,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  ShieldBan,
  Inbox,
} from 'lucide-react';
import Link from 'next/link';
import { PolicyRuleToggle } from './policy-rule-toggle';
import type { PolicyRule } from '@/types';

async function getPolicyRules(orgId: string): Promise<PolicyRule[]> {
  const { data, error } = await supabase
    .from('policy_rules')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

export default async function PoliciesPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/dashboard');

  const membership = (profile as any).memberships?.[0];
  if (!membership || membership.role !== 'broker_admin') {
    redirect('/dashboard');
  }

  const orgId = membership.organization_id;
  const rules = await getPolicyRules(orgId);

  const categoryLabels: Record<string, string> = {
    required_document: 'Required Document',
    required_approval: 'Required Approval',
    required_economics: 'Required Economics',
    stage_gate: 'Stage Gate',
    compliance_signoff: 'Compliance Signoff',
    correction_review: 'Correction Review',
  };

  const enforcementConfig: Record<string, { label: string; className: string; icon: typeof ShieldCheck }> = {
    warn: {
      label: 'Warn',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
      icon: ShieldCheck,
    },
    block: {
      label: 'Block',
      className: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400',
      icon: ShieldBan,
    },
    require_override: {
      label: 'Require Override',
      className: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-400',
      icon: ShieldAlert,
    },
  };

  const categoryIcons: Record<string, { color: string; bg: string }> = {
    required_document: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    required_approval: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    required_economics: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40' },
    stage_gate: { color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40' },
    compliance_signoff: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40' },
    correction_review: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40' },
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-2">
      {/* Page header */}
      <div>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 flex items-center gap-1.5 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Policy Rules</h1>
            <p className="mt-1 text-muted-foreground">
              Define compliance policies and enforcement rules for your brokerage.
            </p>
          </div>
          <Button className="rounded-xl px-5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 mb-5">
            <Shield className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">No policy rules configured</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
            Policy rules define compliance requirements for transactions. They can warn agents,
            block progression, or require broker override. Add your first rule to get started.
          </p>
          <Button variant="outline" size="sm" className="mt-6 rounded-lg px-5">
            <Plus className="h-4 w-4 mr-1.5" />
            Create Your First Policy
          </Button>
        </div>
      ) : (
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Active Policies
            </CardTitle>
            <CardDescription>
              {rules.length} rule{rules.length !== 1 ? 's' : ''} configured &middot;{' '}
              {rules.filter((r) => r.is_active).length} active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 -mx-1">
            {rules.map((rule, index) => {
              const catStyle = categoryIcons[rule.category] ?? {
                color: 'text-muted-foreground',
                bg: 'bg-muted',
              };
              const enfStyle = enforcementConfig[rule.enforcement_mode] ?? enforcementConfig.warn;
              const EnfIcon = enfStyle.icon;

              return (
                <div key={rule.id}>
                  <div className="flex items-center justify-between rounded-lg px-4 py-4 transition-colors duration-150 hover:bg-muted/40">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${catStyle.bg}`}
                      >
                        <Shield className={`h-4 w-4 ${catStyle.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{rule.name}</p>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-2 py-0 rounded-md"
                          >
                            {categoryLabels[rule.category] ?? rule.category}
                          </Badge>
                          <Badge
                            className={`text-[10px] px-2 py-0 rounded-md ${enfStyle.className}`}
                          >
                            <EnfIcon className="h-2.5 w-2.5 mr-1" />
                            {enfStyle.label}
                          </Badge>
                          {rule.office_id && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0 rounded-md">
                              Office-specific
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <PolicyRuleToggle ruleId={rule.id} isActive={rule.is_active} />
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

      {/* Add Rule Section */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Plus className="h-4 w-4 text-muted-foreground" />
            Add New Rule
          </CardTitle>
          <CardDescription>
            Define a new compliance policy rule for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="rule-name" className="text-sm font-medium">
                Rule Name
              </label>
              <input
                id="rule-name"
                type="text"
                placeholder="e.g., Require Purchase Agreement Before Active"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="rule-description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="rule-description"
                placeholder="Describe what this rule enforces..."
                rows={2}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="rule-category" className="text-sm font-medium">
                  Category
                </label>
                <select
                  id="rule-category"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select category...</option>
                  <option value="required_document">Required Document</option>
                  <option value="required_approval">Required Approval</option>
                  <option value="required_economics">Required Economics</option>
                  <option value="stage_gate">Stage Gate</option>
                  <option value="compliance_signoff">Compliance Signoff</option>
                  <option value="correction_review">Correction Review</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="rule-enforcement" className="text-sm font-medium">
                  Enforcement Mode
                </label>
                <select
                  id="rule-enforcement"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="warn">Warn</option>
                  <option value="block">Block</option>
                  <option value="require_override">Require Override</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="rule-config" className="text-sm font-medium">
                Rule Configuration (JSON)
              </label>
              <textarea
                id="rule-config"
                placeholder='{"condition": "...", "target": "..."}'
                rows={3}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px]"
              />
            </div>

            <Button type="button" className="rounded-xl px-6 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Rule
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
