import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertCircle } from 'lucide-react';

function getErrorMessage(error: string | undefined): string {
  switch (error) {
    case 'access_denied':
      return 'Access was denied. You may not have permission to sign in.';
    case 'login_required':
      return 'Your session has expired. Please sign in again.';
    default:
      return 'Something went wrong during authentication.';
  }
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = getErrorMessage(params.error);

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
            {/* Error icon & heading */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Authentication error
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {errorMessage}
              </p>
              {params.error_description && (
                <p className="mt-2 text-xs text-muted-foreground/60">
                  {params.error_description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                asChild
                className="w-full h-12 rounded-xl text-base font-medium"
                size="lg"
              >
                <a href="/signin">Try again</a>
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
