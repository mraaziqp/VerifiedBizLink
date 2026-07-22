import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { resolveMx } from 'dns/promises';
import { createTrackedSession, sessionCookieOptions, hashOneTimeToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendVerificationEmail } from '@/lib/email';
import db from '@/lib/db';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Well-known disposable/temporary email providers — block these outright
// rather than letting a throwaway inbox complete signup.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'yopmail.com', 'trashmail.com', 'throwawaymail.com',
  'getnada.com', 'maildrop.cc', 'fakeinbox.com', 'sharklasers.com', 'dispostable.com',
]);

// A slow/unresponsive DNS resolver shouldn't be able to hang signup
// indefinitely — fail open (allow) rather than block real users on a
// network hiccup that has nothing to do with whether their email is real.
const MX_LOOKUP_TIMEOUT_MS = 3000;

async function isRegistrableEmailDomain(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return false;
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('MX lookup timed out')), MX_LOOKUP_TIMEOUT_MS)
      ),
    ]);
    return records.length > 0;
  } catch (err) {
    // Genuine "no such domain" errors (ENOTFOUND/ENODATA) mean the domain
    // really can't receive mail — reject those. A timeout or any other
    // transient DNS failure shouldn't block a real signup, so allow it.
    const code = (err as { code?: string })?.code;
    if (code === 'ENOTFOUND' || code === 'ENODATA') return false;
    return true;
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`signup:${ip}`, 5, 900);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many signup attempts. Try again in ${rl.retryAfterSecs} seconds.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSecs) } },
    );
  }

  try {
    const { email, password, fullName, dateOfBirth, role, companyName, regNumber, website, socialLinks } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_FORMAT.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    if (!(await isRegistrableEmailDomain(normalizedEmail))) {
      return NextResponse.json(
        { error: "We couldn't verify that email domain accepts mail. Please use a real, permanent email address." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    if (role !== 'customer' && role !== 'business') {
      return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });
    }

    const existing = await db`SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const verificationToken = crypto.randomUUID();
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    let userRole = 'user';
    let headline = 'Professional';
    if (role === 'business') { userRole = 'business'; headline = `Owner at ${companyName || 'Company'}`; }

    const newUsers = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, email_verification_token, email_verification_token_expires_at, date_of_birth)
      VALUES (
        ${normalizedEmail},
        ${passwordHash},
        ${fullName},
        ${userRole},
        ${headline},
        ${''},
        ${hashOneTimeToken(verificationToken)},
        ${verificationTokenExpiresAt.toISOString()},
        ${dateOfBirth || null}
      )
      RETURNING id, email, full_name, role, avatar_url, headline, email_verified, date_of_birth
    `;
    const user = newUsers[0];

    if (role === 'business' && companyName) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);
      await db`
        INSERT INTO businesses (user_id, name, company_name, reg_number, website, social_links, status, package_type, trial_package, trial_ends_at)
        VALUES (
          ${user.id},
          ${companyName},
          ${companyName},
          ${regNumber || ''},
          ${website || ''},
          ${JSON.stringify(socialLinks || {})},
          'unregistered',
          'free',
          'premium_half',
          ${trialEndsAt.toISOString()}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    // Send verification email (non-blocking — don't fail signup if email fails,
    // but do log it so a broken Resend key/domain doesn't fail silently)
    sendVerificationEmail(user.email, user.full_name, verificationToken).catch((err) => {
      console.error('Signup verification email failed for', user.email, err);
    });

    const sessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatarUrl: '',
      headline: user.headline || '',
      emailVerified: user.email_verified ?? false,
    };

    const token = await createTrackedSession(sessionUser, request);
    const response = NextResponse.json({ user: sessionUser, success: true });
    response.cookies.set('vbl_session', token, sessionCookieOptions(request.headers.get('host')));
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Signup error:', errorMsg);
    if (errorStack) console.error('Stack:', errorStack);
    return NextResponse.json({ error: 'Internal server error', detail: errorMsg }, { status: 500 });
  }
}
