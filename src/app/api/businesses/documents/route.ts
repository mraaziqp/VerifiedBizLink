import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// Max file size: 5 MB
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const biz = await db`SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1`;
    if (biz.length === 0) return NextResponse.json({ error: 'No business profile found' }, { status: 404 });

    const contentType = request.headers.get('content-type') ?? '';

    // ── Multipart file upload ──────────────────────────────────────────
    if (contentType.startsWith('multipart/form-data')) {
      // Ensure file_data column exists (idempotent migration)
      await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_data TEXT`;

      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const docName = formData.get('docName') as string | null;
      const docType = formData.get('docType') as string | null;

      if (!file || !docName) {
        return NextResponse.json({ error: 'file and docName are required' }, { status: 400 });
      }

      if (!ALLOWED_TYPES[file.type]) {
        return NextResponse.json(
          { error: 'Only PDF, JPEG, PNG and WebP files are allowed' },
          { status: 415 },
        );
      }

      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'File must be 5 MB or smaller' }, { status: 413 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;
      const ext = ALLOWED_TYPES[file.type];
      const fileUrl = `doc_${biz[0].id}_${docType ?? 'other'}.${ext}`;

      // Upsert — replace if re-uploaded
      const existing = await db`
        SELECT id FROM documents WHERE business_id = ${biz[0].id} AND name = ${docName} LIMIT 1
      `;

      if (existing.length > 0) {
        await db`
          UPDATE documents SET file_data = ${dataUrl}, file_url = ${fileUrl}, status = 'uploaded', uploaded_at = NOW()
          WHERE id = ${existing[0].id}
        `;
        const updated = await db`SELECT * FROM documents WHERE id = ${existing[0].id} LIMIT 1`;
        return NextResponse.json({ document: updated[0] });
      }

      const doc = await db`
        INSERT INTO documents (business_id, name, doc_type, file_url, file_data, status)
        VALUES (${biz[0].id}, ${docName}, ${docType ?? 'other'}, ${fileUrl}, ${dataUrl}, 'uploaded')
        RETURNING id, name, doc_type, file_url, status, uploaded_at
      `;
      return NextResponse.json({ document: doc[0] }, { status: 201 });
    }

    // ── JSON fallback (legacy: record name only, no file) ─────────────
    const body = await request.json();
    const docName = body.docName || body.documentName;
    const docType = body.docType || body.documentType || 'other';
    if (!docName) return NextResponse.json({ error: 'Document name required' }, { status: 400 });

    const existing = await db`
      SELECT id FROM documents WHERE business_id = ${biz[0].id} AND name = ${docName} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Document already recorded', alreadyExists: true });
    }

    const doc = await db`
      INSERT INTO documents (business_id, name, doc_type)
      VALUES (${biz[0].id}, ${docName}, ${docType})
      RETURNING *
    `;
    return NextResponse.json({ document: doc[0] }, { status: 201 });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}

// Serve file by doc id
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('id');
  if (!docId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const rows = await db`
    SELECT d.file_data, d.name, b.user_id
    FROM documents d
    JOIN businesses b ON b.id = d.business_id
    WHERE d.id = ${docId}
    LIMIT 1
  `;

  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only allow the document owner or staff to download
  const doc = rows[0];
  const isOwner = doc.user_id === session.id;
  const isStaff = ['admin', 'banker', 'lawyer'].includes(session.role);
  if (!isOwner && !isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!doc.file_data) return NextResponse.json({ error: 'No file stored' }, { status: 404 });

  // Strip data-URL prefix to get raw base64
  const [header, base64] = doc.file_data.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] ?? 'application/octet-stream';
  const buffer = Buffer.from(base64, 'base64');

  return new Response(buffer, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${doc.name}"`,
      'Content-Length': String(buffer.length),
    },
  });
}

