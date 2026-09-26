'use server';

import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import db from '@/lib/db';
import { createTrackedSession, getSession, hashOneTimeToken, sessionCookieOptions, type SessionUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendVerificationEmail, sendWithin, appUrlFromRequest } from '@/lib/email';
import { REQUIRE_EMAIL_VERIFICATION } from '@/lib/feature-flags';
import {
  EMAIL_FORMAT, MIN_PASSWORD_LENGTH, ensureUserTypeColumns, isRegistrableEmailDomain,
} from '@/lib/signup-guards';

/**
 * Quick signup for people who only want to shop, review or job-hunt.
 *
 * Asks for four things: first name, last name, email, password. It runs the
 * same checks as the full signup (rate limit, real mail domain, password
 * length) — a shorter form must not be a weaker door.
 *
 * "Bypassing the verification gate" means they can USE the app straight away
 * (browse, review, apply for jobs) while the confirmation email is on its
 * way. It does NOT mean the email is marked verified: that would let anyone
 * register as someone else's address and carry a verified flag. Posting,
 * messaging and business features still wait for the email to be confirmed.
 */

const BasicUserSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(100),
  lastName: z.string().trim().min(1, 'Enter your last name').max(100),
  email: z.string().trim().toLowerCase().regex(EMAIL_FORMAT, 'Enter a valid email address'),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`).max(200),
  userType: z.enum(['job_seeker', 'customer']).default('customer'),
});

export type RegisterBasicUserInput = z.input<typeof BasicUserSchema>;
export type RegisterBasicUserResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

/** A minimal Request-shaped object so the tracked-session helper can read IP and UA. */
async function requestLike(): Promise<{ headers: Headers }> {
  return { headers: new Headers(await headers()) };
}

export async function registerBasicUser(
  input: FormData | RegisterBasicUserInput,
): Promise<RegisterBasicUserResult> {
  const req = await requestLike();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  // Same bucket as /api/auth/signup, so the two doors share one limit.
  const rl = checkRateLimit(`signup:${ip}`, 5, 900);
  if (!rl.allowed) {
    return { success: false, error: `Too many signup attempts. Try again in ${rl.retryAfterSecs} seconds.` };
  }

  const raw = input instanceof FormData
    ? {
        firstName: String(input.get('firstName') ?? ''),
        lastName: String(input.get('lastName') ?? ''),
        email: String(input.get('email') ?? ''),
        password: String(input.get('password') ?? ''),
        userType: String(input.get('userType') || 'customer'),
      }
    : input;

  const parsed = BasicUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Check the form and try again.' };
  }
  const { firstName, lastName, email, password, userType } = parsed.data;

  if (!(await isRegistrableEmailDomain(email))) {
    return { success: false, error: "We couldn't verify that email domain accepts mail. Please use a real, permanent email address." };
  }

  try {
    const [existing] = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing) return { success: false, error: 'An account with this email already exists. Sign in instead.' };

    await ensureUserTypeColumns();

    const fullName = `${firstName} ${lastName}`;
    const headline = userType === 'job_seeker' ? 'Open to work' : 'Member';
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [user] = await db`
      INSERT INTO users (
        email, password_hash, full_name, first_name, last_name, role, user_type,
        requires_verification, headline, avatar_url,
        email_verification_token, email_verification_token_expires_at
      ) VALUES (
        ${email}, ${await hash(password, 12)}, ${fullName}, ${firstName}, ${lastName}, 'customer', ${userType},
        FALSE, ${headline}, '',
        ${hashOneTimeToken(verificationToken)}, ${expiresAt.toISOString()}
      )
      RETURNING id, email, full_name, role, headline
    `;

    // Sent, just not required before they can start.
    await sendWithin(sendVerificationEmail(user.email, user.full_name, verificationToken, appUrlFromRequest(req)))
      .catch((err) => console.error('Quick-signup verification email failed for', user.email, err));

    const sessionUser: SessionUser = {
      id: String(user.id),
      email: String(user.email),
      fullName: String(user.full_name),
      role: String(user.role),
      avatarUrl: '',
      headline: String(user.headline ?? ''),
      emailVerified: false,
      requiresVerification: false,
    };
    const token = await createTrackedSession(sessionUser, req as unknown as Request);
    (await cookies()).set('vbl_session', token, sessionCookieOptions(req.headers.get('host')));

    return { success: true, redirectTo: userType === 'job_seeker' ? '/talent/profile' : '/explore' };
  } catch (error) {
    console.error('registerBasicUser error:', error);
    return { success: false, error: 'We could not create your account. Please try again.' };
  }
}

const BusinessProfileSchema = z.object({
  companyName: z.string().trim().min(2, 'Enter your company name').max(255),
  industry: z.string().trim().min(1, 'Choose your business category').max(255),
  regNumber: z.string().trim().max(60).default(''),
  vatNumber: z.string().trim().max(60).default(''),
  description: z.string().trim().max(4000).default(''),
  website: z.string().trim().max(255).default(''),
  phone: z.string().trim().max(50).default(''),
  address: z.string().trim().max(500).default(''),
});

export type CreateBusinessState = { error?: string } | undefined;

/**
 * Creates the caller's business profile, then sends them straight to
 * /pricing to pick a plan. Used by /business/create (useActionState).
 *
 * redirect() is called OUTSIDE the try: it works by throwing, and catching
 * it would report a successful signup as a failure.
 */
export async function createBusinessProfile(
  _prev: CreateBusinessState,
  formData: FormData,
): Promise<CreateBusinessState> {
  const session = await getSession();
  if (!session) redirect('/login?from=/business/create');

  const isStaff = ['admin', 'banker', 'lawyer'].includes(session.role);
  // Same rule as the business API routes: a business profile is a public
  // trust claim, so it waits for a confirmed email address.
  if (REQUIRE_EMAIL_VERIFICATION && !session.emailVerified && !isStaff) {
    return { error: 'Please confirm your email address first — check your inbox for the link we sent you.' };
  }

  const field = (k: string) => String(formData.get(k) ?? '');
  const parsed = BusinessProfileSchema.safeParse({
    companyName: field('companyName'), industry: field('industry'), regNumber: field('regNumber'),
    vatNumber: field('vatNumber'), description: field('description'), website: field('website'),
    phone: field('phone'), address: field('address'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message || 'Check the form and try again.' };
  const d = parsed.data;

  try {
    const [existing] = await db`SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1`;
    if (existing) return { error: 'You already have a business profile. Edit it from your business dashboard.' };

    await db`
      INSERT INTO businesses (user_id, name, company_name, industry, reg_number, vat_number,
                              description, website, phone, address, status, package_type)
      VALUES (${session.id}, ${d.companyName}, ${d.companyName}, ${d.industry}, ${d.regNumber}, ${d.vatNumber},
              ${d.description}, ${d.website}, ${d.phone}, ${d.address}, 'unregistered', 'free')
    `;

    await ensureUserTypeColumns();
    // Staff keep their staff role; everyone else becomes a business owner.
    const newRole = isStaff ? session.role : 'business';
    await db`
      UPDATE users SET role = ${newRole}, user_type = 'business', requires_verification = TRUE,
                       headline = COALESCE(NULLIF(headline, ''), ${`Owner at ${d.companyName}`}), updated_at = NOW()
      WHERE id = ${session.id}
    `;

    // Re-issue the session: API routes read the role from the token, so the
    // old "customer" token would keep business features locked until logout.
    if (newRole !== session.role) {
      const req = await requestLike();
      const token = await createTrackedSession(
        { ...session, role: newRole, requiresVerification: undefined, sid: undefined },
        req as unknown as Request,
      );
      (await cookies()).set('vbl_session', token, sessionCookieOptions(req.headers.get('host')));
    }
  } catch (error) {
    console.error('createBusinessProfile error:', error);
    return { error: 'We could not save your business profile. Please try again.' };
  }

  redirect('/pricing?welcome=business');
}
