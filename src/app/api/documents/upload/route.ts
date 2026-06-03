import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const docType = formData.get('docType') as string || 'other';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get user's business
    const business = await db`
      SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1
    `;

    if (!business || business.length === 0) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const businessId = business[0].id;
    const fileName = `${Date.now()}-${file.name}`;
    const fileUrl = `/uploads/${businessId}/${fileName}`;

    // Save document to database
    const doc = await db`
      INSERT INTO documents (business_id, user_id, name, doc_type, file_url, status, approval_status)
      VALUES (${businessId}, ${session.id}, ${file.name}, ${docType}, ${fileUrl}, 'uploaded', 'pending')
      RETURNING id, name, doc_type, status, uploaded_at
    `;

    return NextResponse.json({ document: doc[0], url: fileUrl }, { status: 201 });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
