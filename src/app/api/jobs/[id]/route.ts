import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  cleanSkills, isEmploymentType, isJobStatus, isLocationType, isSalaryPeriod,
  matchScore, isAcceptingApplications,
} from '@/lib/talent';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/** The business that owns this job, if the caller is the one who owns it. */
async function ownedJob(jobId: string, userId: string): Promise<Row | null> {
  const rows = (await db`
    SELECT j.id, j.business_id
    FROM job_postings j
    JOIN businesses b ON b.id = j.business_id
    WHERE j.id = ${jobId} AND b.user_id = ${userId}
    LIMIT 1
  `.catch(() => [])) as unknown as Row[];
  return rows[0] ?? null;
}

/** GET /api/jobs/<id> — one role, with the viewer's fit and whether they applied. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();

    const rows = (await db`
      SELECT j.*, b.company_name, b.status AS business_status, b.logo_url,
             b.trust_score, b.industry, b.description AS company_description,
             b.user_id AS owner_user_id
      FROM job_postings j
      JOIN businesses b ON b.id = j.business_id
      WHERE j.id = ${id} LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'That job is no longer listed' }, { status: 404 });
    }
    const j = rows[0];
    const isOwner = session?.id === String(j.owner_user_id);

    // A paused or closed role stays readable by its owner, but is not served
    // to the public — a candidate should not read and apply to a dead listing.
    if (!isOwner && (j.status !== 'open' || j.business_status !== 'verified')) {
      return NextResponse.json({ error: 'That job is no longer listed' }, { status: 404 });
    }

    let match = null;
    let hasApplied = false;
    if (session) {
      const [profile] = (await db`
        SELECT skills FROM talent_profiles WHERE user_id = ${session.id} LIMIT 1
      `.catch(() => [])) as unknown as Row[];
      if (profile) match = matchScore((profile.skills as string[]) ?? [], (j.required_skills as string[]) ?? []);

      const [applied] = (await db`
        SELECT id, status FROM job_applications
        WHERE job_id = ${id} AND applicant_user_id = ${session.id} LIMIT 1
      `.catch(() => [])) as unknown as Row[];
      hasApplied = Boolean(applied);
    }

    if (!isOwner) {
      // Counted on read rather than in a background job; an inflated view
      // count from a refresh is a smaller problem than none at all.
      db`UPDATE job_postings SET views_count = views_count + 1 WHERE id = ${id}`.catch(() => {});
    }

    return NextResponse.json({
      job: {
        id: j.id,
        title: j.title,
        description: j.description,
        requiredSkills: (j.required_skills as string[]) ?? [],
        employmentType: j.employment_type,
        locationType: j.location_type,
        location: j.location,
        salaryMinCents: j.salary_visible ? j.salary_min_cents : null,
        salaryMaxCents: j.salary_visible ? j.salary_max_cents : null,
        salaryPeriod: j.salary_period,
        salaryVisible: j.salary_visible === true,
        applicationDeadline: j.application_deadline,
        status: j.status,
        createdAt: j.created_at,
        viewsCount: j.views_count,
        businessId: j.business_id,
        companyName: j.company_name,
        businessVerified: j.business_status === 'verified',
        logoUrl: j.logo_url,
        trustScore: j.trust_score,
        industry: j.industry,
        companyDescription: j.company_description,
      },
      isOwner,
      hasApplied,
      acceptingApplications: isAcceptingApplications(j as { status?: string; application_deadline?: string }),
      matchScore: match?.score ?? null,
      matchedSkills: match?.matched ?? [],
      missingSkills: match?.missing ?? [],
    });
  } catch (error) {
    console.error('Job read error:', error);
    return NextResponse.json({ error: 'Could not load the job' }, { status: 500 });
  }
}

/** PATCH /api/jobs/<id> — the owning business edits or pauses the role. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await ownedJob(id, session.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Every field is optional: this endpoint serves both the full edit form
    // and a single "pause" toggle, and COALESCE leaves untouched what the
    // caller did not send rather than blanking it.
    const title = body.title === undefined ? null : String(body.title).trim().slice(0, 160);
    const description = body.description === undefined ? null : String(body.description).trim().slice(0, 20000);
    const skills = body.requiredSkills === undefined ? null : cleanSkills(body.requiredSkills, 30);
    const status = isJobStatus(body.status) ? body.status : null;
    const employmentType = isEmploymentType(body.employmentType) ? body.employmentType : null;
    const locationType = isLocationType(body.locationType) ? body.locationType : null;
    const salaryPeriod = isSalaryPeriod(body.salaryPeriod) ? body.salaryPeriod : null;

    const toCents = (v: unknown): number | null => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
    };

    const updated = (await db`
      UPDATE job_postings SET
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        required_skills = COALESCE(${skills}, required_skills),
        employment_type = COALESCE(${employmentType}, employment_type),
        location_type = COALESCE(${locationType}, location_type),
        location = COALESCE(${body.location === undefined ? null : String(body.location).trim().slice(0, 120)}, location),
        salary_min_cents = COALESCE(${toCents(body.salaryMin)}, salary_min_cents),
        salary_max_cents = COALESCE(${toCents(body.salaryMax)}, salary_max_cents),
        salary_period = COALESCE(${salaryPeriod}, salary_period),
        salary_visible = COALESCE(${typeof body.salaryVisible === 'boolean' ? body.salaryVisible : null}, salary_visible),
        status = COALESCE(${status}, status),
        closed_at = CASE WHEN ${status}::text = 'closed' THEN NOW()
                         WHEN ${status}::text IS NOT NULL THEN NULL
                         ELSE closed_at END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, title, status
    `) as unknown as Row[];

    return NextResponse.json({ ok: true, job: updated[0], message: 'Job updated.' });
  } catch (error) {
    console.error('Job update error:', error);
    return NextResponse.json({ error: 'Could not update the job' }, { status: 500 });
  }
}

/**
 * DELETE /api/jobs/<id> — closes the role.
 *
 * Deliberately not a delete. Applications reference the job, and people have a
 * right to see what they applied to; removing the row would erase their own
 * history along with the listing.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await ownedJob(id, session.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db`
      UPDATE job_postings SET status = 'closed', closed_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true, message: 'Job closed. Applicants keep their application history.' });
  } catch (error) {
    console.error('Job close error:', error);
    return NextResponse.json({ error: 'Could not close the job' }, { status: 500 });
  }
}
