import { NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/admin/network — real connection/network statistics
export async function GET() {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const t0 = Date.now();
    const [accepted] = await db`SELECT COUNT(*)::int AS n FROM connections WHERE status = 'accepted'`;
    const [pending] = await db`SELECT COUNT(*)::int AS n FROM connections WHERE status = 'pending'`;
    const [users] = await db`SELECT COUNT(*)::int AS n FROM users`;
    const dbLatency = Date.now() - t0;

    // Most-connected user (real) — each accepted connection touches two
    // users (requester_id, receiver_id), so count appearances across both.
    const top = await db`
      SELECT u.full_name, COUNT(*)::int AS n
      FROM (
        SELECT requester_id AS user_id FROM connections WHERE status = 'accepted'
        UNION ALL
        SELECT receiver_id AS user_id FROM connections WHERE status = 'accepted'
      ) c
      JOIN users u ON u.id = c.user_id
      GROUP BY u.id, u.full_name
      ORDER BY n DESC
      LIMIT 1
    `.catch(() => []);

    const totalConnections = accepted?.n ?? 0;
    const totalUsers = users?.n ?? 0;
    const avg = totalUsers > 0 ? (totalConnections * 2) / totalUsers : 0;

    return NextResponse.json({
      stats: {
        totalConnections,
        activeConnections: totalConnections,
        pendingRequests: pending?.n ?? 0,
        avgConnectionsPerUser: Number(avg.toFixed(1)),
        topUser: top[0] ? { name: top[0].full_name, count: top[0].n } : null,
        dbLatencyMs: dbLatency,
      },
    });
  } catch (error) {
    console.error('Network stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch network stats' }, { status: 500 });
  }
}
