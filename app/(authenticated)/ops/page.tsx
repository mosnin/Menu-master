'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { GitBranch, Play, ArrowRight } from 'lucide-react';

const cards = [
  {
    title: 'Workflows',
    description: 'Design and manage automation workflows for your brokerage operations.',
    href: '/ops/workflows',
    icon: GitBranch,
  },
  {
    title: 'Workflow Runs',
    description: 'Monitor active and completed workflow executions in real time.',
    href: '/ops/workflow-runs',
    icon: Play,
  },
];

export default function OpsPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Operations"
        description="Workflow automation and execution monitoring for your brokerage."
      />

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
          Manage
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-150 cursor-pointer">
                <CardContent className="p-7">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.07]">
                        <card.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="text-[15px] font-semibold tracking-[-0.01em]">{card.title}</h4>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 mt-1" />
                  </div>
                  <p className="text-[13px] text-muted-foreground/70 leading-relaxed">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
