import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';
import { cvUrlFor } from '@/lib/talent-cv-store';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/talent/cv/<id> — the CV file itself.
 *
 * Readable by its owner, by staff, and by the owner of a business that
 * received an application carrying this exact CV. Everyone else gets a 404,
 * not a 403, so the endpoint does not confirm which ids exist.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [cv] = await db`
      SELECT id, user_id, file_name, mime_type, data_base64 FROM talent_cvs WHERE id = ${id} LIMIT 1
    `.catch(() => []);
    if (!cv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let allowed = cv.user_id === session.id || isStaff(session);
    if (!allowed) {
      const [hit] = await db`
        SELECT 1
        FROM job_applications a
        JOIN job_postings j ON j.id = a.job_id
        JOIN businesses b ON b.id = j.business_id
        WHERE a.snapshot_cv_url = ${cvUrlFor(String(cv.id))} AND b.user_id = ${session.id}
        LIMIT 1
      `.catch(() => []);
      allowed = Boolean(hit);
    }
    if (!allowed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = Buffer.from(String(cv.data_base64), 'base64');
    const mime = String(cv.mime_type);
    // PDFs and images open in the browser; a Word file downloads.
    const disposition = mime.startsWith('application/vnd.') ? 'attachment' : 'inline';
    const safeName = String(cv.file_name).replace(/["\\\r\n]/g, '_');

    return new NextResponse(body, {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(body.length),
        'Content-Disposition': `${disposition}; filename="${safeName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('CV download error:', error);
    return NextResponse.json({ error: 'Could not open this CV' }, { status: 500 });
  }
}
