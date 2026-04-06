'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  Rocket,
  Sparkles,
  FileText,
  LayoutDashboard,
  Users,
  Check,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getOnboardingStateAction,
  updateProfileAction,
  setupWorkspaceAction,
  advanceOnboardingAction,
  completeOnboardingAction,
  skipOnboardingAction,
  checkInvitesAction,
  acceptInviteAction,
} from '@/app/actions/onboarding-actions';
import type { UserProfile, TeamInvite } from '@/types';

const STEPS = [
  { key: 'welcome', label: 'Welcome', icon: Sparkles },
  { key: 'profile', label: 'Your Profile', icon: User },
  { key: 'workspace', label: 'Workspace', icon: Building2 },
  { key: 'get_started', label: 'Get Started', icon: Rocket },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingInvites, setPendingInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile step state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Workspace step state
  const [workspaceAction, setWorkspaceAction] = useState<'create' | 'join'>('create');
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinedOrgName, setJoinedOrgName] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    try {
      const [state, invites] = await Promise.all([
        getOnboardingStateAction(),
        checkInvitesAction(),
      ]);
      if (state) {
        setProfile(state);
        setFullName(state.full_name || '');
        setPhone(state.phone || '');
        if (state.onboarding_status === 'completed' || state.onboarding_status === 'skipped') {
          router.replace('/dashboard');
          return;
        }
        if (state.onboarding_status === 'in_progress') {
          setCurrentStep(state.onboarding_step);
        }
      }
      setPendingInvites(invites);
    } catch {
      // Best effort
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  async function goToStep(step: number) {
    setError(null);
    setSubmitting(true);
    try {
      await advanceOnboardingAction(step);
      setCurrentStep(step);
    } catch {
      // best effort
      setCurrentStep(step);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    setSubmitting(true);
    try {
      await skipOnboardingAction();
      router.replace('/dashboard');
    } catch {
      router.replace('/dashboard');
    }
  }

  async function handleAcceptInvite(token: string) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await acceptInviteAction(token);
      setJoinedOrgName(result.organization_name);
      setPendingInvites((prev) => prev.filter((i) => i.invite_token !== token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProfileContinue() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateProfileAction({
        full_name: fullName,
        phone: phone || undefined,
      });
      setProfile(updated);
      goToStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWorkspaceContinue() {
    if (joinedOrgName) {
      goToStep(3);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await setupWorkspaceAction(
        workspaceAction === 'create'
          ? { action: 'create', org_name: orgName }
          : { action: 'join', invite_token: inviteCode },
      );
      setJoinedOrgName(result.organization_name);
      goToStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set up workspace');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    try {
      await completeOnboardingAction();
      router.replace('/dashboard');
    } catch {
      router.replace('/dashboard');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      {/* Step indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;
            return (
              <div key={step.key} className="flex items-center">
                {index > 0 && (
                  <div
                    className={cn(
                      'mx-1 h-px w-8 sm:w-12',
                      isComplete ? 'bg-primary' : 'bg-muted-foreground/20',
                    )}
                  />
                )}
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                    isActive && 'bg-primary text-primary-foreground shadow-sm',
                    isComplete && 'bg-primary/10 text-primary',
                    !isActive && !isComplete && 'text-muted-foreground',
                  )}
                >
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skip button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleSkip}
          disabled={submitting}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Step 0: Welcome */}
      {currentStep === 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome to Chippi</h1>
            <p className="mt-3 text-muted-foreground">
              Hi {profile?.full_name?.split(' ')[0] || 'there'}, let&apos;s set up your workspace
              in just a few steps.
            </p>

            {pendingInvites.length > 0 && (
              <div className="mt-8 space-y-3 text-left">
                <p className="text-sm font-medium text-muted-foreground">
                  You have pending team invitations:
                </p>
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-xl border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Team invitation</p>
                        <p className="text-xs text-muted-foreground">
                          Role: {invite.role.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleAcceptInvite(invite.invite_token)}
                      disabled={submitting}
                    >
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {joinedOrgName && (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                You joined {joinedOrgName}!
              </div>
            )}

            <Button
              className="mt-8 rounded-xl px-8"
              onClick={() => goToStep(1)}
              disabled={submitting}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Profile */}
      {currentStep === 1 && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Your Profile</h2>
                <p className="text-sm text-muted-foreground">Tell us a bit about yourself.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                className="rounded-xl"
                onClick={() => goToStep(0)}
                disabled={submitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="rounded-xl px-8"
                onClick={handleProfileContinue}
                disabled={submitting || !fullName.trim()}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Workspace */}
      {currentStep === 2 && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Workspace</h2>
                <p className="text-sm text-muted-foreground">
                  Set up or join your team workspace.
                </p>
              </div>
            </div>

            {joinedOrgName ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center dark:border-green-800 dark:bg-green-950/30">
                  <Check className="mx-auto mb-2 h-8 w-8 text-green-600" />
                  <p className="font-medium text-green-700 dark:text-green-400">
                    You&apos;re already part of {joinedOrgName}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Toggle */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setWorkspaceAction('create')}
                    className={cn(
                      'rounded-xl border-2 p-4 text-left transition-all',
                      workspaceAction === 'create'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30',
                    )}
                  >
                    <Building2 className="mb-2 h-5 w-5 text-primary" />
                    <p className="text-sm font-medium">Create a new workspace</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Start fresh for your team
                    </p>
                  </button>
                  <button
                    onClick={() => setWorkspaceAction('join')}
                    className={cn(
                      'rounded-xl border-2 p-4 text-left transition-all',
                      workspaceAction === 'join'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30',
                    )}
                  >
                    <Users className="mb-2 h-5 w-5 text-primary" />
                    <p className="text-sm font-medium">Join an existing workspace</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Enter an invite code
                    </p>
                  </button>
                </div>

                {/* Create form */}
                {workspaceAction === 'create' && (
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization name</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Acme Realty Group"
                      className="rounded-xl"
                    />
                  </div>
                )}

                {/* Join form */}
                {workspaceAction === 'join' && (
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Invite code</Label>
                    <Input
                      id="inviteCode"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Paste your invite code here"
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                className="rounded-xl"
                onClick={() => goToStep(1)}
                disabled={submitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="rounded-xl px-8"
                onClick={handleWorkspaceContinue}
                disabled={
                  submitting ||
                  (!joinedOrgName &&
                    ((workspaceAction === 'create' && !orgName.trim()) ||
                      (workspaceAction === 'join' && !inviteCode.trim())))
                }
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Get Started */}
      {currentStep === 3 && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-950/40">
              <Rocket className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">You&apos;re all set!</h2>
            <p className="mt-3 text-muted-foreground">
              Your workspace is ready. Here are some things to try first.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <button
                onClick={() => {
                  completeOnboardingAction().then(() => router.push('/transactions/new'));
                }}
                className="group rounded-2xl border p-5 text-left transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <FileText className="mb-3 h-6 w-6 text-primary transition-transform group-hover:scale-110" />
                <p className="text-sm font-medium">Create your first transaction</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start managing a real estate deal
                </p>
              </button>
              <button
                onClick={() => {
                  completeOnboardingAction().then(() => router.push('/dashboard'));
                }}
                className="group rounded-2xl border p-5 text-left transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <LayoutDashboard className="mb-3 h-6 w-6 text-primary transition-transform group-hover:scale-110" />
                <p className="text-sm font-medium">Explore the dashboard</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  See your workspace overview
                </p>
              </button>
              <button
                onClick={() => {
                  completeOnboardingAction().then(() => router.push('/settings'));
                }}
                className="group rounded-2xl border p-5 text-left transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <Users className="mb-3 h-6 w-6 text-primary transition-transform group-hover:scale-110" />
                <p className="text-sm font-medium">Invite your team</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bring colleagues on board
                </p>
              </button>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                className="rounded-xl"
                onClick={() => goToStep(2)}
                disabled={submitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="rounded-xl px-8"
                onClick={handleComplete}
                disabled={submitting}
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
