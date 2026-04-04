'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Clock,
  Globe,
  AlertTriangle,
  Calendar,
  CheckSquare,
  MessageSquare,
  Timer,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateDigestPreferencesAction } from '@/app/actions/digest-actions';

export interface DigestPreferences {
  enabled: boolean;
  delivery_hour: number;
  timezone: string;
  include_health_risks: boolean;
  include_deadlines: boolean;
  include_pending_approvals: boolean;
  include_stale_responses: boolean;
  include_closing_soon: boolean;
}

const DELIVERY_HOURS = [
  { value: 6, label: '6:00 AM' },
  { value: 7, label: '7:00 AM' },
  { value: 8, label: '8:00 AM' },
  { value: 9, label: '9:00 AM' },
  { value: 10, label: '10:00 AM' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
];

const CONTENT_TOGGLES = [
  {
    key: 'include_health_risks' as const,
    label: 'Health Risks',
    description: 'Transactions with declining health scores',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
  },
  {
    key: 'include_deadlines' as const,
    label: 'Upcoming Deadlines',
    description: 'Contingency and closing deadlines approaching',
    icon: Calendar,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
  },
  {
    key: 'include_pending_approvals' as const,
    label: 'Pending Approvals',
    description: 'Items awaiting your review or sign-off',
    icon: CheckSquare,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    key: 'include_stale_responses' as const,
    label: 'Stale Responses',
    description: 'Outbound messages without replies',
    icon: MessageSquare,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
  },
  {
    key: 'include_closing_soon' as const,
    label: 'Closing Soon',
    description: 'Transactions closing in the next 7 days',
    icon: Timer,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
  },
];

interface DigestSettingsFormProps {
  initialPreferences: DigestPreferences;
}

export function DigestSettingsForm({ initialPreferences }: DigestSettingsFormProps) {
  const [prefs, setPrefs] = useState<DigestPreferences>(initialPreferences);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof DigestPreferences>(key: K, value: DigestPreferences[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateDigestPreferencesAction(
        prefs.enabled,
        prefs.delivery_hour,
        prefs.timezone,
        prefs.include_deadlines,
        prefs.include_health_risks,
        prefs.include_pending_approvals,
        prefs.include_stale_responses,
        prefs.include_closing_soon,
      );
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Digest Enable/Disable */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Daily Digest
          </CardTitle>
          <CardDescription>
            Receive a daily summary of your transaction portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable daily digest</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get a morning briefing delivered to your inbox
              </p>
            </div>
            <Switch
              checked={prefs.enabled}
              onCheckedChange={(checked) => updateField('enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Schedule */}
      <Card className={cn('rounded-xl shadow-sm transition-opacity duration-200', !prefs.enabled && 'opacity-50 pointer-events-none')}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Delivery Schedule
          </CardTitle>
          <CardDescription>When to receive your daily digest</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Delivery Time
            </Label>
            <select
              value={prefs.delivery_hour}
              onChange={(e) => updateField('delivery_hour', Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow duration-150"
            >
              {DELIVERY_HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3 w-3" />
              Timezone
            </Label>
            <select
              value={prefs.timezone}
              onChange={(e) => updateField('timezone', e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow duration-150"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Content Preferences */}
      <Card className={cn('rounded-xl shadow-sm transition-opacity duration-200', !prefs.enabled && 'opacity-50 pointer-events-none')}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            Content
          </CardTitle>
          <CardDescription>Choose what to include in your digest</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CONTENT_TOGGLES.map((toggle, i) => (
            <div key={toggle.key}>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3.5">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', toggle.bgColor)}>
                    <toggle.icon className={cn('h-4 w-4', toggle.iconColor)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{toggle.label}</p>
                    <p className="text-xs text-muted-foreground">{toggle.description}</p>
                  </div>
                </div>
                <Switch
                  checked={prefs[toggle.key]}
                  onCheckedChange={(checked) => updateField(toggle.key, checked)}
                />
              </div>
              {i < CONTENT_TOGGLES.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-xl px-6 shadow-sm"
        >
          {isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </div>
        )}
      </div>
    </div>
  );
}
