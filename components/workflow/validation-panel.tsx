'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  code: string;
  message: string;
}

interface ValidationPanelProps {
  errors: ValidationError[];
  onNodeClick?: (nodeId: string) => void;
}

export function ValidationPanel({ errors, onNodeClick }: ValidationPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isValid = errors.length === 0;

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-7">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Validation
              </p>
              <p className="text-sm font-semibold mt-0.5">
                {isValid
                  ? 'Graph is valid'
                  : `${errors.length} error${errors.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
          </div>
          {!isValid && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={collapsed ? 'Expand errors' : 'Collapse errors'}
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Error list */}
        {!isValid && !collapsed && (
          <ul className="mt-5 space-y-3">
            {errors.map((error, idx) => (
              <li
                key={`${error.code}-${error.nodeId ?? error.edgeId ?? idx}`}
                className={`flex items-start gap-3 rounded-xl bg-muted/30 p-3 ${
                  error.nodeId && onNodeClick
                    ? 'cursor-pointer hover:bg-muted/50 transition-colors'
                    : ''
                }`}
                onClick={() => {
                  if (error.nodeId && onNodeClick) {
                    onNodeClick(error.nodeId);
                  }
                }}
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                      {error.code}
                    </Badge>
                    {error.nodeId && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        Node: {error.nodeId}
                      </span>
                    )}
                    {error.edgeId && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        Edge: {error.edgeId}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {error.message}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
