import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import { isJobStatus, type JobStatus } from '@/lib/talent';
import {
  findJob, jobProblem, loadJobView, mergeJobFields, ownedBusiness, toJobJson,
} from '@/lib/jobs-server';
import { checkRateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit';
import db from '@/lib/db';

/**
 * GET /api/jobs/<id or slug> — one role, with the viewer's fit and whether
 * they applied. Public for published roles, so a shared link opens for
 * someone who has no account yet.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // The one jobs endpoint open to the whole internet. A per-instance
    // counter, deliberately: it costs nothing, where the shared limiter would
    // add a database write to every read it is trying to protect.
    const limited = checkRateLimit(`job-read:${clientIp(request.headers)}`, 120, 60);
    if (!limited.allowed) return tooManyRequests(limited.retryAfterSecs, 'Too many requests. Please slow down.');

    const session = await getSession();
    const view = await loadJobView(
      id,
      session ? { id: session.id, isStaff: isStaff(session) } : null,
      { countView: true },
    );
    if (!view) {
      return NextResponse.json({ error: 'That job is no longer listed' }, { status: 404 });
    }
    return NextResponse.json(view);
  } catch (error) {
    console.error('Job read error:', error);
    return NextResponse.json({ error: 'Could not load the job' }, { status: 500 });
  }
}

/**
 * PATCH /api/jobs/<id> — the owning business edits a role or changes its
 * status (publish, pause, resume, close, reopen).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const current = await findJob(id);
    if (!current || String(current.owner_user_id) !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const from = (isJobStatus(current.status) ? current.status : 'closed') as JobStatus;
    const to = (isJobStatus(body.status) ? body.status : from) as JobStatus;

    // Once people may have seen or applied to a role it cannot quietly become
    // a draft again — it would disappear from their history with no record
    // of why. Pausing takes it off the board and keeps it honest.
    if (to === 'draft' && from !== 'draft') {
      return NextResponse.json(
        { error: 'A published role cannot go back to draft. Pause it instead.' },
        { status: 400 },
      );
    }

    if (to === 'open' && from !== 'open') {
      const business = await ownedBusiness(session.id);
      if (!business?.verified) {
        return NextResponse.json(
          {
            error: 'Only verified businesses can publish jobs. Complete verification first — your draft is saved and waiting.',
            needsVerification: true,
          },
          { status: 403 },
        );
      }
    }

    const fields = mergeJobFields(body, current);
    const problem = jobProblem(fields, to);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const [updated] = await db`
      UPDATE job_postings SET
        title = ${fields.title},
        description = ${fields.description},
        requirements = ${fields.requirements},
        benefits = ${fields.benefits},
        required_skills = ${fields.requiredSkills},
        employment_type = ${fields.employmentType},
        location_type = ${fields.locationType},
        location = ${fields.location},
        salary_min_cents = ${fields.salaryMinCents},
        salary_max_cents = ${fields.salaryMaxCents},
        salary_period = ${fields.salaryPeriod},
        salary_visible = ${fields.salaryVisible},
        application_deadline = ${fields.applicationDeadline},
        status = ${to},
        published_at = CASE WHEN ${to}::text = 'open' AND published_at IS NULL THEN NOW() ELSE published_at END,
        closed_at = CASE WHEN ${to}::text = 'closed' THEN COALESCE(closed_at, NOW()) ELSE NULL END,
        updated_at = NOW()
      WHERE id = ${current.id}
      RETURNING *
    `;

    const message = to === from
      ? 'Changes saved.'
      : to === 'open' ? (from === 'draft' ? 'Your role is live on the jobs board.' : 'The role is live again.')
        : to === 'paused' ? 'Paused. It is off the board until you resume it; applicants keep their place.'
          : to === 'closed' ? 'Closed. Applicants keep their application history.'
            : 'Changes saved.';

    return NextResponse.json({
      ok: true,
      job: toJobJson({ ...current, ...updated }, { forOwner: true }),
      message,
    });
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
 * history along with the listing. The one exception is a draft nobody has
 * ever seen: there is no history to protect, so it is simply removed.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const current = await findJob(id);
    if (!current || String(current.owner_user_id) !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (current.status === 'draft' && Number(current.application_count ?? 0) === 0) {
      await db`DELETE FROM job_postings WHERE id = ${current.id} AND status = 'draft'`;
      return NextResponse.json({ ok: true, deleted: true, message: 'Draft deleted.' });
    }

    await db`
      UPDATE job_postings
      SET status = 'closed', closed_at = COALESCE(closed_at, NOW()), updated_at = NOW()
      WHERE id = ${current.id}
    `;
    return NextResponse.json({ ok: true, deleted: false, message: 'Job closed. Applicants keep their application history.' });
  } catch (error) {
    console.error('Job close error:', error);
    return NextResponse.json({ error: 'Could not close the job' }, { status: 500 });
  }
}
