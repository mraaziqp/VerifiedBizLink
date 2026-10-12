import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isUuid } from '@/lib/talent';
import { ensureTalentSchema } from '@/lib/talent-schema';
import db from '@/lib/db';

/**
 * POST /api/jobs/<id>/save — bookmark a role. DELETE removes the bookmark.
 *
 * Both are idempotent, so a double tap or a retry on a bad connection ends
 * in the state the person asked for rather than an error.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isUuid(id)) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    await ensureTalentSchema();

    const [job] = await db`SELECT id FROM job_postings WHERE id = ${id} AND status <> 'draft' LIMIT 1`;
    if (!job) return NextResponse.json({ error: 'That job is no longer listed' }, { status: 404 });

    await db`
      INSERT INTO saved_jobs (user_id, job_id) VALUES (${session.id}, ${id})
      ON CONFLICT (user_id, job_id) DO NOTHING
    `;
    return NextResponse.json({ ok: true, saved: true });
  } catch (error) {
    console.error('Job save error:', error);
    return NextResponse.json({ error: 'Could not save the job' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isUuid(id)) return NextResponse.json({ ok: true, saved: false });
    await ensureTalentSchema();

    await db`DELETE FROM saved_jobs WHERE user_id = ${session.id} AND job_id = ${id}`;
    return NextResponse.json({ ok: true, saved: false });
  } catch (error) {
    console.error('Job unsave error:', error);
    return NextResponse.json({ error: 'Could not remove the saved job' }, { status: 500 });
  }
}
