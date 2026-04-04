import { auth0, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import * as membershipRepo from '@/lib/repositories/memberships';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Copy, Activity, RefreshCw, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  try {
    const profile = await getCurrentUserProfile();
    if (profile) {
      const memberships = await membershipRepo.findByUserId(profile.id);
      if (memberships.length > 0) {
        await requireRole(memberships[0].organization_id, ['broker_admin']);
      }
    }
  } catch {
    redirect('/dashboard');
  }

  const tools = [
    {
      title: 'CSV Import',
      description: 'Import contacts, transactions, or properties from CSV files with field mapping and duplicate detection.',
      icon: Upload,
      href: '/admin/imports',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Duplicate Detection',
      description: 'Find and resolve potential duplicate contacts and transactions across your organization.',
      icon: Copy,
      href: '/admin/duplicates',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Diagnostics',
      description: 'View system health, processing status, extraction metrics, and data integrity checks.',
      icon: Activity,
      href: '/admin/diagnostics',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        title="Admin Tools"
        description="Import data, detect duplicates, monitor system health, and manage recompute jobs."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer h-full">
              <CardHeader className="pb-3 p-7">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tool.bg}`}>
                    <tool.icon className={`h-5 w-5 ${tool.color}`} />
                  </div>
                  <CardTitle className="text-base font-semibold tracking-tight">{tool.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-7 pb-7 pt-0">
                <CardDescription className="text-[13px] leading-relaxed">{tool.description}</CardDescription>
                <div className="flex items-center gap-1.5 mt-4 text-[12px] font-medium text-primary">
                  Open
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
