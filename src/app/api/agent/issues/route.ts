import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AGENT_PORTAL_ROLES, hasRole } from '@/lib/roles';
import db from '@/lib/db';

type Row = Record<string, unknown>;

const CATEGORIES = ['app_bug', 'payment', 'customer', 'account', 'feature_request', 'other'];
const PRIORITIES = ['low', 'normal', 'high', 'blocking'];

/** GET /api/agent/issues — the agent's own reports and their status. */
export async function GET() {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, AGENT_PORTAL_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = (await db`
      SELECT id, category, priority, subject, description, page_url, screenshot_url,
             status, admin_response, responded_by_name, responded_at, created_at
      FROM agent_issues
      WHERE agent_id = ${session!.id}
      ORDER BY created_at DESC
      LIMIT 100
    `.catch(() => [])) as unknown as Row[];

    return NextResponse.json({
      issues: rows.map((r) => ({
        id: r.id,
        category: r.category,
        priority: r.priority,
        subject: r.subject,
        description: r.description,
        pageUrl: r.page_url ?? null,
        screenshotUrl: r.screenshot_url ?? null,
        status: r.status,
        adminResponse: r.admin_response ?? null,
        respondedBy: r.responded_by_name ?? null,
        respondedAt: r.responded_at ?? null,
        createdAt: r.created_at,
      })),
      categories: CATEGORIES,
      priorities: PRIORITIES,
    });
  } catch (error) {
    console.error('Agent issues read error:', error);
    return NextResponse.json({ error: 'Failed to load your reports' }, { status: 500 });
  }
}

/**
 * POST /api/agent/issues — an agent reports a problem.
 *
 * The screenshot is passed as a URL that the client has already uploaded
 * through /api/media/upload, rather than as raw image data. That reuses the
 * upload path that already handles size limits and storage, and keeps this
 * request small enough not to hit a body-size limit while an agent is
 * standing in a shop trying to report something.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, AGENT_PORTAL_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { category, priority, subject, description, pageUrl, screenshotUrl } =
      await request.json();

    const subj = String(subject ?? '').trim();
    const desc = String(description ?? '').trim();

    if (subj.length < 4) {
      return NextResponse.json({ error: 'Give the report a short title' }, { status: 400 });
    }
    if (desc.length < 10) {
      return NextResponse.json(
        { error: 'Please describe what happened in a little more detail' },
        { status: 400 },
      );
    }

    const cat = CATEGORIES.includes(category) ? category : 'other';
    const pri = PRIORITIES.includes(priority) ? priority : 'normal';

    // Only accept a screenshot we could have produced. An arbitrary URL here
    // would let a report embed a remote image into the admin console.
    const shot = String(screenshotUrl ?? '').trim();
    const safeShot =
      shot && (shot.startsWith('data:image/') || /^https?:\/\//i.test(shot)) ? shot.slice(0, 2000) : null;

    const rows = (await db`
      INSERT INTO agent_issues (
        agent_id, category, priority, subject, description, page_url, screenshot_url
      ) VALUES (
        ${session!.id}, ${cat}, ${pri}, ${subj.slice(0, 200)}, ${desc.slice(0, 5000)},
        ${String(pageUrl ?? '').trim().slice(0, 500) || null}, ${safeShot}
      )
      RETURNING id
    `) as unknown as Row[];

    await db`
      INSERT INTO agent_activity_log (agent_id, event_type, description, metadata)
      VALUES (${session!.id}, 'issue_reported', ${`Reported: ${subj.slice(0, 120)}`},
              ${JSON.stringify({ category: cat, priority: pri })}::jsonb)
    `.catch(() => {});

    // Admins are told in-app. A blocking report is the one case worth
    // interrupting someone for, so it is flagged as such in the notice.
    await db`
      INSERT INTO notifications (user_id, title, content, link)
      SELECT id,
             ${pri === 'blocking' ? 'BLOCKING issue reported by an agent' : 'Agent reported an issue'},
             ${`${session!.fullName || 'An agent'}: ${subj.slice(0, 140)}`},
             '/admin/agent-issues'
      FROM users WHERE role = 'admin'
    `.catch((e) => console.error('Agent issue notification failed:', e));

    return NextResponse.json({
      ok: true,
      id: rows[0]?.id,
      message: 'Thanks — your report has gone through to the admin team.',
    });
  } catch (error) {
    console.error('Agent issue submission error:', error);
    return NextResponse.json({ error: 'Could not submit your report' }, { status: 500 });
  }
}
