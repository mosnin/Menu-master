import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, LogOut } from 'lucide-react';

export default function SignedOutPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <FileText className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-7">
            {/* Icon & heading */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                You&apos;ve been signed out
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Your session has been securely ended.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                asChild
                className="w-full h-12 rounded-xl text-base font-medium"
                size="lg"
              >
                <a href="/signin">Sign in again</a>
              </Button>

              <Button
                asChild
                variant="ghost"
                className="w-full h-10 rounded-xl text-sm"
              >
                <a href="/">Back to home</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
