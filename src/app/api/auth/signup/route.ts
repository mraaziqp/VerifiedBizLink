import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createTrackedSession, sessionCookieOptions, hashOneTimeToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendVerificationEmail, sendWithin, appUrlFromRequest } from '@/lib/email';
import db from '@/lib/db';
import { EMAIL_FORMAT, MIN_PASSWORD_LENGTH, isRegistrableEmailDomain } from '@/lib/signup-guards';

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
    const { email, password, fullName, dateOfBirth, role, companyName, regNumber, website, socialLinks, industry, assistedSignup, assistedBy, assistedByUserId, referralCode } = await request.json();

    const effectiveFullName = role === 'business'
      ? (companyName?.trim() || fullName?.trim() || 'Business Owner')
      : (fullName?.trim() || '');

    if (!email || !password || !effectiveFullName) {
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

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
    }

    if (role !== 'customer' && role !== 'business') {
      return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });
    }

    if (role === 'business' && !industry) {
      return NextResponse.json({ error: 'Select your business category' }, { status: 400 });
    }

    const existing = await db`SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const verificationToken = crypto.randomUUID();
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    let userRole = 'customer';
    let headline = 'Member';
    if (role === 'business') { userRole = 'business'; headline = `Owner at ${companyName || 'Company'}`; }
    if (role === 'customer') { userRole = 'customer'; headline = 'Member'; }

    const newUsers = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url, email_verification_token, email_verification_token_expires_at, date_of_birth)
      VALUES (
        ${normalizedEmail},
        ${passwordHash},
        ${effectiveFullName},
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
      /**
       * Attribution is resolved SERVER-SIDE from the referral code.
       *
       * The client also sends assistedByUserId (from the manual dropdown),
       * but a referral code always wins and is looked up here rather than
       * trusted from the body — otherwise anyone could post an arbitrary
       * agent id and redirect someone else's commission to themselves.
       *
       * A suspended agent resolves to nothing, so a departed marketer stops
       * earning the moment their account is suspended.
       */
      const { resolveAgent, resolveAgentById } = await import('@/lib/agents');

      let agentId: string | null = null;
      let agentName: string | null = null;
      let resolvedCode: string | null = null;
      let source: string | null = null;

      // A referral link always wins: the business arrived through that
      // advisor's link, whoever is standing next to them.
      const linkAgent = await resolveAgent(referralCode);
      if (linkAgent) {
        agentId = linkAgent.id;
        agentName = linkAgent.fullName;
        resolvedCode = linkAgent.referralCode;
        source = 'referral_link';
      } else if (assistedSignup === true) {
        // An assisted signup: resolve whatever they picked or typed. The id
        // from the dropdown is checked against the database too rather than
        // trusted — otherwise anyone could post an arbitrary agent id and
        // redirect someone else's commission to themselves.
        const picked =
          (await resolveAgent(assistedBy)) ??
          (assistedByUserId ? await resolveAgentById(assistedByUserId) : null);

        if (!picked) {
          // Refusing is the point. Storing an unresolved name is what caused
          // advisors to work sales that were credited to nobody, with nothing
          // anywhere to show it had happened.
          return NextResponse.json(
            {
              error:
                "We couldn't find that advisor. Check the name or referral code with them and try again.",
              field: 'assistedBy',
            },
            { status: 400 },
          );
        }

        agentId = picked.id;
        agentName = picked.fullName;
        resolvedCode = picked.referralCode;
        source = 'manual';
      }

      // No trial package is granted — new businesses start on Free and upgrade
      // deliberately. The old 2-week 'premium_half' trial silently downgraded
      // people mid-use, which read as features breaking rather than expiring.
      await db`
        INSERT INTO businesses (user_id, name, company_name, reg_number, website, social_links, industry, status, package_type, assisted_signup, assisted_by, assisted_by_user_id, referral_code, attribution_source)
        VALUES (
          ${user.id},
          ${companyName},
          ${companyName},
          ${regNumber || ''},
          ${website || ''},
          ${JSON.stringify(socialLinks || {})},
          ${industry || ''},
          'unregistered',
          'free',
          ${agentId !== null},
          ${agentName},
          ${agentId},
          ${resolvedCode},
          ${source}
        )
        ON CONFLICT DO NOTHING
      `;

      // Log signup for attributed agent
      if (agentId) {
        const { logAgentActivity } = await import('@/lib/agents');
        await logAgentActivity(agentId, 'signup', `${companyName} signed up (${agentName || 'via link'})`, user.id).catch(() => {});
      }
    }

    // Send verification email (await so serverless Lambda environments don't kill
    // the connection prematurely, but never for long enough to stall signup)
    try {
      await sendWithin(sendVerificationEmail(user.email, user.full_name, verificationToken, appUrlFromRequest(request)));
    } catch (err) {
      console.error('Signup verification email failed for', user.email, err);
    }

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
