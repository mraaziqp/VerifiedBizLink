import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose/jwt/verify';
import { REQUIRE_EMAIL_VERIFICATION } from '@/lib/feature-flags';
import { STAFF_ROLES, AGENT_PORTAL_ROLES, ROLES } from '@/lib/roles';

// Lazy, like lib/auth's copy. Encoding at module scope with the variable
// unset silently produced a key from the literal string "undefined", which
// would verify nothing correctly while looking fine.
let cachedJwtSecret: Uint8Array | null = null;

function jwtSecret(): Uint8Array {
  if (!cachedJwtSecret) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
    cachedJwtSecret = new TextEncoder().encode(secret);
  }
  return cachedJwtSecret;
}

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
  // Typing a certificate number in by hand. The QR route below covers scans.
  '/verify',
];

// Prefixes that are always public (API auth routes, static assets, etc.)
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/setup',
  '/api/chat',
  '/api/contact', // the /contact page is public — the route itself handles anonymous submitters (userId is nullable)
  '/api/explore/',
  '/api/ads', // AdBanner renders on every page, including public ones for anonymous visitors
  '/api/payfast/notify', // PayFast's server calls this webhook directly — it has no user session cookie
  // Scheduled jobs are called by EventBridge (or Vercel Cron), which carry a
  // Bearer token and no session cookie. Without this the middleware answered
  // them with a 307 to /login, so the scheduler saw a "successful" redirect
  // and the billing sweep and abandoned-signup nudge never actually ran.
  // The routes authenticate themselves against CRON_SECRET and refuse to run
  // at all when it is unset, so they are not open by being listed here.
  '/api/cron/',
  // A hired marketer opens their invite link before they have an account, so
  // both the page and the endpoint behind it must be reachable logged out.
  // The token is the credential, and only its hash is stored.
  '/agent-invite/',
  '/api/auth/agent-invite',
  '/api/referral', // signup page resolves ?ref= codes before anyone signs in
  // Certificate checks. A certificate is handed to strangers deciding whether
  // to trust a business — if only account holders could check one, the
  // document would prove nothing to the people it exists to reassure.
  // The trailing slash matters: '/verify' alone would also swallow
  // '/verify-email', which is a different flow with its own rules.
  '/verify/',
  '/api/verify/',
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
// Choosing a package, and uploading/submitting vetting documents, are part
// of finishing verification itself, not the content creation the gate is
// meant to guard — an unverified business account can now reach the Vetting
// Hub page (see UNVERIFIED_ALLOWED_PREFIXES below), so it must also be able
// to actually use it, or letting the page through would be pointless.
const VERIFICATION_EXEMPT_PATHS = [
  '/api/businesses/packages',
  '/api/businesses/documents',
  '/api/businesses/submit',
  // Crediting the advisor who helped you is part of finishing signup, not
  // content creation. An unverified account can already reach /business/verify
  // and start a R49 payment, so gating only the referral code meant the one
  // path that loses an advisor their commission was the one left blocked.
  '/api/businesses/referral',
];
// A verified business's public trust profile (page + the API it reads from)
// must be viewable without an account — that's the whole point of showing
// a trust score to prospective customers. Owner-management routes like
// /business/dashboard, /business/posts, etc. are plain words, not UUIDs,
// so this only opens the read-only profile paths.
const PUBLIC_BUSINESS_PROFILE = new RegExp(`^/business/${UUID}$`, 'i');
const PUBLIC_BUSINESS_API = new RegExp(`^/api/businesses/${UUID}(/reviews(/${UUID}/helpful)?|/gallery|/view)?$`, 'i');

// Pages an unverified account can still reach — everything needed to finish
// verifying (settings to resend/manage the account, onboarding, and the
// Vetting Hub to actually submit business documents) without being able to
// wander into the rest of the app and publish anything. Staff are exempt
// (provisioned directly, not through the public signup+verify flow).
const UNVERIFIED_ALLOWED_PREFIXES = ['/settings', '/onboarding', '/vetting', '/business/verify'];

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

  // Decode once and reuse below — every check past this point needs the
  // role/emailVerified claims, and an invalid/expired token means the same
  // thing everywhere: back to login.
  let claims: { role?: string; emailVerified?: boolean };
  try {
    const { payload } = await jwtVerify(session.value, jwtSecret());
    claims = payload as { role?: string; emailVerified?: boolean };
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
  const isStaffUser = STAFF_ROLES.includes(claims.role ?? '');

  // Admin area is staff-only so non-staff users never reach the admin UI
  // (API routes also check server-side).
  if (pathname.startsWith('/admin') && !isStaffUser) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // The sales agent portal is isolated in both directions.
  //
  // Outward: `sales_agent` is not in STAFF_ROLES, so the /admin check above
  // already denies it — agents have zero access to admin features, and any
  // attempt lands them back in their own portal rather than the public feed.
  //
  // Inward: only agents (and admins, for oversight) can open /agent at all.
  const role = claims.role ?? '';
  const isSalesAgent = role === ROLES.SALES_AGENT;

  if (pathname.startsWith('/agent') && !AGENT_PORTAL_ROLES.includes(role)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // An agent landing anywhere in the admin area goes to their portal, not the
  // consumer home page — /agent is their home.
  if (isSalesAgent && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/agent', request.url));
  }

  // An unverified account can browse Settings, Onboarding, and the Vetting
  // Hub — everything needed to finish verifying — but nowhere else in the
  // app, so they can't publish a post, message anyone, or build out a
  // business profile before proving they own the email on file. Page
  // navigation only; the public paths/API prefixes above are unaffected.
  if (
    REQUIRE_EMAIL_VERIFICATION &&
    !isStaffUser &&
    !claims.emailVerified &&
    !pathname.startsWith('/api') &&
    !UNVERIFIED_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.redirect(new URL('/settings', request.url));
  }

  // Lock creation/write actions behind email verification. Staff accounts
  // are provisioned directly (not through the public signup flow) and are
  // exempt. Reads are never gated — only mutating requests.
  if (
    REQUIRE_EMAIL_VERIFICATION &&
    MUTATING_METHODS.includes(request.method) &&
    VERIFIED_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !VERIFICATION_EXEMPT.test(pathname) &&
    !VERIFICATION_EXEMPT_PATHS.includes(pathname) &&
    !isStaffUser &&
    !claims.emailVerified
  ) {
    return NextResponse.json(
      { error: 'Please verify your email address to unlock this feature.' },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
