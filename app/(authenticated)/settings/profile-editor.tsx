'use client';

import { useState, useTransition } from 'react';
import { updateProfileAction } from '@/app/actions/profile-actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import type { UserProfile } from '@/types';

interface ProfileEditorProps {
  profile: UserProfile;
}

export function ProfileEditor({ profile }: ProfileEditorProps) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = fullName !== profile.full_name || phone !== (profile.phone ?? '');

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateProfileAction({
          full_name: fullName,
          phone: phone || undefined,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save');
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-5">
        {/* Avatar placeholder */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-muted text-lg font-semibold text-muted-foreground">
          {fullName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)}
        </div>
        <div className="flex-1 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Full Name
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-xl"
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Email
            </label>
            <Input
              value={profile.email}
              disabled
              className="rounded-xl bg-muted/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Phone
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="rounded-xl"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Saved
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">Profile updated successfully</span>
        )}
      </div>
    </div>
  );
}
