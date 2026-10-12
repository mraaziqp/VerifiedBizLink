import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { findJob, insertWithSlug } from '@/lib/jobs-server';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import db from '@/lib/db';

/**
 * POST /api/jobs/<id>/duplicate — a new draft copied from an existing role.
 *
 * Always a draft, never live: the usual reason to copy a listing is to change
 * something about it first (a second branch, next year's intake), and a copy
 * that published itself would put two identical roles on the board.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const source = await findJob(id);
    if (!source || String(source.owner_user_id) !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Shares the hourly allowance with posting: a copy is a new listing.
    const limited = await rateLimit(`job-create:${session.id}`, 30, 3600);
    if (!limited.allowed) {
      return tooManyRequests(limited.retryAfterSecs, 'You have created a lot of roles in the last hour. Please wait a little before adding more.');
    }

    const title = `${String(source.title).slice(0, 150)} (copy)`;
    const [created] = await insertWithSlug(title, (slug) => db`
      INSERT INTO job_postings (
        business_id, created_by, slug, title, description, requirements, benefits, required_skills,
        employment_type, location_type, location,
        salary_min_cents, salary_max_cents, salary_period, salary_visible, status
      ) VALUES (
        ${source.business_id}, ${session.id}, ${slug}, ${title}, ${source.description},
        ${source.requirements ?? null}, ${source.benefits ?? null}, ${source.required_skills ?? []},
        ${source.employment_type}, ${source.location_type}, ${source.location ?? null},
        ${source.salary_min_cents ?? null}, ${source.salary_max_cents ?? null},
        ${source.salary_period ?? 'month'}, ${source.salary_visible !== false}, 'draft'
      )
      RETURNING id, slug, title, status
    `);

    return NextResponse.json(
      { ok: true, job: created, message: 'Copied as a draft. Edit it, then publish when it is ready.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Job duplicate error:', error);
    return NextResponse.json({ error: 'Could not copy the job' }, { status: 500 });
  }
}
