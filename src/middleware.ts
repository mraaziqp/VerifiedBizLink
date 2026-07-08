import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose/jwt/verify';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const STAFF_ROLES = ['admin', 'banker', 'lawyer'];

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
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

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
// A verified business's public trust profile (page + the API it reads from)
// must be viewable without an account — that's the whole point of showing
// a trust score to prospective customers. Owner-management routes like
// /business/dashboard, /business/posts, etc. are plain words, not UUIDs,
// so this only opens the read-only profile paths.
const PUBLIC_BUSINESS_PROFILE = new RegExp(`^/business/${UUID}$`, 'i');
const PUBLIC_BUSINESS_API = new RegExp(`^/api/businesses/${UUID}(/reviews(/${UUID}/helpful)?)?$`, 'i');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files (manifest.json, sw.js, icons, robots.txt, …) must be public:
  // the browser fetches the web-app manifest and service worker WITHOUT
  // cookies, so redirecting them to /login breaks PWA install and SEO.
  // App routes never contain a dot, so this only matches real files.
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }

  // Always allow public paths
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_BUSINESS_PROFILE.test(pathname) ||
    PUBLIC_BUSINESS_API.test(pathname)
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
