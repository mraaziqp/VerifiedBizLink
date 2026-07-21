import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

// DELETE /api/admin/reviews/[id] — staff-only review moderation. Reviews
// have no self-serve edit/delete for the reviewer by design (a review is a
// record of what was said, not something to quietly rewrite) — this is the
// only way a false, defamatory, or abusive review comes down.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const [review] = await db`
    DELETE FROM business_reviews WHERE id = ${id}
    RETURNING id, business_id, reviewer_id, title
  `;

  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  await db`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
    VALUES (${session!.id}, ${session!.fullName}, ${'Removed review: ' + review.title}, 'review', ${review.id}, ${review.title})
  `.catch(() => {});

  return NextResponse.json({ success: true });
}
