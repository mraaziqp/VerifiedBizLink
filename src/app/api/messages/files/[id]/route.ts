import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { isUuid } from '@/lib/messaging';

/**
 * GET /api/messages/files/<id> — a chat attachment, for the uploader and for
 * anyone who received a message carrying it. Everyone else gets a 404.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const [f] = await db`SELECT id, uploader_id, file_name, mime_type, data_base64 FROM message_files WHERE id = ${id} LIMIT 1`.catch(() => []);
    if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let allowed = String(f.uploader_id) === session.id;
    if (!allowed) {
      const [hit] = await db`
        SELECT 1 FROM messages
        WHERE attachment_url = ${`/api/messages/files/${id}`} AND is_deleted = FALSE
          AND (receiver_id = ${session.id} OR sender_id = ${session.id})
        LIMIT 1
      `.catch(() => []);
      allowed = Boolean(hit);
    }
    if (!allowed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = Buffer.from(String(f.data_base64), 'base64');
    const mime = String(f.mime_type);
    const inline = mime === 'application/pdf' || mime.startsWith('image/');
    return new NextResponse(body, {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(body.length),
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${String(f.file_name).replace(/["\\\r\n]/g, '_')}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Message file read error:', error);
    return NextResponse.json({ error: 'Could not open this file' }, { status: 500 });
  }
}
