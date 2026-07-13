import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const business = await db`
      SELECT b.*, u.full_name AS owner_name, u.email AS owner_email
      FROM businesses b
      JOIN users u ON b.user_id = u.id
      WHERE b.user_id = ${session.id}
      LIMIT 1
    `;

    if (business.length === 0) {
      return NextResponse.json({ business: null });
    }

    const docs = await db`
      SELECT * FROM documents WHERE business_id = ${business[0].id}
      ORDER BY uploaded_at DESC
    `;

    let queue: { ticketNumber: string; position: number; total: number } | null = null;
    const biz = business[0];
    if (['pending', 'reviewing'].includes(biz.status) && biz.submitted_at) {
      const [queueRow] = await db`
        SELECT
          (SELECT COUNT(*) FROM businesses WHERE status IN ('pending', 'reviewing') AND submitted_at <= ${biz.submitted_at}) AS position,
          (SELECT COUNT(*) FROM businesses WHERE status IN ('pending', 'reviewing')) AS total
      `;
      queue = {
        ticketNumber: `VBL-${biz.id.slice(0, 8).toUpperCase()}`,
        position: parseInt(queueRow.position),
        total: parseInt(queueRow.total),
      };
    }

    return NextResponse.json({ business: { ...biz, documents: docs, queue } });
  } catch (error) {
    console.error('Business GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { companyName, industry, regNumber, vatNumber, description, website, phone, address } = data;

    const existing = await db`SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1`;

    if (existing.length > 0) {
      const updated = await db`
        UPDATE businesses SET
          name = ${companyName || ''},
          company_name = ${companyName || ''},
          industry = ${industry || ''},
          reg_number = ${regNumber || ''},
          vat_number = ${vatNumber || ''},
          description = ${description || ''},
          website = ${website || ''},
          phone = ${phone || ''},
          address = ${address || ''},
          updated_at = NOW()
        WHERE user_id = ${session.id}
        RETURNING *
      `;
      return NextResponse.json({ business: updated[0] });
    }

    const newBiz = await db`
      INSERT INTO businesses (user_id, name, company_name, industry, reg_number, vat_number, description, website, phone, address)
      VALUES (${session.id}, ${companyName || ''}, ${companyName || ''}, ${industry || ''}, ${regNumber || ''}, ${vatNumber || ''}, ${description || ''}, ${website || ''}, ${phone || ''}, ${address || ''})
      RETURNING *
    `;
    return NextResponse.json({ business: newBiz[0] }, { status: 201 });
  } catch (error) {
    console.error('Business POST error:', error);
    return NextResponse.json({ error: 'Failed to save business' }, { status: 500 });
  }
}
