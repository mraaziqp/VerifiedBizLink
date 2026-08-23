import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import { SUPER_ADMIN_ROLES, hasRole } from '@/lib/roles';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/admin/agent-issues — everything agents have reported.
 *
 * Readable by any staff role (a compliance officer may need to see a report),
 * but only a Super Admin can respond or change status — a reply here is the
 * company answering a contractor.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const status = request.nextUrl.searchParams.get('status');

    const rows = (await db`
      SELECT i.id, i.category, i.priority, i.subject, i.description, i.page_url,
             i.screenshot_url, i.status, i.admin_response, i.responded_by_name,
             i.responded_at, i.created_at,
             u.full_name AS agent_name, u.email AS agent_email, u.phone AS agent_phone,
             u.referral_code
      FROM agent_issues i
      JOIN users u ON u.id = i.agent_id
      WHERE (${status}::text IS NULL OR i.status = ${status})
      ORDER BY
        -- Blocking first, then oldest, so nothing urgent sits behind chatter.
        CASE i.priority WHEN 'blocking' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
        CASE i.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
        i.created_at ASC
      LIMIT 200
    `.catch(() => [])) as unknown as Row[];

    const issues = rows.map((r) => ({
      id: r.id,
      agentName: r.agent_name,
      agentEmail: r.agent_email,
      agentPhone: r.agent_phone ?? null,
      referralCode: r.referral_code ?? null,
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
    }));

    return NextResponse.json({
      issues,
      summary: {
        open: issues.filter((i) => i.status === 'open').length,
        inProgress: issues.filter((i) => i.status === 'in_progress').length,
        blocking: issues.filter((i) => i.priority === 'blocking' && i.status !== 'resolved' && i.status !== 'closed').length,
        total: issues.length,
      },
    });
  } catch (error) {
    console.error('Agent issues admin read error:', error);
    return NextResponse.json({ error: 'Failed to load agent issues' }, { status: 500 });
  }
}

/** PATCH /api/admin/agent-issues — reply to an issue and/or change its status. */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, SUPER_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { issueId, status, response } = await request.json();
    if (!issueId) {
      return NextResponse.json({ error: 'issueId is required' }, { status: 400 });
    }

    const allowed = ['open', 'in_progress', 'resolved', 'closed'];
    if (status && !allowed.includes(status)) {
      return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
    }

    const rows = (await db`
      UPDATE agent_issues
      SET status = COALESCE(${status ?? null}, status),
          admin_response = COALESCE(${response ? String(response).slice(0, 2000) : null}, admin_response),
          responded_by = CASE WHEN ${response ? true : false} THEN ${session!.id}::uuid ELSE responded_by END,
          responded_by_name = CASE WHEN ${response ? true : false} THEN ${session!.fullName || session!.email} ELSE responded_by_name END,
          responded_at = CASE WHEN ${response ? true : false} THEN NOW() ELSE responded_at END,
          updated_at = NOW()
      WHERE id = ${issueId}
      RETURNING agent_id, subject
    `) as unknown as Row[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Tell the agent in-app that someone has come back to them.
    if (response || status) {
      await db`
        INSERT INTO notifications (user_id, title, content, link)
        VALUES (
          ${rows[0].agent_id},
          'Update on your report',
          ${`"${String(rows[0].subject).slice(0, 80)}" — ${status ? `now ${String(status).replace('_', ' ')}` : 'the team has replied'}`},
          '/agent'
        )
      `.catch(() => {});
    }

    return NextResponse.json({ ok: true, message: 'Issue updated and the agent has been notified.' });
  } catch (error) {
    console.error('Agent issue update error:', error);
    return NextResponse.json({ error: 'Failed to update the issue' }, { status: 500 });
  }
}
