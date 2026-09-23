import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  cleanSkills, isEmploymentType, isLocationType, isSalaryPeriod, matchScore,
} from '@/lib/talent';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/jobs — open roles, newest first, with this person's match score.
 * POST /api/jobs — a verified business publishes a role.
 *
 * Only verified businesses may post. That is the whole point of running a job
 * board on top of a verification platform: an applicant knows every employer
 * here has had its CIPC registration checked, which is precisely what a
 * general job board cannot promise.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10) || 30, 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
    const search = String(searchParams.get('q') ?? '').trim();
    const locationType = searchParams.get('locationType');
    const mine = searchParams.get('mine') === 'true';

    // "mine" is the employer's own list, which must include paused and closed
    // roles — otherwise a business pausing a job would watch it vanish.
    let businessId: string | null = null;
    if (mine) {
      if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const owned = (await db`
        SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1
      `.catch(() => [])) as unknown as Row[];
      if (owned.length === 0) return NextResponse.json({ jobs: [] });
      businessId = String(owned[0].id);
    }

    const jobs = (await db`
      SELECT j.id, j.title, j.description, j.required_skills, j.employment_type,
             j.location_type, j.location, j.salary_min_cents, j.salary_max_cents,
             j.salary_period, j.salary_visible, j.application_deadline, j.status,
             j.created_at, j.business_id,
             b.company_name, b.status AS business_status, b.logo_url, b.trust_score,
             (SELECT COUNT(*)::int FROM job_applications a WHERE a.job_id = j.id) AS application_count
      FROM job_postings j
      JOIN businesses b ON b.id = j.business_id
      WHERE
        (${businessId}::uuid IS NULL OR j.business_id = ${businessId})
        -- Public listings are open roles from businesses that still hold the
        -- badge. A business that loses verification stops advertising here.
        AND (${businessId}::uuid IS NOT NULL OR (j.status = 'open' AND b.status = 'verified'))
        AND (${locationType}::text IS NULL OR j.location_type = ${locationType})
        AND (
          ${search}::text = ''
          OR j.title ILIKE ${'%' + search + '%'}
          OR j.description ILIKE ${'%' + search + '%'}
          OR b.company_name ILIKE ${'%' + search + '%'}
        )
      ORDER BY j.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.catch((e) => { console.error('Jobs list query failed:', e.message); return []; })) as unknown as Row[];

    // The viewer's skills, so each card can show how well it fits them.
    let mySkills: string[] = [];
    let appliedTo = new Set<string>();
    if (session) {
      const [profile] = (await db`
        SELECT skills FROM talent_profiles WHERE user_id = ${session.id} LIMIT 1
      `.catch(() => [])) as unknown as Row[];
      mySkills = (profile?.skills as string[]) ?? [];

      const applied = (await db`
        SELECT job_id FROM job_applications WHERE applicant_user_id = ${session.id}
      `.catch(() => [])) as unknown as Row[];
      appliedTo = new Set(applied.map((a) => String(a.job_id)));
    }

    return NextResponse.json({
      jobs: jobs.map((j) => {
        const required = (j.required_skills as string[]) ?? [];
        const match = mySkills.length ? matchScore(mySkills, required) : null;
        return {
          id: j.id,
          title: j.title,
          description: j.description,
          requiredSkills: required,
          employmentType: j.employment_type,
          locationType: j.location_type,
          location: j.location,
          // A business can advertise a range without publishing it; hiding it
          // must actually withhold the numbers, not just not render them.
          salaryMinCents: j.salary_visible ? j.salary_min_cents : null,
          salaryMaxCents: j.salary_visible ? j.salary_max_cents : null,
          salaryPeriod: j.salary_period,
          salaryVisible: j.salary_visible === true,
          applicationDeadline: j.application_deadline,
          status: j.status,
          createdAt: j.created_at,
          businessId: j.business_id,
          companyName: j.company_name,
          businessVerified: j.business_status === 'verified',
          logoUrl: j.logo_url,
          trustScore: j.trust_score,
          applicationCount: j.application_count,
          matchScore: match?.score ?? null,
          matchedSkills: match?.matched ?? [],
          missingSkills: match?.missing ?? [],
          hasApplied: appliedTo.has(String(j.id)),
        };
      }),
      hasProfile: mySkills.length > 0,
    });
  } catch (error) {
    console.error('Jobs list error:', error);
    return NextResponse.json({ error: 'Could not load jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = (await db`
      SELECT id, company_name, status FROM businesses WHERE user_id = ${session.id} LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Create your business profile before posting a job.' },
        { status: 403 },
      );
    }
    const biz = rows[0];
    if (biz.status !== 'verified') {
      return NextResponse.json(
        { error: 'Only verified businesses can post jobs. Complete verification first — it is what makes a listing here worth applying to.' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const title = String(body.title ?? '').trim().slice(0, 160);
    const description = String(body.description ?? '').trim().slice(0, 20000);

    if (title.length < 3) {
      return NextResponse.json({ error: 'Give the role a title' }, { status: 400 });
    }
    if (description.length < 30) {
      return NextResponse.json(
        { error: 'Describe the role in a bit more detail so candidates know what they are applying for.' },
        { status: 400 },
      );
    }

    const employmentType = isEmploymentType(body.employmentType) ? body.employmentType : 'full_time';
    const locationType = isLocationType(body.locationType) ? body.locationType : 'on_site';
    const salaryPeriod = isSalaryPeriod(body.salaryPeriod) ? body.salaryPeriod : 'month';
    const skills = cleanSkills(body.requiredSkills, 30);

    const toCents = (v: unknown): number | null => {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return null;
      return Math.round(n * 100);
    };
    let minCents = toCents(body.salaryMin);
    let maxCents = toCents(body.salaryMax);
    // A range entered backwards is a typo, not a reason to refuse the post.
    if (minCents && maxCents && minCents > maxCents) [minCents, maxCents] = [maxCents, minCents];

    const deadline = String(body.applicationDeadline ?? '').trim();
    const validDeadline = /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null;

    const created = (await db`
      INSERT INTO job_postings (
        business_id, created_by, title, description, required_skills,
        employment_type, location_type, location,
        salary_min_cents, salary_max_cents, salary_period, salary_visible,
        application_deadline, status
      ) VALUES (
        ${biz.id}, ${session.id}, ${title}, ${description}, ${skills},
        ${employmentType}, ${locationType}, ${String(body.location ?? '').trim().slice(0, 120) || null},
        ${minCents}, ${maxCents}, ${salaryPeriod}, ${body.salaryVisible !== false},
        ${validDeadline}, 'open'
      )
      RETURNING id, title, created_at
    `) as unknown as Row[];

    return NextResponse.json({ ok: true, job: created[0] }, { status: 201 });
  } catch (error) {
    console.error('Job create error:', error);
    return NextResponse.json({ error: 'Could not publish the job' }, { status: 500 });
  }
}
