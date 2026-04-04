'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { toggleRuleAction } from '@/app/actions/org-config-actions';
import { useToast } from '@/hooks/use-toast';

interface RuleToggleProps {
  ruleId: string;
  isActive: boolean;
}

export function RuleToggle({ ruleId, isActive }: RuleToggleProps) {
  const [checked, setChecked] = useState(isActive);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  async function handleToggle(newValue: boolean) {
    setChecked(newValue);
    setIsPending(true);
    try {
      await toggleRuleAction(ruleId, newValue);
      toast({
        title: newValue ? 'Rule enabled' : 'Rule disabled',
        description: `The rule has been ${newValue ? 'activated' : 'deactivated'}.`,
      });
    } catch {
      setChecked(!newValue);
      toast({
        title: 'Failed to update rule',
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
