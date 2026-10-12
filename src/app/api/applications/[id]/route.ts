import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { appUrlFromRequest } from '@/lib/email';
import {
  APPLICATION_STATUS_LABELS, CANDIDATE_STATUS_LABELS, cleanPortfolioLinks, isApplicationStatus, isUuid,
  statusMessageTemplate,
} from '@/lib/talent';
import { canonicalOrigin } from '@/lib/site-url';
import { logApplicationEvent } from '@/lib/jobs-server';
import { sendJobEmail } from '@/lib/jobs-email';
import { sendDirectMessage } from '@/lib/messaging';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { ensureTalentSchema } from '@/lib/talent-schema';
import db, { type DbRow } from '@/lib/db';

/** The application with both sides of it: who applied, and who is hiring. */
async function loadApplication(id: string): Promise<DbRow | null> {
  if (!isUuid(id)) return null;
  await ensureTalentSchema();
  const [row] = await db`
    SELECT a.id, a.status, a.applicant_user_id, a.employer_notes, a.status_note,
           j.id AS job_id, j.slug, j.title,
           b.user_id AS employer_user_id, b.company_name,
           u.full_name AS applicant_name, u.email AS applicant_email, u.is_suspended AS applicant_suspended
    FROM job_applications a
    JOIN job_postings j ON j.id = a.job_id
    JOIN businesses b ON b.id = j.business_id
    JOIN users u ON u.id = a.applicant_user_id
    WHERE a.id = ${id} LIMIT 1
  `;
  return row ?? null;
}

/**
 * GET /api/applications/<id> — one application's history and, for the
 * employer, the candidate's current profile.
 *
 * Both people on an application may read it. The employer's private notes
 * are only ever returned to the employer.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const app = await loadApplication(id);
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

    const isEmployer = String(app.employer_user_id) === session.id;
    const isApplicant = String(app.applicant_user_id) === session.id;
    if (!isEmployer && !isApplicant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [events, profiles] = await Promise.all([
      db`
        SELECT e.id, e.kind, e.from_status, e.to_status, e.detail, e.message_id, e.created_at,
               e.actor_user_id, u.full_name AS actor_name
        FROM job_application_events e
        LEFT JOIN users u ON u.id = e.actor_user_id
        WHERE e.application_id = ${app.id}
        ORDER BY e.created_at ASC
        LIMIT 200
      `,
      // The candidate's profile as it stands today, for the employer's drawer.
      // (The candidate has their own profile page and does not need it here.)
      isEmployer
        ? db`
            SELECT summary, years_experience, open_to_work, portfolio_links, work_history, education
            FROM talent_profiles WHERE user_id = ${app.applicant_user_id} LIMIT 1
          `
        : Promise.resolve([] as DbRow[]),
    ]);
    const p = profiles[0];

    return NextResponse.json({
      application: {
        id: app.id,
        status: app.status,
        statusNote: app.status_note,
        ...(isEmployer ? { employerNotes: app.employer_notes ?? '' } : {}),
      },
      ...(isEmployer
        ? {
            profile: p
              ? {
                  summary: p.summary ?? null,
                  yearsExperience: p.years_experience ?? null,
                  openToWork: p.open_to_work === true,
                  portfolioLinks: cleanPortfolioLinks(p.portfolio_links),
                  workHistory: Array.isArray(p.work_history) ? p.work_history.slice(0, 30) : [],
                  education: Array.isArray(p.education) ? p.education.slice(0, 20) : [],
                }
              : null,
          }
        : {}),
      events: events.map((e) => ({
        id: e.id,
        kind: e.kind,
        fromStatus: e.from_status,
        toStatus: e.to_status,
        detail: e.detail,
        hasMessage: Boolean(e.message_id),
        createdAt: e.created_at,
        byMe: String(e.actor_user_id ?? '') === session.id,
        // The candidate sees "the employer", not which member of staff clicked.
        actorName: isEmployer ? (e.actor_name ?? null) : null,
      })),
    });
  } catch (error) {
    console.error('Application read error:', error);
    return NextResponse.json({ error: 'Could not load the application' }, { status: 500 });
  }
}

/**
 * PATCH /api/applications/<id> — move a candidate through the pipeline, or
 * save the employer's private notes on them.
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

    const app = await loadApplication(id);
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const isEmployer = String(app.employer_user_id) === session.id;
    const isApplicant = String(app.applicant_user_id) === session.id;
    if (!isEmployer && !isApplicant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    // Notes are the employer's own. Saved without touching the stage, and
    // without telling the candidate anything.
    if (typeof body.notes === 'string') {
      if (!isEmployer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const notes = body.notes.replace(/\r\n/g, '\n').slice(0, 5000);
      await db`
        UPDATE job_applications SET employer_notes = ${notes.trim() ? notes : null}, updated_at = NOW()
        WHERE id = ${app.id}
      `;
      if (body.status === undefined) {
        return NextResponse.json({ ok: true, message: 'Notes saved. Only you can see them.' });
      }
    }

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
    // Withdrawing is the candidate's decision and it stands: an employer
    // moving a withdrawn application on would message someone who has
    // already said no.
    if (isEmployer && app.status === 'withdrawn') {
      return NextResponse.json(
        { error: 'This candidate withdrew their application, so it can no longer be moved.' },
        { status: 409 },
      );
    }

    // Each move with a message emails a candidate.
    if (isEmployer && body.notify !== false) {
      const limited = await rateLimit(`application-move:${session.id}`, 200, 3600);
      if (!limited.allowed) {
        return tooManyRequests(limited.retryAfterSecs, 'You have sent a lot of updates in the last hour. Please wait a little, or move candidates without a message.');
      }
    }

    const from = String(app.status);
    if (from === status) {
      return NextResponse.json({ ok: true, application: { id: app.id, status }, unchanged: true, message: 'No change.' });
    }

    const jobTitle = String(app.title);
    const companyName = String(app.company_name);

    // `message` is what the candidate is told. The employer sees the wording
    // before it goes (the client pre-fills the template below and lets them
    // edit it); `notify: false` moves the stage without contacting them.
    const notify = isEmployer && body.notify !== false;
    const custom = String(body.message ?? body.note ?? '').trim().slice(0, 1500);
    const message = notify
      ? custom || statusMessageTemplate(status, { candidateName: app.applicant_name, jobTitle, companyName })
      : null;

    // Conditional on the stage we just read. Two tabs, or a double click, would
    // otherwise both "move" the same application and the candidate would get
    // the same message twice; the second one finds nothing to update.
    const [updated] = await db`
      UPDATE job_applications
      SET status = ${status},
          status_note = ${message},
          status_changed_at = NOW(),
          status_changed_by = ${session.id},
          updated_at = NOW()
      WHERE id = ${app.id} AND status = ${from}
      RETURNING id, status, status_note, status_changed_at
    `;
    if (!updated) {
      return NextResponse.json(
        { error: 'This application was changed a moment ago. Refresh to see where it stands.' },
        { status: 409 },
      );
    }

    // The stage is saved. What follows tells people about it, and runs
    // together so the wait is the slowest step rather than the sum.
    const label = CANDIDATE_STATUS_LABELS[status];
    const notification = notify
      // The candidate is told what happened to their application. Silence after
      // applying is the single most complained-about thing about job boards, and
      // the employer has already made the decision by clicking. Their tracker
      // shows the new stage either way; `notify: false` only skips the nudge.
      ? db`
          INSERT INTO notifications (user_id, type, title, content)
          VALUES (
            ${app.applicant_user_id},
            'application_update',
            ${'Update on your application'},
            ${`${companyName}: "${jobTitle.slice(0, 60)}" — ${label}`}
          )
        `
      : !isEmployer
        ? db`
            INSERT INTO notifications (user_id, type, title, content)
            VALUES (
              ${app.employer_user_id},
              'application_update',
              ${'Application withdrawn'},
              ${`${app.applicant_name || 'A candidate'} withdrew their application for ${jobTitle.slice(0, 80)}`}
            )
          `
        : null;

    // Sent as an ordinary message in the conversation between the two of
    // them, so the candidate can simply reply to it.
    const chatMessage = message
      ? sendDirectMessage({
          senderId: session.id,
          senderName: companyName || session.fullName,
          senderEmail: session.email,
          receiverId: String(app.applicant_user_id),
          content: message,
          skipEmail: true,
        }).then((sent) => (sent.ok ? sent.message.id : null))
      : null;

    const email = message && app.applicant_email && !app.applicant_suspended
      ? sendJobEmail({
          to: String(app.applicant_email),
          subject: `${companyName}: update on your application for ${jobTitle.slice(0, 70)}`,
          heading: 'Update on your application',
          lines: [`${jobTitle} at ${companyName} — ${label}`],
          quote: message,
          cta: {
            label: 'View and reply',
            url: `${canonicalOrigin(appUrlFromRequest(request))}/dashboard/messages?with=${session.id}`,
          },
        })
      : null;

    const [, messageId] = await Promise.all([
      notification?.catch((e) => console.error('Application notification failed:', e?.message ?? e)),
      chatMessage?.catch((e) => {
        console.error('Application message failed:', e?.message ?? e);
        return null;
      }) ?? null,
      email,
    ]);

    await logApplicationEvent({
      applicationId: String(app.id),
      actorUserId: session.id,
      kind: status === 'withdrawn' ? 'withdrawn' : 'status',
      fromStatus: from,
      toStatus: status,
      detail: message,
      messageId,
    });

    return NextResponse.json({
      ok: true,
      application: {
        id: updated.id,
        status: updated.status,
        statusNote: updated.status_note,
        statusChangedAt: updated.status_changed_at,
      },
      notified: notify,
      message: isEmployer
        ? `Moved to ${APPLICATION_STATUS_LABELS[status]}.${notify ? ' The candidate has been told.' : ''}`
        : 'Your application has been withdrawn.',
    });
  } catch (error) {
    console.error('Application update error:', error);
    return NextResponse.json({ error: 'Could not update the application' }, { status: 500 });
  }
}
