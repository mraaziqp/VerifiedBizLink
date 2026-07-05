import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/businesses/[id]/reviews — list all reviews for a business
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reviews = await db`
      SELECT
        r.id,
        r.business_id,
        r.rating,
        r.title,
        r.body,
        r.helpful_count,
        r.created_at,
        u.full_name AS reviewer_name,
        u.avatar_url AS reviewer_avatar
      FROM business_reviews r
      JOIN users u ON u.id = r.reviewer_id
      WHERE r.business_id = ${id}
      ORDER BY r.created_at DESC
      LIMIT 100
    `;

    const stats = await db`
      SELECT
        COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float AS average,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE rating = 1)::int AS r1,
        COUNT(*) FILTER (WHERE rating = 2)::int AS r2,
        COUNT(*) FILTER (WHERE rating = 3)::int AS r3,
        COUNT(*) FILTER (WHERE rating = 4)::int AS r4,
        COUNT(*) FILTER (WHERE rating = 5)::int AS r5
      FROM business_reviews
      WHERE business_id = ${id}
    `;

    const s = stats[0] ?? { average: 0, count: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 };

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        businessId: r.business_id,
        reviewerName: r.reviewer_name,
        reviewerAvatar: r.reviewer_avatar,
        rating: r.rating,
        title: r.title,
        body: r.body,
        helpfulCount: r.helpful_count,
        createdAt: r.created_at,
      })),
      stats: {
        average: s.average,
        count: s.count,
        distribution: { 1: s.r1, 2: s.r2, 3: s.r3, 4: s.r4, 5: s.r5 },
      },
    });
  } catch (error) {
    console.error('GET reviews error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST /api/businesses/[id]/reviews — submit a review (must be logged-in customer)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Must be signed in to leave a review' }, { status: 401 });
    }

    const { id } = await params;

    const { rating, title, body } = await request.json();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (title.trim().length > 120) {
      return NextResponse.json({ error: 'Title too long (max 120 chars)' }, { status: 400 });
    }
    if (body && typeof body === 'string' && body.length > 1000) {
      return NextResponse.json({ error: 'Review body too long (max 1000 chars)' }, { status: 400 });
    }

    // Prevent reviewing own business
    const [biz] = await db`SELECT user_id FROM businesses WHERE id = ${id}`;
    if (!biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    if (biz.user_id === session.id) {
      return NextResponse.json({ error: 'You cannot review your own business' }, { status: 403 });
    }

    // One review per user per business
    const [existing] = await db`
      SELECT id FROM business_reviews
      WHERE business_id = ${id} AND reviewer_id = ${session.id}
    `;
    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this business' }, { status: 409 });
    }

    const [review] = await db`
      INSERT INTO business_reviews (business_id, reviewer_id, rating, title, body)
      VALUES (${id}, ${session.id}, ${rating}, ${title.trim()}, ${(body ?? '').trim()})
      RETURNING *
    `;

    // Notify business owner of new review
    await db`
      INSERT INTO notifications (user_id, type, title, content)
      VALUES (
        ${biz.user_id},
        'new_review',
        'New review',
        ${`${session.fullName} left you a ${rating}-star review: "${title.trim()}"`}
      )
    `.catch(() => null);

    return NextResponse.json({
      review: {
        id: review.id,
        businessId: review.business_id,
        reviewerName: session.fullName,
        reviewerAvatar: session.avatarUrl ?? null,
        rating: review.rating,
        title: review.title,
        body: review.body,
        helpfulCount: 0,
        createdAt: review.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST review error:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
