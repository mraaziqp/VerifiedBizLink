import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const STAFF_ROLES = ['admin', 'banker', 'lawyer'];

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/terms',
  '/privacy',
  '/contact',
  '/explore',
  '/pricing',
  '/legal',
];

// Prefixes that are always public (API auth routes, static assets, etc.)
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/setup',
  '/api/chat',
  '/api/explore/',
  '/_next/',
  '/favicon',
];

export async function middleware(request: NextRequest) {
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

  // Admin area is staff-only: verify the JWT and check the role claim here so
  // non-staff users never reach the admin UI (API routes also check server-side)
  if (pathname.startsWith('/admin')) {
    try {
      const { payload } = await jwtVerify(session.value, JWT_SECRET);
      if (!STAFF_ROLES.includes((payload as { role?: string }).role ?? '')) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
