import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { appUrlFromRequest } from '@/lib/email';
import { cleanSkills, isAcceptingApplications, matchScore } from '@/lib/talent';
import { canonicalOrigin } from '@/lib/site-url';
import { findJob, logApplicationEvent } from '@/lib/jobs-server';
import { sendJobEmail } from '@/lib/jobs-email';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import db from '@/lib/db';

/**
 * POST /api/jobs/<id>/apply — one-click apply.
 *
 * The application carries a snapshot of the headline, skills and CV as they
 * were at this moment. An employer reads and judges what was sent; if the
 * candidate later rewrites their profile, the application an employer
 * shortlisted must still say what it said when they shortlisted it.
 *
 * Someone applying for the first time can send a headline and skills along
 * with the application. Those become the start of their profile, so a first
 * application is not a detour through a separate form — but they only ever
 * fill gaps, and never overwrite what the person already wrote.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const job = await findJob(id);
    // A draft has never been offered to anyone, so to an applicant it does not exist.
    if (!job || job.status === 'draft') {
      return NextResponse.json({ error: 'That job is no longer listed' }, { status: 404 });
    }

    if (String(job.owner_user_id) === session.id) {
      return NextResponse.json({ error: 'You cannot apply to your own listing.' }, { status: 400 });
    }
    if (job.business_status !== 'verified') {
      return NextResponse.json({ error: 'This employer is no longer verified, so the role is not accepting applications.' }, { status: 409 });
    }
    if (!isAcceptingApplications(job as { status?: string; application_deadline?: string })) {
      return NextResponse.json({ error: 'This role has closed for applications.' }, { status: 409 });
    }

    // Every application emails an employer. Forty an hour is more than
    // anyone reads listings carefully enough to send; it stops a script.
    const limited = await rateLimit(`job-apply:${session.id}`, 40, 3600);
    if (!limited.allowed) {
      return tooManyRequests(limited.retryAfterSecs, 'You have sent a lot of applications in the last hour. Please wait a little before sending more.');
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const coverNote = String(body.coverNote ?? '').trim().slice(0, 2000);

    const [existing] = await db`
      SELECT headline, skills, cv_url FROM talent_profiles WHERE user_id = ${session.id} LIMIT 1
    `;
    const storedHeadline = String(existing?.headline ?? '').trim();
    const storedSkills = (existing?.skills as string[]) ?? [];

    const headline = storedHeadline || String(body.headline ?? '').trim().slice(0, 160);
    const skills = storedSkills.length > 0 ? storedSkills : cleanSkills(body.skills);

    if (!headline || skills.length === 0) {
      return NextResponse.json(
        { error: 'Add a headline and at least one skill before applying — that is what gets sent to the employer.', needsProfile: true },
        { status: 400 },
      );
    }

    if (!storedHeadline || storedSkills.length === 0) {
      await db`
        INSERT INTO talent_profiles (user_id, headline, skills, updated_at)
        VALUES (${session.id}, ${headline}, ${skills}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          headline = COALESCE(NULLIF(talent_profiles.headline, ''), EXCLUDED.headline),
          skills = CASE WHEN cardinality(talent_profiles.skills) = 0 THEN EXCLUDED.skills ELSE talent_profiles.skills END,
          updated_at = NOW()
      `;
    }

    const { score } = matchScore(skills, (job.required_skills as string[]) ?? []);

    // ON CONFLICT rather than a check-then-insert: two rapid clicks would both
    // pass a prior existence check and create two rows in the same pipeline.
    const inserted = await db`
      INSERT INTO job_applications (
        job_id, applicant_user_id, cover_note,
        snapshot_headline, snapshot_skills, snapshot_cv_url, match_score, status
      ) VALUES (
        ${job.id}, ${session.id}, ${coverNote || null},
        ${headline}, ${skills}, ${existing?.cv_url ?? null}, ${score}, 'applied'
      )
      ON CONFLICT (job_id, applicant_user_id) DO NOTHING
      RETURNING id
    `;

    if (inserted.length === 0) {
      return NextResponse.json({ error: 'You have already applied to this role.' }, { status: 409 });
    }
    const applicationId = String(inserted[0].id);
    const applicantName = session.fullName || 'Someone';
    const title = String(job.title);

    // The application is saved; everything after it is a consequence of that
    // and none of it may undo it. Run together, so the person who clicked
    // Apply waits for the slowest of these, not the sum of them.
    const emailEmployer = async () => {
      // An employer who is not sitting in the app would otherwise never know.
      const [owner] = await db`SELECT email, is_suspended FROM users WHERE id = ${job.owner_user_id} LIMIT 1`;
      if (!owner?.email || owner.is_suspended) return;
      await sendJobEmail({
        to: String(owner.email),
        subject: `New applicant for ${title.slice(0, 80)}`,
        heading: 'New applicant',
        lines: [
          `${applicantName} applied for ${title}.`,
          `${headline} · ${score}% skills match`,
        ],
        quote: coverNote || null,
        cta: {
          label: 'Review application',
          url: `${canonicalOrigin(appUrlFromRequest(request))}/business/jobs/${job.id}?applicant=${applicationId}`,
        },
      });
    };

    await Promise.all([
      logApplicationEvent({ applicationId, actorUserId: session.id, kind: 'applied', toStatus: 'applied' }),
      db`
        INSERT INTO notifications (user_id, type, title, content)
        VALUES (
          ${job.owner_user_id},
          'job_application',
          'New applicant',
          ${`${applicantName} applied for ${title.slice(0, 80)}`}
        )
      `.catch((e) => console.error('Applicant notification failed:', e.message)),
      // Applying should not leave a bookmark behind saying "apply later".
      db`DELETE FROM saved_jobs WHERE user_id = ${session.id} AND job_id = ${job.id}`.catch(() => {}),
      emailEmployer().catch((e) => console.error('Applicant email failed:', e?.message ?? e)),
    ]);

    return NextResponse.json({
      ok: true,
      applicationId,
      matchScore: score,
      message: `Applied to ${job.company_name}. They can see your profile as it is right now.`,
    }, { status: 201 });
  } catch (error) {
    console.error('Job apply error:', error);
    return NextResponse.json({ error: 'Could not send your application' }, { status: 500 });
  }
}
