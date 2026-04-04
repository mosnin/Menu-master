'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { inviteCollaboratorAction } from '@/app/actions/collaborator-actions';
import { Loader2, Send } from 'lucide-react';

interface InviteCollaboratorFormProps {
  transactionId: string;
}

const roles = [
  { value: 'lender', label: 'Lender' },
  { value: 'title_agent', label: 'Title Agent' },
  { value: 'escrow_officer', label: 'Escrow Officer' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'other', label: 'Other' },
];

const permissionOptions = [
  { key: 'view_documents', label: 'View Documents' },
  { key: 'upload_documents', label: 'Upload Documents' },
  { key: 'view_checklist', label: 'View Checklist' },
  { key: 'update_status', label: 'Update Status' },
];

export function InviteCollaboratorForm({ transactionId }: InviteCollaboratorFormProps) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    view_documents: true,
    upload_documents: false,
    view_checklist: true,
    update_status: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleToggle(key: string) {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !fullName || !role) {
      setError('Please fill in all required fields.');
      return;
    }

    const activePermissions = Object.entries(permissions)
      .filter(([, v]) => v)
      .map(([k]) => k);

    startTransition(async () => {
      const result = await inviteCollaboratorAction(
        transactionId,
        email,
        fullName,
        role,
        activePermissions,
      );

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setEmail('');
        setFullName('');
        setRole('');
        setPermissions({
          view_documents: true,
          upload_documents: false,
          view_checklist: true,
          update_status: false,
        });
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="invite-email" className="text-xs font-medium">
          Email
        </Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-name" className="text-xs font-medium">
          Full Name
        </Label>
        <Input
          id="invite-name"
          type="text"
          placeholder="Jane Smith"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-lg"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-role" className="text-xs font-medium">
          Role
        </Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="rounded-lg">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-medium">Permissions</Label>
        {permissionOptions.map((perm) => (
          <div key={perm.key} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{perm.label}</span>
            <Switch
              checked={permissions[perm.key] ?? false}
              onCheckedChange={() => handleToggle(perm.key)}
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 leading-relaxed">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-600 leading-relaxed">
          Invitation sent successfully.
        </p>
      )}

      <Button
        type="submit"
        className="w-full rounded-lg"
        size="sm"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Send Invite
      </Button>
    </form>
  );
}
