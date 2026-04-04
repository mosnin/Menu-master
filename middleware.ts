import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth0 v4 handles /auth/login, /auth/callback, /auth/logout automatically
  const authResponse = await auth0.middleware(request);

  // If Auth0 handled the request (login/callback/logout routes), return its response
  if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/callback') || pathname.startsWith('/auth/logout')) {
    return authResponse;
  }

  // Public paths that never need auth
  const publicPaths = ['/signin', '/signup', '/auth', '/api/inngest', '/invite'];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Forward pathname via header so server components can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // For the root path, let the page component handle auth check
  if (pathname === '/') {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
