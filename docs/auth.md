# Authentication Reference

## Stack

- **Auth0 v4** (`@auth0/nextjs-auth0`)
- Next.js App Router with **Node.js middleware** (not Edge)

## Critical: Node.js Runtime Requirement

Auth0 v4 uses Node.js-only APIs (`crypto`, `CompressionStream`). This means:

1. `middleware.ts` must have `export const runtime = 'nodejs'`
2. `next.config.ts` must have `experimental.nodeMiddleware = true`
3. Never import `lib/auth/session.ts` in Edge Runtime code

## Routes

Auth0 handles these routes automatically via `app/auth/[...auth0]/route.ts`:

| Route | Purpose |
|---|---|
| `/auth/login` | Redirect to Auth0 Universal Login |
| `/auth/callback` | Auth0 callback — **must be registered in Auth0 Dashboard** |
| `/auth/logout` | Clear session and redirect |

### Auth0 Dashboard Configuration

Required Allowed Callback URL: `https://<your-domain>/auth/callback`  
(NOT `/api/auth/callback` — that's Auth0 v3)

For local dev add: `http://localhost:3000/auth/callback`

## Session Helpers (`lib/auth/session.ts`)

```typescript
// Get session (null if not authenticated)
const session = await getServerSession();

// Throw if not authenticated
const session = await requireAuth();

// Check org membership
const { session, profile, membership } = await requireOrgMembership(orgId);

// Check role
const { session, profile, membership } = await requireRole(orgId, ['broker_admin', 'coordinator']);

// Get active org from cookie
const orgId = await getActiveOrgId();

// Get full user profile with memberships
const profile = await getCurrentUserProfile();
```

## Middleware (`middleware.ts`)

```typescript
export const runtime = 'nodejs'; // Required — Auth0 v4 needs Node.js

export async function middleware(request: NextRequest) {
  const authResponse = await auth0.middleware(request);

  // Let Auth0 handle its own routes
  if (pathname.startsWith('/auth/login') || ...) return authResponse;

  // Public paths skip auth
  const publicPaths = ['/signin', '/signup', '/auth', '/api/inngest', '/invite'];
  if (publicPaths.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Pass pathname header for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
```

## Protected Layout

`app/(authenticated)/layout.tsx` enforces authentication and loads the user profile for the sidebar/header. Pages under `(authenticated)/` are protected.

## Invitation Flow

`/invite` is a public path. It accepts an invite token and creates a membership after the user authenticates.
