import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { AGENT_PORTAL_ROLES, hasRole } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, AGENT_PORTAL_ROLES)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leads = await db`
      SELECT *
      FROM agent_leads
      WHERE agent_id = ${session.id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error('Agent leads GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, AGENT_PORTAL_ROLES)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessName, contactName, contactEmail, contactPhone, notes, nextFollowupAt } = body;

    const [lead] = await db`
      INSERT INTO agent_leads (agent_id, business_name, contact_name, contact_email, contact_phone, notes, next_followup_at)
      VALUES (${session.id}, ${businessName || null}, ${contactName || null}, ${contactEmail || null}, ${contactPhone || null}, ${notes || null}, ${nextFollowupAt || null})
      RETURNING *
    `;

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error: any) {
    console.error('Agent leads POST error:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, AGENT_PORTAL_ROLES)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes, nextFollowupAt } = body;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Verify ownership
    const [existing] = await db`SELECT id FROM agent_leads WHERE id = ${id} AND agent_id = ${session.id}`;
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found or unauthorized' }, { status: 404 });
    }

    const [lead] = await db`
      UPDATE agent_leads
      SET status = COALESCE(${status || null}, status),
          notes = COALESCE(${notes || null}, notes),
          next_followup_at = ${nextFollowupAt || null},
          updated_at = NOW()
      WHERE id = ${id} AND agent_id = ${session.id}
      RETURNING *
    `;

    return NextResponse.json({ lead });
  } catch (error: any) {
    console.error('Agent leads PUT error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}
