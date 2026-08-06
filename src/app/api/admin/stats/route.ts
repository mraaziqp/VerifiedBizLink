import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [userCount] = await db`SELECT COUNT(*) AS count FROM users`;
    const [bizCount] = await db`SELECT COUNT(*) AS count FROM businesses`;
    const [verifiedCount] = await db`SELECT COUNT(*) AS count FROM businesses WHERE status = 'verified'`;
    const [pendingCount] = await db`SELECT COUNT(*) AS count FROM businesses WHERE status = 'pending'`;
    const [reviewingCount] = await db`SELECT COUNT(*) AS count FROM businesses WHERE status = 'reviewing'`;
    const [rejectedCount] = await db`SELECT COUNT(*) AS count FROM businesses WHERE status = 'rejected'`;
    const [postCount] = await db`SELECT COUNT(*) AS count FROM posts`;
    const [connCount] = await db`SELECT COUNT(*) AS count FROM connections WHERE status = 'accepted'`;
    const [reportCount] = await db`SELECT COUNT(*) AS count FROM compliance_reports WHERE status = 'open'`;
    const [ticketCount] = await db`SELECT COUNT(*) AS count FROM support_tickets WHERE status = 'open'`.catch(() => [{ count: '0' }]);
    const [deletionCount] = await db`SELECT COUNT(*) AS count FROM deletion_requests WHERE status = 'pending'`.catch(() => [{ count: '0' }]);

    return NextResponse.json({
      stats: {
        totalUsers: parseInt(userCount.count),
        totalBusinesses: parseInt(bizCount.count),
        verifiedBusinesses: parseInt(verifiedCount.count),
        pendingBusinesses: parseInt(pendingCount.count),
        reviewingBusinesses: parseInt(reviewingCount.count),
        rejectedBusinesses: parseInt(rejectedCount.count),
        totalPosts: parseInt(postCount.count),
        totalConnections: parseInt(connCount.count),
        openReports: parseInt(reportCount.count),
        openTickets: parseInt(ticketCount?.count ?? '0'),
        pendingDeletions: parseInt(deletionCount?.count ?? '0'),
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
