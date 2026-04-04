import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { getTemplates } from '@/lib/services/org-config-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutTemplate,
  Plus,
  CheckSquare,
  Calendar,
  ArrowLeft,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import type { OrganizationTemplate } from '@/types';

function getItemCount(template: OrganizationTemplate): number {
  const data = template.template_data ?? {};
  if (template.template_type === 'checklist') {
    return Array.isArray(data.items) ? data.items.length : 0;
  }
  if (template.template_type === 'timeline') {
    return Array.isArray(data.events) ? data.events.length : 0;
  }
  return 0;
}

const templateTypeConfig: Record<string, { icon: typeof CheckSquare; label: string; color: string; bg: string }> = {
  checklist: {
    icon: CheckSquare,
    label: 'Checklist',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
  },
  timeline: {
    icon: Calendar,
    label: 'Timeline',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
  },
};

export default async function TemplatesPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  let templates: OrganizationTemplate[] = [];

  try {
    const profile = await getCurrentUserProfile();
    if (profile?.memberships?.[0]?.organization_id) {
      templates = await getTemplates(profile.memberships[0].organization_id);
    }
  } catch {
    // If fetch fails, show empty state
  }

  const checklistTemplates = templates.filter((t) => t.template_type === 'checklist');
  const timelineTemplates = templates.filter((t) => t.template_type === 'timeline');

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
            <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
            <p className="mt-1 text-muted-foreground">
              Manage checklist and timeline templates for your organization.
            </p>
          </div>
          <Button className="rounded-xl px-5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
            <Plus className="h-4 w-4 mr-1.5" />
            New Template
          </Button>
        </div>
      </div>

      {/* Templates */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 mb-5">
            <LayoutTemplate className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">No templates yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
            Templates let you quickly apply standardized checklists and timelines to new transactions.
            Create your first template to streamline your workflow.
          </p>
          <Button variant="outline" size="sm" className="mt-6 rounded-lg px-5">
            <Plus className="h-4 w-4 mr-1.5" />
            Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Checklist Templates */}
          {checklistTemplates.length > 0 && (
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  Checklist Templates
                </CardTitle>
                <CardDescription>
                  {checklistTemplates.length} template{checklistTemplates.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 -mx-1">
                {checklistTemplates.map((template, index) => {
                  const itemCount = getItemCount(template);
                  return (
                    <div key={template.id}>
                      <div className="flex items-center justify-between rounded-lg px-4 py-4 transition-colors duration-150 hover:bg-muted/40">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
                            <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{template.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {itemCount} item{itemCount !== 1 ? 's' : ''}
                              </span>
                              {template.is_default && (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-md">
                                  Default
                                </Badge>
                              )}
                              {template.description && (
                                <>
                                  <span className="text-muted-foreground/40">&middot;</span>
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {template.description}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 rounded-lg px-4 text-xs transition-all duration-200 hover:scale-[1.02]"
                        >
                          Apply to Transaction
                          <ArrowUpRight className="h-3 w-3 ml-1.5" />
                        </Button>
                      </div>
                      {index < checklistTemplates.length - 1 && (
                        <div className="mx-4 h-px bg-border/60" />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Timeline Templates */}
          {timelineTemplates.length > 0 && (
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Timeline Templates
                </CardTitle>
                <CardDescription>
                  {timelineTemplates.length} template{timelineTemplates.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 -mx-1">
                {timelineTemplates.map((template, index) => {
                  const itemCount = getItemCount(template);
                  return (
                    <div key={template.id}>
                      <div className="flex items-center justify-between rounded-lg px-4 py-4 transition-colors duration-150 hover:bg-muted/40">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
                            <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{template.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {itemCount} event{itemCount !== 1 ? 's' : ''}
                              </span>
                              {template.is_default && (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-md">
                                  Default
                                </Badge>
                              )}
                              {template.description && (
                                <>
                                  <span className="text-muted-foreground/40">&middot;</span>
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {template.description}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 rounded-lg px-4 text-xs transition-all duration-200 hover:scale-[1.02]"
                        >
                          Apply to Transaction
                          <ArrowUpRight className="h-3 w-3 ml-1.5" />
                        </Button>
                      </div>
                      {index < timelineTemplates.length - 1 && (
                        <div className="mx-4 h-px bg-border/60" />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
