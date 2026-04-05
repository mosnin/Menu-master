export type AutomationStatusTone = 'default' | 'secondary' | 'outline' | 'destructive';

const toneMap: Record<string, AutomationStatusTone> = {
  draft: 'secondary',
  validated: 'secondary',
  simulated: 'secondary',
  ready_for_review: 'outline',
  approved_for_release: 'outline',
  released: 'default',
  staged: 'outline',
  paused: 'secondary',
  rolled_back: 'destructive',
  blocked: 'destructive',
  degraded: 'destructive',
  incident: 'destructive',
  attested: 'default',
  low_value: 'secondary',
  high_risk: 'destructive',
};

export function toStatusTone(status: string): AutomationStatusTone {
  return toneMap[status] ?? 'outline';
}

export function toStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
