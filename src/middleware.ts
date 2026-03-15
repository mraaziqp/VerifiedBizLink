import { NextRequest, NextResponse } from 'next/server';

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/terms',
  '/privacy',
  '/contact',
];

// Prefixes that are always public (API auth routes, static assets, etc.)
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/setup',
  '/_next/',
  '/favicon',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get('vbl_session');

  if (!session?.value) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the originally requested URL so we can redirect back after login
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
