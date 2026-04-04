'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface PolicyRuleToggleProps {
  ruleId: string;
  isActive: boolean;
}

export function PolicyRuleToggle({ ruleId, isActive }: PolicyRuleToggleProps) {
  const [checked, setChecked] = useState(isActive);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  async function handleToggle(newValue: boolean) {
    setChecked(newValue);
    setIsPending(true);
    try {
      const res = await fetch('/api/policy-rules/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, isActive: newValue }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      toast({
        title: newValue ? 'Policy enabled' : 'Policy disabled',
        description: `The policy rule has been ${newValue ? 'activated' : 'deactivated'}.`,
      });
    } catch {
      setChecked(!newValue);
      toast({
        title: 'Failed to update policy',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Switch
      checked={checked}
      onCheckedChange={handleToggle}
      disabled={isPending}
      className="shrink-0"
    />
  );
}
