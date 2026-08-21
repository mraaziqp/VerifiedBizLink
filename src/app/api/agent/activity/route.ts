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

    const { searchParams } = new URL(request.url);
    const queriedAgentId = searchParams.get('agentId');
    
    let targetAgentId = session.id;
    if (queriedAgentId && session.role === 'admin') {
      targetAgentId = queriedAgentId;
    }

    const events = await db`
      SELECT *
      FROM agent_activity_log
      WHERE agent_id = ${targetAgentId}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error('Agent activity GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent activity' }, { status: 500 });
  }
}
