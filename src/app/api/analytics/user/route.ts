import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's business if they have one
    const business = await db`
      SELECT id, trust_score, connections_count, status
      FROM businesses
      WHERE user_id = ${session.id}
      LIMIT 1
    `;

    // Get user's posts
    const posts = await db`
      SELECT id, likes_count, comments_count, created_at
      FROM posts
      WHERE user_id = ${session.id}
      ORDER BY created_at DESC
      LIMIT 30
    `;

    // Get user's connections
    const connections = await db`
      SELECT COUNT(*) as count
      FROM connections
      WHERE (requester_id = ${session.id} OR receiver_id = ${session.id})
      AND status = 'accepted'
    `;

    // Get user's profile views (mock data for now)
    const profileViews = Math.floor(Math.random() * 5000);

    // Calculate engagement metrics
    const totalLikes = posts.reduce((sum: number, p: any) => sum + p.likes_count, 0);
    const totalComments = posts.reduce((sum: number, p: any) => sum + p.comments_count, 0);
    const engagementRate = posts.length > 0 ? ((totalLikes + totalComments) / posts.length).toFixed(2) : 0;

    return NextResponse.json({
      success: true,
      profile: {
        name: session.fullName,
        email: session.email,
        role: session.role,
        emailVerified: session.emailVerified,
      },
      business: business[0] || null,
      stats: {
        connections: connections[0]?.count || 0,
        posts: posts.length,
        profileViews,
        totalLikes,
        totalComments,
        engagementRate: parseFloat(engagementRate as string),
        trustScore: business[0]?.trust_score || 0,
      },
      recentActivity: posts.slice(0, 5).map((p: any) => ({
        type: 'post',
        engagement: p.likes_count + p.comments_count,
        date: p.created_at,
      })),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('User analytics error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', detail: errorMsg },
      { status: 500 }
    );
  }
}
