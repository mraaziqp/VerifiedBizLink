import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    // Accept both old param names and new ones
    const docName = body.docName || body.documentName;
    const docType = body.docType || body.documentType || 'other';
    if (!docName) return NextResponse.json({ error: 'Document name required' }, { status: 400 });

    const biz = await db`SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1`;
    if (biz.length === 0) return NextResponse.json({ error: 'No business found' }, { status: 404 });

    const existing = await db`
      SELECT id FROM documents WHERE business_id = ${biz[0].id} AND name = ${docName} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Document already uploaded', alreadyExists: true });
    }

    const doc = await db`
      INSERT INTO documents (business_id, name, doc_type)
      VALUES (${biz[0].id}, ${docName}, ${docType || 'other'})
      RETURNING *
    `;

    return NextResponse.json({ document: doc[0] }, { status: 201 });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
