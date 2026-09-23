import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { matchScore, isAcceptingApplications } from '@/lib/talent';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * POST /api/jobs/<id>/apply — one-click apply.
 *
 * The application carries a snapshot of the headline, skills and CV as they
 * were at this moment. An employer reads and judges what was sent; if the
 * candidate later rewrites their profile, the application an employer
 * shortlisted must still say what it said when they shortlisted it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const jobs = (await db`
      SELECT j.id, j.status, j.application_deadline, j.required_skills, j.title,
             b.id AS business_id, b.company_name, b.status AS business_status,
             b.user_id AS owner_user_id
      FROM job_postings j
      JOIN businesses b ON b.id = j.business_id
      WHERE j.id = ${id} LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    if (jobs.length === 0) {
      return NextResponse.json({ error: 'That job is no longer listed' }, { status: 404 });
    }
    const job = jobs[0];

    if (String(job.owner_user_id) === session.id) {
      return NextResponse.json({ error: 'You cannot apply to your own listing.' }, { status: 400 });
    }
    if (job.business_status !== 'verified') {
      return NextResponse.json({ error: 'This employer is no longer verified, so the role is not accepting applications.' }, { status: 409 });
    }
    if (!isAcceptingApplications(job as { status?: string; application_deadline?: string })) {
      return NextResponse.json({ error: 'This role has closed for applications.' }, { status: 409 });
    }

    const profiles = (await db`
      SELECT headline, skills, cv_url, is_published
      FROM talent_profiles WHERE user_id = ${session.id} LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    if (profiles.length === 0) {
      return NextResponse.json(
        { error: 'Set up your professional profile first — that is what gets sent to the employer.', needsProfile: true },
        { status: 400 },
      );
    }
    const profile = profiles[0];
    const skills = (profile.skills as string[]) ?? [];
    if (!profile.headline || skills.length === 0) {
      return NextResponse.json(
        { error: 'Add a headline and at least one skill to your profile before applying.', needsProfile: true },
        { status: 400 },
      );
    }

    const { score } = matchScore(skills, (job.required_skills as string[]) ?? []);
    const coverNote = String((await request.json().catch(() => ({})))?.coverNote ?? '').trim().slice(0, 2000);

    // ON CONFLICT rather than a check-then-insert: two rapid clicks would both
    // pass a prior existence check and create two rows in the same pipeline.
    const inserted = (await db`
      INSERT INTO job_applications (
        job_id, applicant_user_id, cover_note,
        snapshot_headline, snapshot_skills, snapshot_cv_url, match_score, status
      ) VALUES (
        ${id}, ${session.id}, ${coverNote || null},
        ${profile.headline}, ${skills}, ${profile.cv_url ?? null}, ${score}, 'applied'
      )
      ON CONFLICT (job_id, applicant_user_id) DO NOTHING
      RETURNING id
    `) as unknown as Row[];

    if (inserted.length === 0) {
      return NextResponse.json({ error: 'You have already applied to this role.' }, { status: 409 });
    }

    await db`
      INSERT INTO notifications (user_id, type, title, content)
      VALUES (
        ${job.owner_user_id},
        'job_application',
        'New applicant',
        ${`${session.fullName || 'Someone'} applied for ${String(job.title).slice(0, 80)}`}
      )
    `.catch((e) => console.error('Applicant notification failed:', e.message));

    return NextResponse.json({
      ok: true,
      applicationId: inserted[0].id,
      matchScore: score,
      message: `Applied to ${job.company_name}. They can see your profile as it is right now.`,
    }, { status: 201 });
  } catch (error) {
    console.error('Job apply error:', error);
    return NextResponse.json({ error: 'Could not send your application' }, { status: 500 });
  }
}
