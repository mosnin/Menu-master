'use client';

import type { ComplianceIssue } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ComplianceIssueCardProps {
  issue: ComplianceIssue;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  blocked: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  overridden: 'bg-gray-100 text-gray-800',
};

export function ComplianceIssueCard({ issue }: ComplianceIssueCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{issue.title}</CardTitle>
          <div className="flex gap-1">
            <Badge className={severityColors[issue.severity] ?? ''} variant="outline">
              {issue.severity}
            </Badge>
            <Badge className={statusColors[issue.status] ?? ''} variant="outline">
              {issue.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {issue.description && (
          <p className="text-sm text-muted-foreground">{issue.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{issue.category}</span>
          <span>&middot;</span>
          <span>{new Date(issue.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
