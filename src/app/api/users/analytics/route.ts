import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.id;

  const [
    recentPostsResult,
    totalPostsResult,
    recentConnectionsResult,
    totalConnectionsResult,
    businessResult,
    monthlyConnectionsResult,
  ] = await Promise.all([
    db`SELECT COUNT(*) AS count FROM posts
       WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '30 days'`,
    db`SELECT COUNT(*) AS count FROM posts WHERE user_id = ${userId}`,
    db`SELECT COUNT(*) AS count FROM connections
       WHERE (requester_id = ${userId} OR receiver_id = ${userId})
         AND status = 'accepted'
         AND created_at > NOW() - INTERVAL '30 days'`,
    db`SELECT COUNT(*) AS count FROM connections
       WHERE (requester_id = ${userId} OR receiver_id = ${userId})
         AND status = 'accepted'`,
    db`SELECT trust_score, status FROM businesses WHERE user_id = ${userId} LIMIT 1`,
    db`SELECT
         TO_CHAR(created_at, 'Mon') AS month,
         TO_CHAR(created_at, 'YYYY-MM') AS month_key,
         COUNT(*) AS connections
       FROM connections
       WHERE (requester_id = ${userId} OR receiver_id = ${userId})
         AND status = 'accepted'
         AND created_at > NOW() - INTERVAL '6 months'
       GROUP BY month, month_key
       ORDER BY month_key ASC`,
  ]);

  // Build last-6-month buckets, filling any with zero
  const now = new Date();
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const short = d.toLocaleString('en', { month: 'short' });
    return { month: short, month_key: monthKey, connections: 0 };
  });

  for (const row of monthlyConnectionsResult) {
    const entry = last6Months.find((m) => m.month_key === row.month_key);
    if (entry) entry.connections = parseInt(String(row.connections));
  }

  return NextResponse.json({
    stats: {
      recentPosts: parseInt(String(recentPostsResult[0]?.count ?? 0)),
      totalPosts: parseInt(String(totalPostsResult[0]?.count ?? 0)),
      recentConnections: parseInt(String(recentConnectionsResult[0]?.count ?? 0)),
      totalConnections: parseInt(String(totalConnectionsResult[0]?.count ?? 0)),
      trustScore: businessResult[0]?.trust_score ?? 0,
      businessStatus: businessResult[0]?.status ?? 'unregistered',
    },
    connectionsByMonth: last6Months.map(({ month, connections }) => ({ month, connections })),
  });
}
