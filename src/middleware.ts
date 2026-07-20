import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose/jwt/verify';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const STAFF_ROLES = ['admin', 'banker', 'lawyer'];

// Routes that do NOT require authentication. The home feed ('/') is
// deliberately NOT here — it requires login, unlike /explore, /pricing, and
// public business trust profiles below, which stay reachable pre-signup.
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-username',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/terms',
  '/privacy',
  '/refund-policy',
  '/contact',
  '/about',
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
  '/api/ads', // AdBanner renders on every page, including public ones for anonymous visitors
  '/api/payfast/notify', // PayFast's server calls this webhook directly — it has no user session cookie
  '/_next/',
  '/favicon',
];

// Read-only: public for GET, but still gated for mutations — falls through
// to the normal session/verification checks below for anything other than
// GET. The home feed itself ('/api/home/', '/api/posts') is deliberately
// NOT here — feed content requires login, same as the page.
const PUBLIC_GET_PREFIXES = [
  '/api/tiers', // pricing page must be readable by anonymous visitors deciding whether to sign up
  '/api/site-settings', // homepage hero image/opacity — still used by the public /explore page
];

// Mutating requests to these API prefixes are blocked until the account's
// email is verified — staff accounts (admin/banker/lawyer) are exempt since
// they're provisioned directly, not through the public signup+verify flow.
const VERIFIED_ONLY_PREFIXES = [
  '/api/posts',
  '/api/comments',
  '/api/messages',
  '/api/connections',
  '/api/business/',
  '/api/businesses',
  '/api/media/upload',
];
const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

// Liking and commenting are low-stakes social actions, not the kind of
// business-content creation the email-verification gate was meant to guard
// (that's still enforced on POST /api/posts itself, and on business/message/
// connection mutations). Gating them the same way as everything else under
// /api/posts left every unverified account — the majority of real users —
// unable to like or comment, with the request silently rejected client-side.
const VERIFICATION_EXEMPT = new RegExp(`^/api/posts/${UUID}/(like|comments)$`, 'i');
// A verified business's public trust profile (page + the API it reads from)
// must be viewable without an account — that's the whole point of showing
// a trust score to prospective customers. Owner-management routes like
// /business/dashboard, /business/posts, etc. are plain words, not UUIDs,
// so this only opens the read-only profile paths.
const PUBLIC_BUSINESS_PROFILE = new RegExp(`^/business/${UUID}$`, 'i');
const PUBLIC_BUSINESS_API = new RegExp(`^/api/businesses/${UUID}(/reviews(/${UUID}/helpful)?|/gallery|/view)?$`, 'i');

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

  // Read-only home feed/posts data — public for GET, still gated below for
  // any mutating method.
  if (request.method === 'GET' && PUBLIC_GET_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
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

  // Lock creation/write actions behind email verification. Staff accounts
  // are provisioned directly (not through the public signup flow) and are
  // exempt. Reads are never gated — only mutating requests.
  if (
    MUTATING_METHODS.includes(request.method) &&
    VERIFIED_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !VERIFICATION_EXEMPT.test(pathname)
  ) {
    try {
      const { payload } = await jwtVerify(session.value, JWT_SECRET);
      const claims = payload as { role?: string; emailVerified?: boolean };
      const isStaffUser = STAFF_ROLES.includes(claims.role ?? '');
      if (!isStaffUser && !claims.emailVerified) {
        return NextResponse.json(
          { error: 'Please verify your email address to unlock this feature.' },
          { status: 403 },
        );
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
