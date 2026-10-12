import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  EMPLOYMENT_TYPES, LOCATION_TYPES, isJobStatus, jobExcerpt, matchScore, normaliseSkill,
} from '@/lib/talent';
import {
  csv, insertWithSlug, jobProblem, likePattern, mergeJobFields, ownedBusiness, toJobJson,
} from '@/lib/jobs-server';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { ensureTalentSchema } from '@/lib/talent-schema';
import db, { type DbRow } from '@/lib/db';

/**
 * GET /api/jobs — published roles, filtered, with this person's match score.
 * POST /api/jobs — a business drafts or publishes a role.
 *
 * Only verified businesses may publish. That is the whole point of running a
 * job board on top of a verification platform: an applicant knows every
 * employer here has had its CIPC registration checked, which is precisely
 * what a general job board cannot promise.
 */

const PAGE_MAX = 60;

export async function GET(request: NextRequest) {
  try {
    await ensureTalentSchema();
    const session = await getSession();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '24', 10) || 24, 1), PAGE_MAX);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
    const search = String(searchParams.get('q') ?? '').trim().slice(0, 120);
    const location = String(searchParams.get('location') ?? '').trim().slice(0, 80);
    const locationTypes = csv(searchParams.get('locationType')).filter((v) => (LOCATION_TYPES as readonly string[]).includes(v));
    const employmentTypes = csv(searchParams.get('employmentType')).filter((v) => (EMPLOYMENT_TYPES as readonly string[]).includes(v));
    const skills = csv(searchParams.get('skills'), 10).map((s) => s.toLowerCase());
    const sort = ['match', 'salary'].includes(searchParams.get('sort') ?? '') ? String(searchParams.get('sort')) : 'newest';
    const savedOnly = searchParams.get('saved') === 'true';
    const mine = searchParams.get('mine') === 'true';
    const statusFilter = isJobStatus(searchParams.get('status')) ? String(searchParams.get('status')) : null;

    const salaryRand = Number(searchParams.get('salaryMin'));
    const salaryMinCents = Number.isFinite(salaryRand) && salaryRand > 0 ? Math.round(salaryRand * 100) : null;

    if ((mine || savedOnly) && !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // "mine" is the employer's own list, which must include drafts, paused
    // and closed roles — otherwise a business pausing a job would watch it
    // vanish.
    let business: Awaited<ReturnType<typeof ownedBusiness>> = null;
    if (mine && session) {
      business = await ownedBusiness(session.id);
      if (!business) return NextResponse.json({ jobs: [], business: null, hasMore: false });
    }
    const businessId = business?.id ?? null;

    // The viewer's own details first: their skills order a "best match" sort.
    // Not for the employer's own list — nobody is matched against, or applies
    // to, their own roles, so those three lookups would be read and discarded.
    let mySkills: string[] = [];
    let myHeadline = '';
    let appliedTo = new Set<string>();
    let saved = new Set<string>();
    if (session && !mine) {
      const [profiles, applied, savedRows] = await Promise.all([
        db`SELECT headline, skills FROM talent_profiles WHERE user_id = ${session.id} LIMIT 1`,
        db`SELECT job_id FROM job_applications WHERE applicant_user_id = ${session.id}`,
        // Only bookmarks that still lead somewhere, so the count on the
        // "Saved" filter matches what pressing it shows.
        db`
          SELECT s.job_id FROM saved_jobs s
          JOIN job_postings j ON j.id = s.job_id
          JOIN businesses b ON b.id = j.business_id
          WHERE s.user_id = ${session.id} AND j.status = 'open' AND b.status = 'verified'
        `,
      ]);
      mySkills = (profiles[0]?.skills as string[]) ?? [];
      myHeadline = String(profiles[0]?.headline ?? '');
      appliedTo = new Set(applied.map((a) => String(a.job_id)));
      saved = new Set(savedRows.map((s) => String(s.job_id)));
    }
    const mySkillsLower = mySkills.map((s) => s.toLowerCase());
    const pattern = likePattern(search);

    // Asks for one more than the page so "is there more?" needs no second
    // COUNT(*) over the same filters.
    //
    // The board gets the opening of each description, not all of it: a card
    // shows two lines, and the full text (plus requirements and benefits) is
    // fetched when a role is opened. Sending every listing's whole text with
    // every keystroke of a search was most of the response for none of the
    // screen. The employer's own list is the editor's source, so it is whole.
    const rows = (await db`
      SELECT j.id, j.slug, j.title, j.business_id, j.required_skills,
             j.employment_type, j.location_type, j.location,
             j.salary_min_cents, j.salary_max_cents, j.salary_period, j.salary_visible, j.currency,
             j.application_deadline, j.status, j.views_count,
             j.created_at, j.updated_at, j.published_at,
             CASE WHEN ${mine}::boolean THEN j.description ELSE left(j.description, 600) END AS description,
             CASE WHEN ${mine}::boolean THEN j.requirements END AS requirements,
             CASE WHEN ${mine}::boolean THEN j.benefits END AS benefits,
             b.company_name, b.status AS business_status, b.logo_url, b.trust_score,
             -- Only the owner is shown applicant counts, so only the
             -- owner's list pays for counting them.
             CASE WHEN ${mine}::boolean
               THEN (SELECT COUNT(*)::int FROM job_applications a WHERE a.job_id = j.id)
             END AS application_count
      FROM job_postings j
      JOIN businesses b ON b.id = j.business_id
      WHERE
        CASE WHEN ${businessId}::uuid IS NOT NULL
          THEN j.business_id = ${businessId}::uuid
               AND (${statusFilter}::text IS NULL OR j.status = ${statusFilter})
          -- Public listings are published roles from businesses that still
          -- hold the badge. A business that loses verification stops
          -- advertising here.
          ELSE j.status = 'open' AND b.status = 'verified'
        END
        AND (cardinality(${locationTypes}::text[]) = 0 OR j.location_type = ANY(${locationTypes}::text[]))
        AND (cardinality(${employmentTypes}::text[]) = 0 OR j.employment_type = ANY(${employmentTypes}::text[]))
        AND (${location}::text = '' OR j.location ILIKE ${likePattern(location)})
        -- A hidden salary is hidden from the filter too: otherwise raising
        -- the slider until a role disappears reads the figure straight out.
        AND (
          ${salaryMinCents}::bigint IS NULL
          OR (
            j.salary_visible
            AND COALESCE(j.salary_max_cents, j.salary_min_cents)
                * CASE j.salary_period WHEN 'hour' THEN 173.0 WHEN 'day' THEN 21.67 WHEN 'year' THEN 1.0 / 12 ELSE 1 END
                >= ${salaryMinCents}::bigint
          )
        )
        AND (
          cardinality(${skills}::text[]) = 0
          OR EXISTS (SELECT 1 FROM unnest(j.required_skills) s WHERE lower(s) = ANY(${skills}::text[]))
        )
        AND (
          ${savedOnly}::boolean = FALSE
          OR EXISTS (SELECT 1 FROM saved_jobs sj WHERE sj.job_id = j.id AND sj.user_id = ${session?.id ?? null}::uuid)
        )
        AND (
          ${search}::text = ''
          OR j.title ILIKE ${pattern}
          OR j.description ILIKE ${pattern}
          OR b.company_name ILIKE ${pattern}
          OR j.location ILIKE ${pattern}
          OR EXISTS (SELECT 1 FROM unnest(j.required_skills) s WHERE s ILIKE ${pattern})
        )
      ORDER BY
        CASE WHEN ${sort}::text = 'salary' AND j.salary_visible THEN
          COALESCE(j.salary_max_cents, j.salary_min_cents)
          * CASE j.salary_period WHEN 'hour' THEN 173.0 WHEN 'day' THEN 21.67 WHEN 'year' THEN 1.0 / 12 ELSE 1 END
        END DESC NULLS LAST,
        CASE WHEN ${sort}::text = 'match' AND cardinality(j.required_skills) > 0 THEN
          (SELECT COUNT(*) FROM unnest(j.required_skills) s WHERE lower(s) = ANY(${mySkillsLower}::text[]))::float
          / cardinality(j.required_skills)
        END DESC NULLS LAST,
        COALESCE(j.published_at, j.created_at) DESC
      LIMIT ${limit + 1} OFFSET ${offset}
    `) as DbRow[];

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return NextResponse.json({
      jobs: page.map((j) => {
        const json = toJobJson(j, { forOwner: mine });
        if (mine) return json;
        const match = mySkills.length ? matchScore(mySkills, json.requiredSkills) : null;
        return {
          ...json,
          // Blank rather than cut off mid-sentence: nothing should mistake
          // the opening of a description for the whole of it.
          description: '',
          excerpt: jobExcerpt(json.description),
          matchScore: match?.score ?? null,
          matchedSkills: match?.matched ?? [],
          missingSkills: match?.missing ?? [],
          hasApplied: appliedTo.has(json.id),
          isSaved: saved.has(json.id),
        };
      }),
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
      // What the page needs to know about the person looking at it.
      viewer: {
        signedIn: Boolean(session),
        hasProfile: mySkills.length > 0,
        // One-click apply sends a headline and skills; without both there
        // is nothing for an employer to read.
        canQuickApply: Boolean(myHeadline.trim()) && mySkills.some((s) => normaliseSkill(s)),
        savedCount: saved.size,
      },
      ...(mine ? { business } : {}),
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
    await ensureTalentSchema();

    const business = await ownedBusiness(session.id);
    if (!business) {
      return NextResponse.json(
        { error: 'Create your business profile before posting a job.' },
        { status: 403 },
      );
    }

    // Far above what a real business posts in an hour; low enough that a
    // hijacked account cannot paper the board with listings.
    const limited = await rateLimit(`job-create:${session.id}`, 30, 3600);
    if (!limited.allowed) {
      return tooManyRequests(limited.retryAfterSecs, 'You have posted a lot of roles in the last hour. Please wait a little before adding more.');
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const status = body.status === 'draft' ? 'draft' : 'open';

    // Drafting is open to any business: it is private, and writing the
    // listing while verification is in progress costs nobody anything.
    if (status === 'open' && !business.verified) {
      return NextResponse.json(
        {
          error: 'Only verified businesses can publish jobs. Complete verification first — it is what makes a listing here worth applying to. You can save this as a draft in the meantime.',
          needsVerification: true,
        },
        { status: 403 },
      );
    }

    const fields = mergeJobFields(body);
    const problem = jobProblem(fields, status);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const created = await insertWithSlug(fields.title, (slug) => db`
      INSERT INTO job_postings (
        business_id, created_by, slug, title, description, requirements, benefits, required_skills,
        employment_type, location_type, location,
        salary_min_cents, salary_max_cents, salary_period, salary_visible,
        application_deadline, status, published_at
      ) VALUES (
        ${business.id}, ${session.id}, ${slug}, ${fields.title}, ${fields.description},
        ${fields.requirements}, ${fields.benefits}, ${fields.requiredSkills},
        ${fields.employmentType}, ${fields.locationType}, ${fields.location},
        ${fields.salaryMinCents}, ${fields.salaryMaxCents}, ${fields.salaryPeriod}, ${fields.salaryVisible},
        ${fields.applicationDeadline}, ${status}, ${status === 'open' ? new Date().toISOString() : null}
      )
      RETURNING id, slug, title, status, created_at
    `);

    return NextResponse.json({
      ok: true,
      job: created[0],
      message: status === 'draft' ? 'Draft saved.' : 'Your role is live on the jobs board.',
    }, { status: 201 });
  } catch (error) {
    console.error('Job create error:', error);
    return NextResponse.json({ error: 'Could not save the job' }, { status: 500 });
  }
}
