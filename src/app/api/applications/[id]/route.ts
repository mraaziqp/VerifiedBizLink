import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isApplicationStatus, APPLICATION_STATUS_LABELS } from '@/lib/talent';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * PATCH /api/applications/<id> — move a candidate through the pipeline.
 *
 * Two different people may change this row and they may do different things:
 * the employer who owns the listing moves it between stages, and the applicant
 * may only withdraw. Working that out from who is asking, rather than trusting
 * a role in the body, is what stops one business editing another's pipeline.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = (await db`
      SELECT a.id, a.status, a.applicant_user_id, j.id AS job_id, j.title,
             b.user_id AS employer_user_id, b.company_name
      FROM job_applications a
      JOIN job_postings j ON j.id = a.job_id
      JOIN businesses b ON b.id = j.business_id
      WHERE a.id = ${id} LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    const app = rows[0];

    const isEmployer = String(app.employer_user_id) === session.id;
    const isApplicant = String(app.applicant_user_id) === session.id;
    if (!isEmployer && !isApplicant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const status = body.status;
    if (!isApplicationStatus(status)) {
      return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
    }

    // A candidate can take themselves out of a process; they cannot promote
    // themselves into an interview or mark themselves hired.
    if (isApplicant && !isEmployer && status !== 'withdrawn') {
      return NextResponse.json(
        { error: 'You can only withdraw your own application.' },
        { status: 403 },
      );
    }
    if (isEmployer && status === 'withdrawn') {
      return NextResponse.json(
        { error: 'Only the candidate can withdraw. Use "Not proceeding" instead.' },
        { status: 400 },
      );
    }

    const note = String(body.note ?? '').trim().slice(0, 1000);

    const updated = (await db`
      UPDATE job_applications
      SET status = ${status},
          status_note = ${note || null},
          status_changed_at = NOW(),
          status_changed_by = ${session.id},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, status
    `) as unknown as Row[];

    // The candidate is told what happened to their application. Silence after
    // applying is the single most complained-about thing about job boards, and
    // the employer has already made the decision by clicking.
    if (isEmployer) {
      const label = APPLICATION_STATUS_LABELS[status];
      await db`
        INSERT INTO notifications (user_id, type, title, content)
        VALUES (
          ${app.applicant_user_id},
          'application_update',
          ${'Update on your application'},
          ${`${app.company_name}: "${String(app.title).slice(0, 60)}" — ${label}${note ? ` · ${note}` : ''}`}
        )
      `.catch((e) => console.error('Application notification failed:', e.message));
    }

    return NextResponse.json({
      ok: true,
      application: updated[0],
      message: isEmployer
        ? `Moved to ${APPLICATION_STATUS_LABELS[status]}. The candidate has been notified.`
        : 'Your application has been withdrawn.',
    });
  } catch (error) {
    console.error('Application update error:', error);
    return NextResponse.json({ error: 'Could not update the application' }, { status: 500 });
  }
}
