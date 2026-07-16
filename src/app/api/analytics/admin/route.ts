import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Total users
    const totalUsers = await db`SELECT COUNT(*) as count FROM users`;

    // Total businesses
    const totalBusinesses = await db`SELECT COUNT(*) as count, AVG(trust_score) as avg_trust FROM businesses`;

    // Verified businesses
    const verifiedBusinesses = await db`
      SELECT COUNT(*) as count FROM businesses WHERE status = 'verified'
    `;

    // Pending verifications
    const pendingVerifications = await db`
      SELECT COUNT(*) as count FROM businesses WHERE status IN ('pending', 'reviewing')
    `;

    // Total revenue
    const payments = await db`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM payments
      WHERE status = 'completed'
    `;

    // Active users (posted in last 7 days)
    const activeUsers = await db`
      SELECT COUNT(DISTINCT user_id) as count
      FROM posts
      WHERE created_at > NOW() - INTERVAL '7 days'
    `;

    // New users/verifications this month (real counts, not mocked)
    const newUsersThisMonth = await db`
      SELECT COUNT(*) as count FROM users WHERE created_at > date_trunc('month', NOW())
    `;
    const newVerificationsThisMonth = await db`
      SELECT COUNT(*) as count FROM businesses
      WHERE status = 'verified' AND verified_at > date_trunc('month', NOW())
    `;

    // Top verified businesses
    const topBusinesses = await db`
      SELECT company_name, trust_score, connections_count, verified_at
      FROM businesses
      WHERE status = 'verified'
      ORDER BY trust_score DESC
      LIMIT 5
    `;

    // Verify rate (verified / total)
    const verifyRate = totalUsers[0]?.count > 0
      ? ((verifiedBusinesses[0]?.count / totalUsers[0]?.count) * 100).toFixed(2)
      : 0;

    return NextResponse.json({
      success: true,
      totalUsers: Number(totalUsers[0]?.count) || 0,
      totalBusinesses: Number(totalBusinesses[0]?.count) || 0,
      verifiedBusinesses: Number(verifiedBusinesses[0]?.count) || 0,
      pendingVerifications: Number(pendingVerifications[0]?.count) || 0,
      avgTrustScore: totalBusinesses[0]?.avg_trust ? Math.round(Number(totalBusinesses[0].avg_trust)) : 0,
      overview: {
        totalUsers: Number(totalUsers[0]?.count) || 0,
        verifiedBusinesses: Number(verifiedBusinesses[0]?.count) || 0,
        pendingVerifications: Number(pendingVerifications[0]?.count) || 0,
        verificationRate: parseFloat(verifyRate as string),
        activeUsers: Number(activeUsers[0]?.count) || 0,
        totalRevenue: Number(payments[0]?.total) || 0,
      },
      topBusinesses: topBusinesses || [],
      trends: {
        newUsersThisMonth: Number(newUsersThisMonth[0]?.count) || 0,
        newVerificationsThisMonth: Number(newVerificationsThisMonth[0]?.count) || 0,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Admin analytics error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch admin analytics', detail: errorMsg },
      { status: 500 }
    );
  }
}
