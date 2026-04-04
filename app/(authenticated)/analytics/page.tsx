import { auth0 } from '@/lib/auth/session';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsOverview } from '@/components/analytics/analytics-overview';
import { ActivationFunnel } from '@/components/analytics/activation-funnel';
import { CorrectionHotspots } from '@/components/analytics/correction-hotspots';
import { QueueAging } from '@/components/analytics/queue-aging';
import { RecommendationPerformance } from '@/components/analytics/recommendation-performance';
import { FeedbackView } from '@/components/analytics/feedback-view';
import { PageHeader } from '@/components/ui/page-header';

export default async function AnalyticsPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/dashboard');

  const membership = (profile as any).memberships?.[0];
  if (!membership || membership.role !== 'broker_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Product usage, activation, and engagement metrics."
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activation">Activation</TabsTrigger>
          <TabsTrigger value="corrections">Corrections</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AnalyticsOverview />
        </TabsContent>

        <TabsContent value="activation">
          <ActivationFunnel />
        </TabsContent>

        <TabsContent value="corrections">
          <CorrectionHotspots />
        </TabsContent>

        <TabsContent value="queue">
          <QueueAging />
        </TabsContent>

        <TabsContent value="approvals">
          <QueueAging />
        </TabsContent>

        <TabsContent value="recommendations">
          <RecommendationPerformance />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
