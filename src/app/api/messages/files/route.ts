import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { ATTACHMENT_MAX_BYTES, ensureMessagingSchema } from '@/lib/messaging';
import { CV_MIME, detectCvKind } from '@/lib/cv-scan';

/**
 * POST /api/messages/files — upload a chat attachment (PDF, Word, image).
 *
 * Stored privately and served from /api/messages/files/<id> only to the two
 * people in the conversation it was sent in. Invoices and quotes carry
 * banking details; they must not sit at a guessable public URL.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Choose a file to attach.' }, { status: 400 });
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      return NextResponse.json({ error: `That file is ${(file.size / 1048576).toFixed(1)}MB. The limit is 4MB.` }, { status: 413 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    // Type from the bytes, not the name: nothing scriptable is ever served back.
    const kind = detectCvKind(buf);
    if (!kind) {
      return NextResponse.json({ error: 'Attach a PDF, a Word document or an image (JPG, PNG, WebP).' }, { status: 415 });
    }

    await ensureMessagingSchema();
    const [{ n }] = await db`
      SELECT COUNT(*)::int AS n FROM message_files WHERE uploader_id = ${session.id} AND created_at > NOW() - INTERVAL '1 hour'
    `;
    if (Number(n) >= 60) return NextResponse.json({ error: 'Too many uploads. Try again in a little while.' }, { status: 429 });

    const name = String(file.name || `file.${kind}`).replace(/[^\w.\- ()]+/g, '_').slice(0, 120);
    const [row] = await db`
      INSERT INTO message_files (uploader_id, file_name, mime_type, size_bytes, data_base64)
      VALUES (${session.id}, ${name}, ${CV_MIME[kind]}, ${buf.length}, ${buf.toString('base64')})
      RETURNING id
    `;
    return NextResponse.json({
      ok: true,
      attachment: { url: `/api/messages/files/${row.id}`, name, type: CV_MIME[kind], size: buf.length },
    });
  } catch (error) {
    console.error('Message file upload error:', error);
    return NextResponse.json({ error: 'Could not upload that file.' }, { status: 500 });
  }
}
