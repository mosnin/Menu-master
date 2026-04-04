import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
